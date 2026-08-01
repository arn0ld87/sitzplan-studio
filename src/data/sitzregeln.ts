// Auswertung der Sitzregeln gegen einen Sitzplan — reine Funktionen, ohne UI.
//
// Die Regelauswertung entstand ursprünglich inline in der Sitzplan-Ansicht
// (`src/routes/_authenticated/sitzplaene.$id.tsx`). Dieses Modul bildet dieselbe
// Fachlogik als testbare Einheit ab: Nachbarschaft, Platzzuordnung und die
// Frage, welche Regel im aktuellen Plan verletzt ist. Vorschlagstexte und das
// Anwenden eines Vorschlags bleiben Sache der Ansicht.

import type { Furniture, RuleKind, SeatRule, SeatingPlan } from "./types";

/** Der Ausschnitt eines Sitzplans, den die Regelauswertung tatsächlich braucht. */
export type PlanAusschnitt = Pick<SeatingPlan, "classId" | "room" | "assignments">;

/** Eine verletzte Sitzregel, aufgelöst auf die beteiligten Sitzplätze. */
export type RegelKonflikt = {
  regelId: string;
  kind: RuleKind;
  /** Schüler-Kennung der ersten Regelseite. */
  a: string;
  /** Schüler-Kennung der zweiten Regelseite. */
  b: string;
  sitzA: string;
  sitzB: string;
};

/**
 * Dreht die Zuordnung Sitzplatz → Schüler um. Steht ein Schüler mehrfach im
 * Plan, gewinnt der zuletzt eingetragene Sitzplatz.
 */
export function platzVonSchueler(assignments: Record<string, string>): Record<string, string> {
  const platz: Record<string, string> = {};
  for (const [sitz, schuelerId] of Object.entries(assignments)) platz[schuelerId] = sitz;
  return platz;
}

/**
 * Nachbarplätze eines Sitzplatzes: alle weiteren Plätze desselben Möbelstücks.
 * Ein Einzeltisch hat damit keine Nachbarn, ein Doppeltisch genau einen.
 */
export function nachbarplaetze(room: { furniture: Furniture[] }, sitz: string): string[] {
  const moebel = room.furniture.find((f) => f.seats.includes(sitz));
  return moebel ? moebel.seats.filter((x) => x !== sitz) : [];
}

/** Sitzen beide Plätze am selben Möbelstück? */
export function sindBenachbart(room: { furniture: Furniture[] }, sitzA: string, sitzB: string) {
  return nachbarplaetze(room, sitzA).includes(sitzB);
}

/**
 * Prüft alle Regeln der Plan-Klasse gegen die aktuelle Sitzverteilung.
 *
 * Eine Regel wird übersprungen, sobald einer der beiden Schüler keinen Platz im
 * Plan hat — etwa weil er noch nicht gesetzt oder aus der Klasse entfernt wurde.
 * Regeln anderer Klassen bleiben unberücksichtigt.
 *
 * Jede Regel wird für sich bewertet. Widersprechen sich zwei Regeln zu
 * demselben Paar, ist stets genau eine von beiden verletzt; eine Auflösung des
 * Widerspruchs findet nicht statt.
 */
export function pruefeSitzregeln(plan: PlanAusschnitt, regeln: SeatRule[]): RegelKonflikt[] {
  const platz = platzVonSchueler(plan.assignments);
  const konflikte: RegelKonflikt[] = [];

  for (const regel of regeln) {
    if (regel.classId !== plan.classId) continue;
    const sitzA = platz[regel.a];
    const sitzB = platz[regel.b];
    if (!sitzA || !sitzB) continue;

    const benachbart = sindBenachbart(plan.room, sitzA, sitzB);
    const verletzt =
      (regel.kind === "nicht_neben" && benachbart) || (regel.kind === "muss_neben" && !benachbart);
    if (!verletzt) continue;

    konflikte.push({ regelId: regel.id, kind: regel.kind, a: regel.a, b: regel.b, sitzA, sitzB });
  }

  return konflikte;
}
