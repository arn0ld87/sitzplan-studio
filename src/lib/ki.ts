// Aufruf der Edge Function `ki-sitzplan` und Übergabe an die Nachprüfung.
//
// Diese Datei kennt den Gemini-Schlüssel nicht und wird ihn nie kennen: Das
// Frontend schickt ausschließlich `{ planId, modus }`, alles Weitere entsteht
// serverseitig. Siehe ADR-0007.

import { supabase } from "@/integrations/supabase/client";
import {
  pruefeVorschlag,
  type GepruefterVorschlag,
  type KiVorschlagRoh,
} from "@/data/ki-vorschlag";
import type { PlanAusschnitt } from "@/data/sitzregeln";
import type { SeatRule, Student } from "@/data/types";

/** Obergrenze für das Warten auf die Edge Function. */
const ZEITLIMIT_MS = 60_000;

export type KiFehler = {
  /** Maschinenlesbarer Code der Funktion, etwa `deckel_konto_tag`. */
  code: string;
  /** Satz für die Oberfläche. Bereits deutsch und ohne Fachjargon. */
  nachricht: string;
};

export type KiErgebnis =
  { ok: true; vorschau: GepruefterVorschlag } | { ok: false; fehler: KiFehler };

/**
 * Holt einen Vorschlag und rechnet ihn sofort nach.
 *
 * Die Nachprüfung passiert hier und nicht erst in der Ansicht, damit kein
 * ungeprüfter Vorschlag in die Oberfläche gelangen kann — es gibt keinen Pfad,
 * der `pruefeVorschlag` überspringt.
 */
export async function erzeugeSitzplanVorschlag(
  planId: string,
  plan: PlanAusschnitt,
  schueler: Student[],
  regeln: SeatRule[],
): Promise<KiErgebnis> {
  const { data, error } = await supabase.functions.invoke("ki-sitzplan", {
    body: { planId, modus: "erzeugen" },
    // Ohne Obergrenze wartet der Client ewig, und der Wartedialog hat bewusst
    // kein „Abbrechen" — eine hängende Funktion legte damit die ganze Ansicht
    // still. 60 Sekunden sind das Vierfache der gemessenen Dauer (7–15 s);
    // was länger braucht, ist kaputt und nicht langsam.
    timeout: ZEITLIMIT_MS,
  });

  if (error) return { ok: false, fehler: await lesbarerFehler(error) };

  const roh = (data as { vorschlag?: KiVorschlagRoh } | null)?.vorschlag;
  if (!roh) {
    return {
      ok: false,
      fehler: { code: "leer", nachricht: "Die Funktion hat keinen Vorschlag zurückgegeben." },
    };
  }

  return { ok: true, vorschau: pruefeVorschlag(roh, plan, schueler, regeln) };
}

/**
 * Übersetzt einen Fehler der Function in einen Satz für die Oberfläche.
 *
 * `supabase.functions.invoke` verpackt einen Statuscode ungleich 2xx in einen
 * `FunctionsHttpError`, dessen `message` nur „Edge Function returned a
 * non-2xx status code" lautet. Der eigentliche Grund — etwa welcher Deckel
 * gegriffen hat — steht im Rumpf unter `context`. Ohne dieses Auspacken sähe
 * der Nutzer bei jedem Fehler denselben nichtssagenden Satz.
 */
async function lesbarerFehler(error: unknown): Promise<KiFehler> {
  const kontext = (error as { context?: unknown }).context;
  if (kontext instanceof Response) {
    try {
      const rumpf = (await kontext.clone().json()) as { fehler?: string; nachricht?: string };
      if (rumpf?.nachricht) {
        return { code: rumpf.fehler ?? "unbekannt", nachricht: rumpf.nachricht };
      }
    } catch {
      // Rumpf war kein JSON — dann bleibt es bei der allgemeinen Meldung unten.
    }
  }
  const text = error instanceof Error ? error.message : String(error);
  if (/timeout|abort/i.test(text)) {
    return {
      code: "zeitlimit",
      nachricht: `Die KI hat nach ${ZEITLIMIT_MS / 1000} Sekunden nicht geantwortet. Der Aufruf kann trotzdem gekostet haben.`,
    };
  }
  return {
    code: "netz",
    nachricht: `Der Vorschlag konnte nicht geholt werden. ${text}`,
  };
}
