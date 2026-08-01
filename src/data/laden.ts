// Der Schritt zwischen Datenbank und Oberfläche: aus fünf Tabellen wird ein
// AppData. Bewusst als eigenes Modul und ohne Supabase, React oder Netz —
// hier entscheidet sich, was ein gelöschter Datensatz noch zu sehen bekommt,
// und genau das gehört prüfbar. `ladeDaten` in `src/store/app.tsx` holt die
// Zeilen, diese Datei formt sie.
import {
  rowZuKlasse,
  rowZuPlan,
  rowZuRaum,
  rowZuRegel,
  type KlasseRow,
  type PlanRow,
  type RaumRow,
  type SchuelerRow,
  type SitzregelRow,
} from "./mapping";
import type { Room, SchoolClass, SeatRule, SeatingPlan, TrashItem } from "./types";

export const STORE_VERSION = 1;

export type AppData = {
  version: number;
  classes: SchoolClass[];
  rooms: Room[];
  plans: SeatingPlan[];
  rules: SeatRule[];
  trash: TrashItem[];
};

export const emptyData: AppData = {
  version: STORE_VERSION,
  classes: [],
  rooms: [],
  plans: [],
  rules: [],
  trash: [],
};

export type Zeilen = {
  klassen: KlasseRow[];
  schueler: SchuelerRow[];
  raeume: RaumRow[];
  plaene: PlanRow[];
  regeln: SitzregelRow[];
};

/**
 * Formt die Rohzeilen zu dem, womit die Oberfläche arbeitet.
 *
 * Zwei Dinge passieren hier, und beide sind fachlich:
 *
 * 1. Soft-Delete. Gelöschtes verschwindet aus `classes`, `rooms`, `plans` und
 *    `rules` — und aus `class.students`. Ein gelöschter Schüler darf weder in
 *    einem Zähler noch in einem Auswahlfeld noch auf einem Sitzplan auftauchen.
 * 2. Papierkorb. Was einen Zeitstempel trägt, wird eingesammelt, damit es
 *    wiederherstellbar bleibt (ADR-0004).
 *
 * Die Objekte werden vor dem Filtern gebaut, nicht danach: Der Papierkorb
 * braucht die fertige Form als `payload`, sonst gäbe es nichts zurückzuholen.
 *
 * Der heikle Fall steht zwischen beiden Punkten: Wird eine Klasse gelöscht,
 * schreibt `buildRows` **alle ihre Schüler** mit demselben Zeitstempel fort.
 * Würde Punkt 1 hier stur greifen, käme die Klasse leer aus dem Papierkorb
 * zurück — Datenverlust. Deshalb entscheidet der Zustand der Klasse, welche
 * Schüler sie trägt:
 *
 * - Aktive Klasse: nur Schüler ohne `deleted_at`.
 * - Gelöschte Klasse: die Schüler, die **mit ihr** gegangen sind, erkennbar am
 *   identischen Zeitstempel. Wer vorher einzeln gelöscht wurde, trägt einen
 *   älteren und bleibt gelöscht — auch nach dem Wiederherstellen.
 */
export function zeilenZuAppData({ klassen, schueler, raeume, plaene, regeln }: Zeilen): AppData {
  const klasseObj = new Map<string, SchoolClass>();
  klassen.forEach((row, i) =>
    klasseObj.set(
      row.id,
      rowZuKlasse(
        row,
        // Der Filter auf `deleted_at` gehört hierher und nicht erst in die
        // Ansicht: Ein gelöschter Schüler, der einmal in `class.students`
        // steht, wandert von dort ungeprüft weiter.
        schueler.filter(
          (x) =>
            x.klasse_id === row.id &&
            (row.deleted_at ? !x.deleted_at || x.deleted_at === row.deleted_at : !x.deleted_at),
        ),
        i % 8,
      ),
    ),
  );

  // Wen die Klassen kennen, den darf ein Sitzplan setzen. Alle anderen sind
  // einzeln gelöscht: Ihr Platz bliebe sonst besetzt, aber leer gezeichnet.
  const bekannteSchueler = new Set<string>();
  for (const k of klasseObj.values()) for (const s of k.students) bekannteSchueler.add(s.id);

  const raumObj = new Map<string, Room>(raeume.map((row) => [row.id, rowZuRaum(row)]));
  const planObj = new Map<string, SeatingPlan>(
    plaene.map((row) => {
      const plan = rowZuPlan(row, raumObj.get(row.raum_id)?.name ?? "Raum");
      return [
        row.id,
        {
          ...plan,
          assignments: Object.fromEntries(
            Object.entries(plan.assignments).filter(([, id]) => bekannteSchueler.has(id)),
          ),
        },
      ];
    }),
  );

  const trash: TrashItem[] = [];
  for (const row of klassen)
    if (row.deleted_at)
      trash.push({
        id: row.id,
        kind: "klasse",
        name: row.name,
        deletedAt: row.deleted_at,
        payload: klasseObj.get(row.id)!,
      });
  for (const row of raeume)
    if (row.deleted_at)
      trash.push({
        id: row.id,
        kind: "raum",
        name: row.name,
        deletedAt: row.deleted_at,
        payload: raumObj.get(row.id)!,
      });
  for (const row of plaene)
    if (row.deleted_at)
      trash.push({
        id: row.id,
        kind: "sitzplan",
        name: row.name,
        deletedAt: row.deleted_at,
        payload: planObj.get(row.id)!,
      });
  trash.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

  return {
    version: STORE_VERSION,
    classes: klassen.filter((row) => !row.deleted_at).map((row) => klasseObj.get(row.id)!),
    rooms: raeume.filter((row) => !row.deleted_at).map((row) => raumObj.get(row.id)!),
    plans: plaene.filter((row) => !row.deleted_at).map((row) => planObj.get(row.id)!),
    rules: regeln.filter((row) => !row.deleted_at).map(rowZuRegel),
    trash,
  };
}
