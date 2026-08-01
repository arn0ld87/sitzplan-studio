// Soft-Delete-Filter für alle Nutzdatentabellen.
//
// Siehe docs/decisions/0004-soft-delete-und-papierkorb.md: Löschen setzt einen
// Zeitstempel, es entfernt keine Zeile. Daraus folgt die Regel ohne Ausnahme —
// jede Leseabfrage auf Nutzdaten enthält `deleted_at IS NULL`.
//
// Die Regel ist weder von der Datenbank noch vom Typsystem erzwungen. Diese
// Datei macht sie wenigstens prüfbar: eine Stelle, die den Filter kennt, statt
// einer `.filter((row) => !row.deleted_at)`-Wiederholung je Aufrufer.

import type { SchuelerRow } from "./mapping";

/** Gemeinsame Form aller Nutzdatenzeilen: Kennung plus Löschzeitstempel. */
export type SoftDeleteRow = {
  id: string;
  deleted_at: string | null;
};

/** Im Papierkorb — Zeile existiert, ist aber gelöscht. */
export function istGeloescht(row: SoftDeleteRow): boolean {
  return row.deleted_at !== null;
}

/** Sichtbar für die Lehrkraft. Gegenstück zu {@link istGeloescht}. */
export function istAktiv(row: SoftDeleteRow): boolean {
  return row.deleted_at === null;
}

/** Der Filter für jeden Lesepfad auf Nutzdaten. */
export function nurAktive<T extends SoftDeleteRow>(zeilen: readonly T[]): T[] {
  return zeilen.filter(istAktiv);
}

/** Der Inhalt des Papierkorbs. */
export function nurGeloeschte<T extends SoftDeleteRow>(zeilen: readonly T[]): T[] {
  return zeilen.filter(istGeloescht);
}

/**
 * Löscht weich: setzt den Zeitstempel, ohne die Zeile anzufassen. Ein bereits
 * gelöschter Datensatz behält seinen ursprünglichen Zeitstempel — sonst würde
 * ein zweiter Löschbefehl die Reihenfolge im Papierkorb verfälschen.
 */
export function geloescht<T extends SoftDeleteRow>(zeile: T, zeitpunkt: string): T {
  if (istGeloescht(zeile)) return zeile;
  return { ...zeile, deleted_at: zeitpunkt };
}

/** Holt aus dem Papierkorb zurück. */
export function wiederhergestellt<T extends SoftDeleteRow>(zeile: T): T {
  return { ...zeile, deleted_at: null };
}

/**
 * Die Schüler einer Klasse, ohne die gelöschten. Der Filter gehört hierher und
 * nicht in den Aufrufer: eine vergessene Zeile bedeutet einen Geist im Sitzplan.
 */
export function aktiveSchuelerDerKlasse(
  zeilen: readonly SchuelerRow[],
  klasseId: string,
): SchuelerRow[] {
  return zeilen.filter((s) => s.klasse_id === klasseId && istAktiv(s));
}

/** Zähler für Listen und Übersichten — zählt nur, was die Lehrkraft auch sieht. */
export function anzahlAktiverSchueler(zeilen: readonly SchuelerRow[], klasseId: string): number {
  return aktiveSchuelerDerKlasse(zeilen, klasseId).length;
}

/**
 * Sitzzuweisungen ohne gelöschte Schüler. Die Zuweisung selbst bleibt in
 * `canvas_document` bestehen — sie wird beim Lesen ausgeblendet, damit ein
 * wiederhergestellter Schüler seinen Platz zurückbekommt.
 */
export function aktiveZuweisungen(
  zuweisungen: Readonly<Record<string, string>>,
  aktiveSchueler: readonly SchuelerRow[],
): Record<string, string> {
  const erlaubt = new Set(aktiveSchueler.map((s) => s.id));
  return Object.fromEntries(
    Object.entries(zuweisungen).filter(([, schuelerId]) => erlaubt.has(schuelerId)),
  );
}
