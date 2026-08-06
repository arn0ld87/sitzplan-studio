// Drehung des Grundrisses nach der eingestellten Vorn-Seite.
//
// Der KI-Prompt verspricht dem Modell eine feste Welt: „Kleine y-Werte sind
// vorn." Damit das für jede Vorn-Seite stimmt, wird nicht der Prompt-Text
// variiert, sondern der Grundriss vor dem Prompt-Bau gedreht — das Modell
// rechnet nie selbst um. Diese Datei ist der **Vertrag** dafür; die Edge
// Function `supabase/functions/ki-sitzplan/index.ts` führt eine wörtliche
// Kopie von `nachVornOben` aus (Deno kann `src/` nicht importieren — dieselbe
// bewusste Doppelung wie bei `MERKMAL_LABEL` dort). Wer hier etwas ändert,
// ändert die Kopie mit; die Tests in `ausrichtung.test.ts` halten beide fest.

import type { VornSeite } from "./types";

export type GedrehteWelt = {
  breiteCm: number;
  laengeCm: number;
  /** Bildet einen Punkt des Original-Grundrisses in die gedrehte Welt ab. */
  punkt: (x: number, y: number) => { x: number; y: number };
};

/**
 * Dreht den Grundriss so, dass die Vorn-Seite bei kleinen y-Werten liegt.
 *
 * Alle vier Fälle sind echte Drehungen (keine Spiegelungen): Nachbarschaften
 * und Links/Rechts-Verhältnisse bleiben erhalten. Bei 90°/270° tauschen
 * Breite und Tiefe des Raums die Rollen.
 */
export function nachVornOben(breiteCm: number, laengeCm: number, vorn: VornSeite): GedrehteWelt {
  if (vorn === "unten") {
    // 180°: obere und untere Kante tauschen.
    return {
      breiteCm,
      laengeCm,
      punkt: (x, y) => ({ x: breiteCm - x, y: laengeCm - y }),
    };
  }
  if (vorn === "links") {
    // 90° im Uhrzeigersinn: die linke Kante wird zur oberen.
    return {
      breiteCm: laengeCm,
      laengeCm: breiteCm,
      punkt: (x, y) => ({ x: laengeCm - y, y: x }),
    };
  }
  if (vorn === "rechts") {
    // 90° gegen den Uhrzeigersinn: die rechte Kante wird zur oberen.
    return {
      breiteCm: laengeCm,
      laengeCm: breiteCm,
      punkt: (x, y) => ({ x: y, y: breiteCm - x }),
    };
  }
  // „oben" ist die bisherige stillschweigende Annahme — nichts zu drehen.
  return { breiteCm, laengeCm, punkt: (x, y) => ({ x, y }) };
}
