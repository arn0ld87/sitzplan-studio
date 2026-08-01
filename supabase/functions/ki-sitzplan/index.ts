// Edge Function: KI-Sitzplanvorschlag.
//
// Warum diese Funktion überhaupt existiert: In einem Vite-Bundle gibt es kein
// Geheimnis. `VITE_*`-Variablen werden beim Bauen in das ausgelieferte
// JavaScript hineingeschrieben — ein Schlüssel, der „fest hinterlegt" und
// zugleich „nicht auslesbar" sein soll, kann nur außerhalb des Frontends
// liegen. Siehe ADR-0007.
//
// Das Frontend schickt **nur** `{ planId, modus }`. Diese Funktion liest Klasse,
// Schüler, Merkmale, Notizen, Regeln und Raumgeometrie selbst — mit dem JWT des
// Aufrufers, sodass die bestehende RLS unverändert greift. Der Prompt entsteht
// vollständig hier. Damit ist die Funktion ein Werkzeug und kein
// authentifiziertes Weiterreichen beliebiger Prompts auf fremde Rechnung.
//
// Was hier **nicht** passiert: die Antwort des Modells prüfen. Das erledigt
// `src/data/ki-vorschlag.ts` im Browser, weil es dort im Gate mit `vitest`
// mitläuft. Die Prüfung ist Qualitätssicherung, keine Vertrauensgrenze.

import { createClient } from "jsr:@supabase/supabase-js@2";

// Deckel. Bewusst Konstanten und keine Konfiguration: Wer sie ändert, soll das
// im Diff sehen. Ein Aufruf kostet rund 1,9 Cent — der globale Deckel greift
// bei etwa sechs US-Dollar am Tag.
const DECKEL = {
  tagJeKonto: 100,
  minuteJeKonto: 10,
  tagGlobal: 300,
} as const;

const MODELL = "gemini-3.6-flash";
const ENDPUNKT = "https://generativelanguage.googleapis.com/v1beta/interactions";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Spiegel von `MERKMALE` in `src/data/types.ts`.
 *
 * Bewusste Doppelung: Diese Datei läuft in Deno, `src/data/types.ts` im
 * Browser-Bundle; ein gemeinsamer Import scheitert an Modulauflösung und
 * Dateiendungen. Der Ausfallmodus ist mild — ein hier fehlender Schlüssel geht
 * unübersetzt an das Modell, statt etwas kaputtzumachen. Wer den Katalog dort
 * erweitert, ergänzt ihn hier mit.
 */
const MERKMAL_LABEL: Record<string, string> = {
  adhs: "ADHS",
  autismus_spektrum: "Autismus-Spektrum",
  schwerhoerig: "Schwerhörigkeit",
  sehschwaeche: "Sehschwäche",
  legasthenie: "Legasthenie",
  dyskalkulie: "Dyskalkulie",
  daz: "Deutsch als Zweitsprache",
  nachteilsausgleich: "Nachteilsausgleich",
  motorisch: "motorische Einschränkung",
  chronisch_krank: "chronische Erkrankung",
};

const ANTWORT_SCHEMA = {
  type: "object",
  properties: {
    zuordnungen: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sitzId: { type: "string" },
          schuelerId: { type: "string" },
          begruendung: { type: "string" },
        },
        required: ["sitzId", "schuelerId", "begruendung"],
      },
    },
  },
  required: ["zuordnungen"],
};

type CanvasObjekt = {
  id: string;
  typ: string;
  x_cm: number;
  y_cm: number;
  breite_cm: number;
  tiefe_cm: number;
  rotation_deg: number;
};

type CanvasSitzplatz = { id: string; objektId: string; lokalX_cm: number; lokalY_cm: number };

function json(daten: unknown, status = 200) {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

function fehler(code: string, nachricht: string, status: number) {
  return json({ fehler: code, nachricht }, status);
}

/**
 * Absolute Lage eines Sitzplatzes in Zentimetern.
 *
 * Die lokalen Koordinaten gelten vor der Drehung und beziehen sich auf die
 * linke obere Ecke des Möbels. Gedreht wird um dessen Mittelpunkt — dieselbe
 * Konvention wie in der SVG-Zeichnung. Ohne diese Rechnung säßen alle Plätze
 * eines gedrehten Tisches an der falschen Stelle, und „vorn" wäre wertlos.
 */
function sitzPosition(o: CanvasObjekt, p: CanvasSitzplatz) {
  const mx = o.x_cm + o.breite_cm / 2;
  const my = o.y_cm + o.tiefe_cm / 2;
  const dx = p.lokalX_cm - o.breite_cm / 2;
  const dy = p.lokalY_cm - o.tiefe_cm / 2;
  const rad = ((o.rotation_deg || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: Math.round(mx + dx * cos - dy * sin),
    y: Math.round(my + dx * sin + dy * cos),
  };
}

const OBJEKT_LABEL: Record<string, string> = {
  board: "Tafel",
  window: "Fenster",
  door: "Tür",
  teacher_desk: "Lehrerpult",
};

type SchuelerZeile = {
  id: string;
  vorname: string;
  nachname: string;
  merkmale: string[] | null;
  notiz: string | null;
};

type RegelZeile = { schueler_a: string; schueler_b: string; art: string };

function bauePrompt(
  raum: { breiteCm: number; laengeCm: number },
  objekte: CanvasObjekt[],
  plaetze: CanvasSitzplatz[],
  schueler: SchuelerZeile[],
  regeln: RegelZeile[],
) {
  const objektVonId = new Map(objekte.map((o) => [o.id, o]));

  const orientierung = objekte
    .filter((o) => OBJEKT_LABEL[o.typ])
    .map(
      (o) =>
        `- ${OBJEKT_LABEL[o.typ]} bei x=${Math.round(o.x_cm + o.breite_cm / 2)}, y=${Math.round(
          o.y_cm + o.tiefe_cm / 2,
        )}`,
    );

  const sitzZeilen = plaetze.flatMap((p) => {
    const o = objektVonId.get(p.objektId);
    if (!o) return [];
    const { x, y } = sitzPosition(o, p);
    const nachbarn = plaetze
      .filter((q) => q.objektId === p.objektId && q.id !== p.id)
      .map((q) => q.id);
    const nachbarText = nachbarn.length
      ? `, Nachbarplatz: ${nachbarn.join(", ")}`
      : ", kein Nachbar";
    return [`- ${p.id} (x=${x}, y=${y}${nachbarText})`];
  });

  const schuelerZeilen = schueler.map((s) => {
    const name = `${s.vorname} ${s.nachname}`.trim();
    const merkmale = (s.merkmale ?? [])
      .filter(Boolean)
      .map((m) => MERKMAL_LABEL[m] ?? m)
      .join(", ");
    const teile = [`- ${s.id}: ${name}`];
    if (merkmale) teile.push(`Besonderheiten: ${merkmale}`);
    const notiz = (s.notiz ?? "").trim();
    if (notiz) teile.push(`Notiz: ${notiz}`);
    return teile.join(" | ");
  });

  const regelZeilen = regeln.map((r) =>
    r.art === "muss_neben"
      ? `- ${r.schueler_a} MUSS neben ${r.schueler_b} sitzen (gleicher Tisch).`
      : `- ${r.schueler_a} darf NICHT neben ${r.schueler_b} sitzen (nicht am gleichen Tisch).`,
  );

  return [
    "Du hilfst einer Lehrkraft, einen Sitzplan für eine Schulklasse zu stellen.",
    "",
    `Der Raum ist ${raum.breiteCm} cm breit und ${raum.laengeCm} cm tief. Koordinaten sind Zentimeter;`,
    "x wächst nach rechts, y wächst nach hinten. Kleine y-Werte sind vorn.",
    "",
    orientierung.length ? "Orientierungspunkte:" : "Keine Orientierungspunkte im Raum.",
    ...orientierung,
    "",
    `Sitzplätze (${sitzZeilen.length}):`,
    ...sitzZeilen,
    "",
    `Schüler (${schuelerZeilen.length}):`,
    ...schuelerZeilen,
    "",
    regelZeilen.length ? "Verbindliche Sitzregeln:" : "Es gibt keine Sitzregeln.",
    ...regelZeilen,
    "",
    "Aufgabe:",
    "1. Weise jedem Schüler genau einen Sitzplatz zu. Jeder Platz höchstens einmal.",
    "2. Halte alle Sitzregeln ein. Sie haben Vorrang vor allem anderen.",
    "3. Berücksichtige Besonderheiten und Notizen: Schwerhörigkeit und Sehschwäche sprechen",
    "   für Plätze nahe an Tafel und Lehrerpult, ADHS für reizarme Plätze abseits von Tür",
    "   und Fenster, motorische Einschränkungen für gut erreichbare Plätze nahe der Tür.",
    "   Eine Freitext-Notiz schlägt diese Faustregeln.",
    "4. Verwende ausschließlich die oben genannten Kennungen, wörtlich und unverändert.",
    "5. Begründe jede Zuweisung in einem kurzen deutschen Satz (höchstens 90 Zeichen).",
    "   Nenne dabei den Grund, nicht die Handlung.",
  ].join("\n");
}

/** Text der Modellantwort — er liegt in `steps[].content[].text`, nicht in `output_text`. */
function textAusAntwort(antwort: { steps?: { content?: { text?: string }[] }[] }): string {
  const teile: string[] = [];
  for (const step of antwort.steps ?? []) {
    for (const c of step.content ?? []) {
      if (typeof c.text === "string") teile.push(c.text);
    }
  }
  return teile.join("").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fehler("methode", "Nur POST.", 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return fehler("kein_schluessel", "GEMINI_API_KEY ist in dieser Funktion nicht gesetzt.", 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return fehler("nicht_angemeldet", "Kein Zugangstoken.", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Zwei Clients mit klar getrennten Aufgaben: Der Nutzer-Client sieht dank RLS
  // ausschließlich eigene Zeilen — dass der Plan dem Aufrufer gehört, muss
  // deshalb nirgends von Hand geprüft werden. Der Dienst-Client darf genau
  // eines: die Gesamtzahl der Aufrufe erfragen. Sie ist unter RLS nicht zählbar.
  const alsNutzer = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const alsDienst = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: nutzer, error: nutzerFehler } = await alsNutzer.auth.getUser();
  if (nutzerFehler || !nutzer?.user) return fehler("nicht_angemeldet", "Token ungültig.", 401);
  const userId = nutzer.user.id;

  let rumpf: { planId?: string; modus?: string };
  try {
    rumpf = await req.json();
  } catch {
    return fehler("rumpf", "Rumpf ist kein JSON.", 400);
  }
  const planId = rumpf.planId;
  const modus = rumpf.modus ?? "erzeugen";
  if (!planId) return fehler("rumpf", "planId fehlt.", 400);
  if (modus !== "erzeugen") return fehler("modus", `Modus "${modus}" gibt es hier nicht.`, 400);

  // ---- Deckel. Vor dem Aufruf, denn nach dem Aufruf ist das Geld weg. ----
  const jetzt = Date.now();
  const vorEinemTag = new Date(jetzt - 24 * 60 * 60 * 1000).toISOString();
  const vorEinerMinute = new Date(jetzt - 60 * 1000).toISOString();

  // Schlägt eine Zählabfrage fehl, wird **abgebrochen** statt durchgelassen.
  // `count` wäre dann `null`, `?? 0` machte daraus „noch nichts verbraucht" —
  // ausgerechnet bei einer gestörten Datenbank fiele damit jeder Deckel weg.
  const { count: tagKonto, error: tagFehler } = await alsNutzer
    .from("ki_aufrufe")
    .select("id", { count: "exact", head: true })
    .gte("created_at", vorEinemTag);
  if (tagFehler || tagKonto === null) {
    return fehler("deckel_unpruefbar", "Das Tageslimit ist gerade nicht prüfbar.", 503);
  }
  if (tagKonto >= DECKEL.tagJeKonto) {
    return fehler(
      "deckel_konto_tag",
      `Erreicht: ${DECKEL.tagJeKonto} Vorschläge in 24 Stunden. Morgen wieder.`,
      429,
    );
  }

  const { count: minuteKonto, error: minuteFehler } = await alsNutzer
    .from("ki_aufrufe")
    .select("id", { count: "exact", head: true })
    .gte("created_at", vorEinerMinute);
  if (minuteFehler || minuteKonto === null) {
    return fehler("deckel_unpruefbar", "Das Minutenlimit ist gerade nicht prüfbar.", 503);
  }
  if (minuteKonto >= DECKEL.minuteJeKonto) {
    return fehler("deckel_konto_minute", "Zu viele Vorschläge in kurzer Zeit. Kurz warten.", 429);
  }

  const { data: global, error: globalFehler } = await alsDienst.rpc("ki_aufrufe_heute_global");
  if (globalFehler || global === null) {
    return fehler("deckel_unpruefbar", "Die Gesamtgrenze ist gerade nicht prüfbar.", 503);
  }
  if (Number(global) >= DECKEL.tagGlobal) {
    return fehler(
      "deckel_global",
      "Die Tagesgrenze aller Konten ist erreicht. Später erneut versuchen.",
      429,
    );
  }

  // ---- Daten lesen. Alles unter RLS, alles ohne deleted_at. ----
  const { data: plan, error: planFehler } = await alsNutzer
    .from("sitzplaene")
    .select("id, klasse_id, canvas_document")
    .eq("id", planId)
    .is("deleted_at", null)
    .maybeSingle();
  if (planFehler) return fehler("datenbank", planFehler.message, 500);
  if (!plan) return fehler("kein_plan", "Sitzplan nicht gefunden.", 404);

  const { data: schueler, error: schuelerFehler } = await alsNutzer
    .from("schueler")
    .select("id, vorname, nachname, merkmale, notiz")
    .eq("klasse_id", plan.klasse_id)
    .is("deleted_at", null)
    .order("nachname", { ascending: true });
  if (schuelerFehler) return fehler("datenbank", schuelerFehler.message, 500);
  if (!schueler?.length) return fehler("keine_schueler", "Die Klasse hat keine Schüler.", 400);

  // Der Fehler darf hier nicht verschluckt werden: Ohne Regeln plante das
  // Modell fröhlich weiter und lieferte einen Vorschlag, der genau die Regeln
  // verletzt, wegen derer die Lehrkraft ihn geholt hat — ohne Hinweis darauf,
  // dass sie nie ankamen.
  const { data: regeln, error: regelFehler } = await alsNutzer
    .from("sitzregeln")
    .select("schueler_a, schueler_b, art")
    .eq("klasse_id", plan.klasse_id)
    .is("deleted_at", null);
  if (regelFehler)
    return fehler("datenbank", `Sitzregeln nicht lesbar: ${regelFehler.message}`, 500);

  const doc = (plan.canvas_document ?? {}) as {
    raumGeometrie?: {
      breiteCm?: number;
      laengeCm?: number;
      objekte?: CanvasObjekt[];
      sitzplaetze?: CanvasSitzplatz[];
    };
  };
  const geo = doc.raumGeometrie ?? {};
  const objekte = geo.objekte ?? [];
  const plaetze = geo.sitzplaetze ?? [];
  if (!plaetze.length)
    return fehler("keine_plaetze", "Der Raum des Plans hat keine Sitzplätze.", 400);
  if (plaetze.length < schueler.length) {
    return fehler(
      "zu_wenig_plaetze",
      `${schueler.length} Schüler, aber nur ${plaetze.length} Sitzplätze.`,
      400,
    );
  }

  const prompt = bauePrompt(
    { breiteCm: Number(geo.breiteCm) || 0, laengeCm: Number(geo.laengeCm) || 0 },
    objekte,
    plaetze,
    schueler as SchuelerZeile[],
    (regeln ?? []) as RegelZeile[],
  );

  // ---- Platz im Deckel belegen, bevor Geld fließt ----
  //
  // Die Prüfung oben ist ein Blick in die Vergangenheit: Zwei gleichzeitige
  // Aufrufe sehen denselben Stand und kämen beide durch. Deshalb wird die
  // Protokollzeile **vor** dem Aufruf geschrieben statt danach. Sie zählt ab
  // sofort mit, und ein Aufruf, der zwar Geld kostet, dessen Antwort aber
  // unbrauchbar ist, fällt nicht aus der Zählung heraus. Die Token werden
  // hinterher nachgetragen.
  //
  // Der Preis: Ein Aufruf, der schon am Netz scheitert, ist mitgezählt, obwohl
  // er nichts gekostet hat. Das ist die richtige Richtung zum Irren.
  const { data: reservierung, error: reservierungFehler } = await alsNutzer
    .from("ki_aufrufe")
    .insert({ user_id: userId, sitzplan_id: planId, modus })
    .select("id")
    .single();
  if (reservierungFehler || !reservierung) {
    return fehler("protokoll", "Der Aufruf ließ sich nicht protokollieren.", 500);
  }

  // ---- Gemini ----
  let antwort: Response;
  try {
    antwort = await fetch(ENDPUNKT, {
      method: "POST",
      // Ohne Zeitgrenze hinge die Funktion bis zum Plattform-Limit und
      // verbrauchte die ganze Zeit Laufzeit. 45 s sind das Dreifache der
      // gemessenen Dauer; der Client wartet mit 60 s etwas länger.
      signal: AbortSignal.timeout(45_000),
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: MODELL,
        // `step_list`-Form: eine flache Liste von Schritten, **nicht**
        // `[{ role, content }]`. Die turn_list-Form quittiert die API mit 400.
        input: [{ type: "text", text: prompt }],
        // Der Vorgabewert ist `medium` und kostet gemessen 22–26 s statt 7 s.
        generation_config: { thinking_level: "low" },
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: ANTWORT_SCHEMA,
        },
        // Sonst hält Google die Anfrage im Paid Tier 55 Tage vor.
        store: false,
      }),
    });
  } catch (e) {
    return fehler("gemini_netz", `Gemini nicht erreichbar: ${String(e)}`, 502);
  }

  if (!antwort.ok) {
    const text = await antwort.text();
    return fehler("gemini", `Gemini antwortete mit ${antwort.status}: ${text.slice(0, 300)}`, 502);
  }

  const roh = await antwort.json();
  const text = textAusAntwort(roh);
  let vorschlag: unknown;
  try {
    vorschlag = JSON.parse(text);
  } catch {
    return fehler("gemini_format", "Die Antwort des Modells war kein JSON.", 502);
  }

  const tokenEin = Number(roh?.usage?.total_input_tokens ?? 0);
  const tokenAus = Number(roh?.usage?.total_output_tokens ?? 0);

  // Token nachtragen. Das darf nur der Dienstschlüssel: `ki_aufrufe` hat
  // bewusst keine UPDATE-Policy für Nutzer, damit niemand seine eigenen
  // Protokollzeilen und damit sein Limit verändern kann. Schlägt es fehl,
  // bleibt die Zeile mit 0 Token stehen — der Deckel stimmt weiterhin, nur die
  // Kostenschätzung wird ungenau. Das ist kein Grund, den Vorschlag zu
  // verschlucken.
  const { error: nachtragFehler } = await alsDienst
    .from("ki_aufrufe")
    .update({ token_ein: tokenEin, token_aus: tokenAus })
    .eq("id", reservierung.id);
  if (nachtragFehler) console.error("[ki-sitzplan] Token nicht nachgetragen:", nachtragFehler);

  return json({
    vorschlag,
    verbrauch: { tokenEin, tokenAus },
    deckel: {
      tagJeKonto: DECKEL.tagJeKonto,
      verbrauchtHeute: (tagKonto ?? 0) + 1,
    },
  });
});
