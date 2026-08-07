// Sitzplatzbelegungen für die 3D-Ansicht auflösen.
//
// Ein Möbelstück kennt seine Sitzplätze als `moebel.seats: string[]`, gebildet
// nach dem Muster `<objektId>__sitz_<n>`. Dieses Modul ordnet jeder Belegung
// den passenden Stuhlindex innerhalb eines Möbelstücks zu.

import { type Furniture, type SeatAssignment, parseSeatId, seatId } from "@/data/types";

export type StuhlBelegung = {
  seatIndex: number;
  student: SeatAssignment;
};

/**
 * Ordnet einer Möbelstück-Belegung die passenden Stuhlindizes zu.
 *
 * Eine Belegung gilt für das Möbelstück, wenn ihre `seatId` dem Muster
 * `<moebel.id>__sitz_<n>` entspricht und `n` ein gültiger Index in
 * `moebel.seats` ist. Ungültige oder fremde Einträge werden ignoriert.
 */
export function belegungFuerMoebel(
  belegung: SeatAssignment[] | undefined,
  moebel: Furniture,
): StuhlBelegung[] {
  if (!belegung || belegung.length === 0) return [];

  const ergebnis: StuhlBelegung[] = [];
  const belegteIndizes = new Set<number>();
  for (const student of belegung) {
    const parsed = parseSeatId(student.seatId);
    if (!parsed) continue;
    if (parsed.objektId !== moebel.id) continue;
    if (parsed.n < 1 || parsed.n > moebel.seats.length) continue;
    const seatIndex = parsed.n - 1;
    if (moebel.seats[seatIndex] !== seatId(moebel.id, parsed.n)) continue;
    if (belegteIndizes.has(seatIndex)) continue;
    belegteIndizes.add(seatIndex);
    ergebnis.push({ seatIndex, student });
  }
  return ergebnis;
}
