/**
 * Füllt ein Konto mit vorzeigbaren Beispieldaten — für Screenshots, Aufnahmen
 * und zum Durchklicken neuer Funktionen, ohne zwei Stunden Klassen zu tippen.
 *
 *   bun run scripts/demo-daten.ts demo@example.org
 *   bun run scripts/demo-daten.ts demo@example.org --ersetzen
 *
 * `AGENTS.md` verbietet Platzhalterdaten in der Datenbank. Diese Ausnahme ist
 * bewusst und eng gefasst: Das Skript schreibt ausschließlich in das eine Konto,
 * dessen Adresse als Argument steht, und weigert sich, vorhandene Daten
 * anzutasten, solange nicht `--ersetzen` danebensteht. Es gehört nie in einen
 * automatischen Ablauf und nie an ein Konto mit echten Klassen.
 *
 * Alle Namen sind erfunden. Das ist keine Kosmetik, sondern der Punkt: Für
 * Bilder, die später in README und Marketing landen, dürfen keine echten
 * Schülerdaten den Bildschirm sehen.
 *
 * Das Skript ruft `zuRaumDokument` und `zuPlanDokument` aus `src/data/mapping.ts`
 * auf, statt das JSONB selbst zusammenzusetzen. Sonst entstünde eine zweite
 * Stelle, an der das Dokumentformat gepflegt werden müsste, und sie liefe
 * auseinander, sobald jemand die erste ändert.
 */

import { createClient } from "@supabase/supabase-js";
import { zuPlanDokument, zuRaumDokument } from "../src/data/mapping";
import {
  FURNITURE_SPECS,
  initials,
  makeFurniture,
  newId,
  type Furniture,
  type FurnitureKind,
} from "../src/data/types";

// ── Umgebung ────────────────────────────────────────────────────────────────

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.\n" +
      "Beide stehen in der .env; bun lädt sie beim Start selbst.",
  );
  process.exit(1);
}

const email = process.argv[2];
const ersetzen = process.argv.includes("--ersetzen");

if (!email || email.startsWith("--")) {
  console.error("Aufruf: bun run scripts/demo-daten.ts <e-mail> [--ersetzen]");
  process.exit(1);
}

// Der Service-Role-Schlüssel hebelt jede RLS-Policy aus. Deshalb setzt jede
// Einfügung unten `user_id` von Hand — es gibt hier keine Policy, die das
// nachholt, und eine Zeile ohne `user_id` wäre für niemanden sichtbar.
const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Beispielinhalte ─────────────────────────────────────────────────────────

type DemoSchueler = { vorname: string; nachname: string; merkmale?: string[]; notiz?: string };

const KLASSE_7A: DemoSchueler[] = [
  { vorname: "Mila", nachname: "Achterberg" },
  { vorname: "Jonas", nachname: "Brandt", merkmale: ["adhs"], notiz: "Vorne setzen, kurze Wege." },
  { vorname: "Lea", nachname: "Cordes" },
  { vorname: "Emil", nachname: "Dahlmann", merkmale: ["sehschwaeche"], notiz: "Tafelnähe nötig." },
  { vorname: "Ida", nachname: "Ebeling" },
  { vorname: "Noah", nachname: "Frenzel" },
  { vorname: "Yasemin", nachname: "Gündüz", merkmale: ["daz"] },
  { vorname: "Ben", nachname: "Hillmann" },
  { vorname: "Clara", nachname: "Irmscher", merkmale: ["legasthenie", "nachteilsausgleich"] },
  { vorname: "Tim", nachname: "Jankowski" },
  { vorname: "Mia", nachname: "Kettler" },
  { vorname: "Luis", nachname: "Lembke", merkmale: ["schwerhoerig"], notiz: "Rechtes Ohr besser." },
  { vorname: "Frieda", nachname: "Mahlow" },
  { vorname: "Anton", nachname: "Niebuhr" },
  { vorname: "Zoe", nachname: "Oswald" },
  {
    vorname: "Paul",
    nachname: "Petzold",
    merkmale: ["autismus_spektrum"],
    notiz: "Reizarm, Randplatz.",
  },
  { vorname: "Hanna", nachname: "Quandt" },
  { vorname: "Milan", nachname: "Reinhold" },
  { vorname: "Nele", nachname: "Sattler", merkmale: ["dyskalkulie"] },
  { vorname: "Erik", nachname: "Trautmann" },
  { vorname: "Lina", nachname: "Uhlig" },
  { vorname: "Kaan", nachname: "Volkan" },
  { vorname: "Marie", nachname: "Wendisch" },
  {
    vorname: "Theo",
    nachname: "Zabel",
    merkmale: ["motorisch"],
    notiz: "Breiter Zugang zum Platz.",
  },
];

const KLASSE_9B: DemoSchueler[] = [
  { vorname: "Alina", nachname: "Bergmann" },
  { vorname: "Fabian", nachname: "Dietz" },
  { vorname: "Greta", nachname: "Eichhorn", merkmale: ["nachteilsausgleich"] },
  { vorname: "Henri", nachname: "Fischbach" },
  { vorname: "Josefine", nachname: "Grimm" },
  { vorname: "Karl", nachname: "Hufnagel" },
  { vorname: "Leonie", nachname: "Jaschke" },
  { vorname: "Mats", nachname: "Kleinschmidt", merkmale: ["adhs"] },
  { vorname: "Nora", nachname: "Lindqvist" },
  { vorname: "Oskar", nachname: "Mengel" },
  { vorname: "Pia", nachname: "Nowak" },
  { vorname: "Quentin", nachname: "Ortlieb" },
  { vorname: "Rosa", nachname: "Pichler" },
  { vorname: "Samuel", nachname: "Rauscher" },
  { vorname: "Tilda", nachname: "Steinbach" },
  { vorname: "Vincent", nachname: "Wachtel" },
];

const KLASSE_5C: DemoSchueler[] = [
  { vorname: "Amelie", nachname: "Bohnert" },
  { vorname: "Bruno", nachname: "Claassen" },
  { vorname: "Charlotte", nachname: "Deppe" },
  { vorname: "David", nachname: "Ellinger", merkmale: ["daz"] },
  { vorname: "Elif", nachname: "Fidan" },
  { vorname: "Felix", nachname: "Gerlach" },
  { vorname: "Greta", nachname: "Hoffmeister" },
  { vorname: "Ilja", nachname: "Iwanow", merkmale: ["daz"], notiz: "Seit Februar hier." },
  { vorname: "Jette", nachname: "Kamphues" },
  { vorname: "Konrad", nachname: "Ludwig" },
  { vorname: "Livia", nachname: "Meinhardt" },
  { vorname: "Moritz", nachname: "Neuhaus" },
  { vorname: "Olivia", nachname: "Pretzel" },
  { vorname: "Rafael", nachname: "Sanchez" },
  { vorname: "Selma", nachname: "Thiele" },
  { vorname: "Valentin", nachname: "Werner" },
  { vorname: "Wanda", nachname: "Ziegler" },
  { vorname: "Yannik", nachname: "Zorn" },
];

// ── Räume ───────────────────────────────────────────────────────────────────

/**
 * Setzt Tischreihen und stellt Tafel, Pult, Tür und Fenster dazu.
 *
 * Die Maße stammen aus {@link FURNITURE_SPECS}; berechnet wird nur, wo etwas
 * steht. Alles rastet auf `raster` ein, damit die Zeichnung so aussieht, wie
 * sie nach dem Ziehen im Editor aussähe — schiefe Werte fielen auf jedem
 * Bildschirmfoto sofort auf.
 */
function moebliere(opts: {
  reihen: number;
  proReihe: number;
  tischart: Extract<FurnitureKind, "einzeltisch" | "doppeltisch">;
  breite: number;
  raster: number;
  /** Abstand von der oberen Wand bis zur ersten Tischreihe. */
  obenFrei: number;
  gangX: number;
  gangY: number;
}): Furniture[] {
  const spec = FURNITURE_SPECS[opts.tischart];
  const auf = (n: number) => Math.round(n / opts.raster) * opts.raster;

  const blockBreite = opts.proReihe * spec.w + (opts.proReihe - 1) * opts.gangX;
  const startX = auf((opts.breite - blockBreite) / 2);

  const tische: Furniture[] = [];
  for (let r = 0; r < opts.reihen; r++) {
    for (let s = 0; s < opts.proReihe; s++) {
      tische.push(
        makeFurniture(
          opts.tischart,
          auf(startX + s * (spec.w + opts.gangX)),
          auf(opts.obenFrei + r * (spec.h + opts.gangY)),
        ),
      );
    }
  }

  const tafel = makeFurniture("tafel", auf((opts.breite - FURNITURE_SPECS.tafel.w) / 2), auf(20));
  const pult = makeFurniture("pult", auf((opts.breite - FURNITURE_SPECS.pult.w) / 2), auf(80));
  const tuer = makeFurniture("tuer", auf(opts.breite - FURNITURE_SPECS.tuer.w - 40), auf(5));
  const fenster1 = makeFurniture("fenster", auf(5), auf(opts.obenFrei + 20));
  const fenster2 = makeFurniture("fenster", auf(5), auf(opts.obenFrei + 240));

  return [tafel, pult, tuer, fenster1, fenster2, ...tische];
}

const RAUM_204 = {
  name: "Raum 204 — Klassenraum",
  width: 900,
  height: 740,
  grid: 5,
  furniture: moebliere({
    reihen: 4,
    proReihe: 3,
    tischart: "doppeltisch",
    breite: 900,
    raster: 5,
    obenFrei: 220,
    gangX: 70,
    gangY: 65,
  }),
};

const RAUM_FACH = {
  name: "Fachraum Naturwissenschaften",
  width: 1000,
  height: 700,
  grid: 5,
  furniture: moebliere({
    reihen: 3,
    proReihe: 4,
    tischart: "doppeltisch",
    breite: 1000,
    raster: 5,
    obenFrei: 210,
    gangX: 55,
    gangY: 80,
  }),
};

// Fünf mal fünf Einzeltische: 25 Plätze, damit auch die größte Klasse
// vollständig hineinpasst. Ein Prüfungsraum, in dem acht Leute stehen bleiben,
// sähe auf einem Bildschirmfoto nach einem Fehler der Anwendung aus.
const RAUM_KLEIN = {
  name: "Kursraum 108 — Einzelplätze",
  width: 780,
  height: 820,
  grid: 5,
  furniture: moebliere({
    reihen: 5,
    proReihe: 5,
    tischart: "einzeltisch",
    breite: 780,
    raster: 5,
    obenFrei: 200,
    gangX: 45,
    gangY: 60,
  }),
};

// ── Hilfsmittel ─────────────────────────────────────────────────────────────

/** Sitzplätze in Lesereihenfolge: erst von oben nach unten, dann von links nach rechts. */
function sitzplaetzeInLesereihenfolge(furniture: Furniture[]): string[] {
  return furniture
    .filter((f) => f.seats.length > 0)
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .flatMap((f) => f.seats);
}

async function pruefeLeer(userId: string) {
  const tabellen = ["klassen", "raeume", "sitzplaene"] as const;
  for (const t of tabellen) {
    const { count, error } = await db
      .from(t)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) throw new Error(`${t}: ${error.message}`);
    if ((count ?? 0) > 0) return false;
  }
  return true;
}

/**
 * Räumt das Konto ab. Hart, nicht über `deleted_at`: Ein Papierkorb voller
 * Beispieldaten wäre auf jedem Bildschirmfoto zu sehen.
 *
 * `schueler` und `sitzregeln` hängen per `ON DELETE CASCADE` an `klassen` und
 * verschwinden mit.
 */
async function raeumeAb(userId: string) {
  for (const t of ["sitzplaene", "raeume", "klassen"] as const) {
    const { error } = await db.from(t).delete().eq("user_id", userId);
    if (error) throw new Error(`Löschen in ${t}: ${error.message}`);
  }
}

// ── Anlegen ─────────────────────────────────────────────────────────────────

async function legeKlasseAn(
  userId: string,
  name: string,
  notiz: string,
  liste: DemoSchueler[],
): Promise<{ id: string; schuelerIds: string[] }> {
  const klasseId = newId();
  const { error: kFehler } = await db
    .from("klassen")
    .insert({ id: klasseId, user_id: userId, name, notizen: notiz });
  if (kFehler) throw new Error(`Klasse ${name}: ${kFehler.message}`);

  const zeilen = liste.map((s, i) => ({
    id: newId(),
    user_id: userId,
    klasse_id: klasseId,
    vorname: s.vorname,
    nachname: s.nachname,
    initialen: initials(`${s.vorname} ${s.nachname}`),
    farb_index: i % 8,
    merkmale: s.merkmale ?? [],
    notiz: s.notiz ?? "",
  }));

  const { error: sFehler } = await db.from("schueler").insert(zeilen);
  if (sFehler) throw new Error(`Schüler in ${name}: ${sFehler.message}`);

  return { id: klasseId, schuelerIds: zeilen.map((z) => z.id) };
}

async function legeRegelnAn(
  userId: string,
  klasseId: string,
  schuelerIds: string[],
  paare: { a: number; b: number; art: "nicht_neben" | "muss_neben" }[],
) {
  const zeilen = paare
    .filter((p) => schuelerIds[p.a] && schuelerIds[p.b])
    .map((p) => ({
      id: newId(),
      user_id: userId,
      klasse_id: klasseId,
      schueler_a: schuelerIds[p.a],
      schueler_b: schuelerIds[p.b],
      art: p.art,
    }));
  if (zeilen.length === 0) return;
  const { error } = await db.from("sitzregeln").insert(zeilen);
  if (error) throw new Error(`Sitzregeln: ${error.message}`);
}

async function legeRaumAn(userId: string, raum: typeof RAUM_204): Promise<string> {
  const raumId = newId();
  const { error } = await db.from("raeume").insert({
    id: raumId,
    user_id: userId,
    name: raum.name,
    breite_cm: raum.width,
    laenge_cm: raum.height,
    raster_cm: raum.grid,
    canvas_document: zuRaumDokument(raum.furniture),
    dokument_version: 3,
  });
  if (error) throw new Error(`Raum ${raum.name}: ${error.message}`);
  return raumId;
}

async function legePlanAn(opts: {
  userId: string;
  titel: string;
  klasseId: string;
  raumId: string;
  raum: typeof RAUM_204;
  schuelerIds: string[];
  status: "entwurf" | "aktiv" | "archiv";
  /** Anteil der Plätze, die belegt werden — ein halb gefüllter Plan wirkt echter. */
  anteil?: number;
}) {
  const plaetze = sitzplaetzeInLesereihenfolge(opts.raum.furniture);
  const wieviele = Math.min(
    opts.schuelerIds.length,
    plaetze.length,
    Math.round(plaetze.length * (opts.anteil ?? 1)),
  );

  const assignments: Record<string, string> = {};
  for (let i = 0; i < wieviele; i++) {
    const platz = plaetze[i];
    const schueler = opts.schuelerIds[i];
    if (platz && schueler) assignments[platz] = schueler;
  }

  const planId = newId();
  const dokument = zuPlanDokument({
    id: planId,
    title: opts.titel,
    classId: opts.klasseId,
    roomId: opts.raumId,
    room: opts.raum,
    status: opts.status,
    updated: new Date().toISOString(),
    assignments,
  });

  const { error } = await db.from("sitzplaene").insert({
    id: planId,
    user_id: opts.userId,
    klasse_id: opts.klasseId,
    raum_id: opts.raumId,
    name: opts.titel,
    status: opts.status,
    canvas_document: dokument,
    revision: 1,
    dokument_version: 1,
  });
  if (error) throw new Error(`Sitzplan ${opts.titel}: ${error.message}`);

  return Object.keys(assignments).length;
}

// ── Ablauf ──────────────────────────────────────────────────────────────────

async function main() {
  const { data: liste, error: uFehler } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (uFehler) throw new Error(`Nutzer lesen: ${uFehler.message}`);

  const nutzer = liste.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!nutzer) {
    console.error(`Kein Konto mit der Adresse ${email}. Erst im Dashboard anlegen.`);
    process.exit(1);
  }

  if (!(await pruefeLeer(nutzer.id))) {
    if (!ersetzen) {
      console.error(
        `Das Konto ${email} enthält bereits Daten.\n` +
          "Mit --ersetzen werden sie endgültig gelöscht und durch Beispieldaten ersetzt.",
      );
      process.exit(1);
    }
    console.log("Vorhandene Daten werden entfernt …");
    await raeumeAb(nutzer.id);
  }

  const k7a = await legeKlasseAn(
    nutzer.id,
    "7a",
    "Klassenleitung Wernicke · Deutsch, Geschichte",
    KLASSE_7A,
  );
  const k9b = await legeKlasseAn(nutzer.id, "9b", "Mathematik, Kurs II", KLASSE_9B);
  const k5c = await legeKlasseAn(nutzer.id, "5c", "Neu zusammengesetzt seit August", KLASSE_5C);
  console.log(
    `Klassen: 7a (${KLASSE_7A.length}), 9b (${KLASSE_9B.length}), 5c (${KLASSE_5C.length})`,
  );

  // Regeln auf die Schüler mit Merkmalen gemünzt — so zeigt die Konfliktprüfung
  // in den Aufnahmen etwas, das sich auch begründen lässt.
  await legeRegelnAn(nutzer.id, k7a.id, k7a.schuelerIds, [
    { a: 1, b: 9, art: "nicht_neben" }, // Jonas / Tim
    { a: 15, b: 5, art: "nicht_neben" }, // Paul / Noah
    { a: 3, b: 2, art: "muss_neben" }, // Emil / Lea
    { a: 11, b: 12, art: "muss_neben" }, // Luis / Frieda
    { a: 8, b: 18, art: "nicht_neben" }, // Clara / Nele
  ]);
  await legeRegelnAn(nutzer.id, k9b.id, k9b.schuelerIds, [
    { a: 7, b: 3, art: "nicht_neben" },
    { a: 2, b: 4, art: "muss_neben" },
  ]);
  console.log("Sitzregeln: 7 Paare");

  const r204 = await legeRaumAn(nutzer.id, RAUM_204);
  const rFach = await legeRaumAn(nutzer.id, RAUM_FACH);
  const rKlein = await legeRaumAn(nutzer.id, RAUM_KLEIN);
  console.log(`Räume: ${RAUM_204.name}, ${RAUM_FACH.name}, ${RAUM_KLEIN.name}`);

  const belegt1 = await legePlanAn({
    userId: nutzer.id,
    titel: "7a — Sitzordnung Halbjahr 2",
    klasseId: k7a.id,
    raumId: r204,
    raum: RAUM_204,
    schuelerIds: k7a.schuelerIds,
    status: "aktiv",
  });
  const belegt2 = await legePlanAn({
    userId: nutzer.id,
    titel: "7a — Klassenarbeit Deutsch",
    klasseId: k7a.id,
    raumId: rKlein,
    raum: RAUM_KLEIN,
    schuelerIds: [...k7a.schuelerIds].reverse(),
    status: "entwurf",
  });
  const belegt3 = await legePlanAn({
    userId: nutzer.id,
    titel: "9b — Fachraum, Gruppentische",
    klasseId: k9b.id,
    raumId: rFach,
    raum: RAUM_FACH,
    schuelerIds: k9b.schuelerIds,
    status: "aktiv",
  });
  const belegt4 = await legePlanAn({
    userId: nutzer.id,
    titel: "5c — erster Entwurf",
    klasseId: k5c.id,
    raumId: r204,
    raum: RAUM_204,
    schuelerIds: k5c.schuelerIds,
    status: "entwurf",
    anteil: 0.75,
  });
  console.log(`Sitzpläne: 4 (belegte Plätze: ${belegt1}, ${belegt2}, ${belegt3}, ${belegt4})`);

  console.log(`\nFertig. ${email} ist eingerichtet.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
