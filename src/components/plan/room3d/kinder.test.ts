import { describe, expect, it } from "vitest";
import { makeFurniture, seatId, type SeatAssignment } from "@/data/types";
import { belegungFuerMoebel } from "./kinder";

function student(id: string, seatIdValue: string): SeatAssignment {
  return {
    seatId: seatIdValue,
    studentId: id,
    firstName: "Vor",
    lastName: "Nach",
    colorIndex: 0,
  };
}

describe("belegungFuerMoebel", () => {
  it("ordnet einem Einzeltisch eine einzelne Belegung zu", () => {
    const tisch = makeFurniture("einzeltisch", 0, 0);
    const belegung = [student("s1", seatId(tisch.id, 1))];

    const ergebnis = belegungFuerMoebel(belegung, tisch);

    expect(ergebnis).toHaveLength(1);
    expect(ergebnis[0]!.seatIndex).toBe(0);
    expect(ergebnis[0]!.student.studentId).toBe("s1");
  });

  it("ordnet einem Doppeltisch beide Stühle korrekt zu", () => {
    const tisch = makeFurniture("doppeltisch", 0, 0);
    const belegung = [student("s1", seatId(tisch.id, 1)), student("s2", seatId(tisch.id, 2))];

    const ergebnis = belegungFuerMoebel(belegung, tisch);

    expect(ergebnis).toHaveLength(2);
    expect(ergebnis.map((e) => ({ index: e.seatIndex, id: e.student.studentId }))).toEqual([
      { index: 0, id: "s1" },
      { index: 1, id: "s2" },
    ]);
  });

  it("ignoriert Belegungen für ein anderes Möbelstück", () => {
    const tischA = makeFurniture("einzeltisch", 0, 0);
    const tischB = makeFurniture("einzeltisch", 100, 0);
    const belegung = [student("s1", seatId(tischB.id, 1))];

    const ergebnis = belegungFuerMoebel(belegung, tischA);

    expect(ergebnis).toHaveLength(0);
  });

  it("ignoriert ungültige seatIds", () => {
    const tisch = makeFurniture("einzeltisch", 0, 0);
    const belegung = [student("s1", "keine-gueltige-id")];

    const ergebnis = belegungFuerMoebel(belegung, tisch);

    expect(ergebnis).toHaveLength(0);
  });

  it("ignoriert Indizes außerhalb der verfügbaren Stühle", () => {
    const tisch = makeFurniture("einzeltisch", 0, 0);
    const belegung = [student("s1", seatId(tisch.id, 5))];

    const ergebnis = belegungFuerMoebel(belegung, tisch);

    expect(ergebnis).toHaveLength(0);
  });

  it("ignoriert alte seatIds, die nicht mehr zum aktuellen Möbelstück passen", () => {
    const tisch = makeFurniture("einzeltisch", 0, 0);
    // Sitzplatzkennung passt zum Möbel, aber `moebel.seats[0]` enthält nicht die erwartete ID.
    const belegung = [student("s1", seatId(tisch.id, 1))];
    tisch.seats = ["fremde-id"];

    const ergebnis = belegungFuerMoebel(belegung, tisch);

    expect(ergebnis).toHaveLength(0);
  });

  it("liefert bei leerer Belegung eine leere Liste", () => {
    const tisch = makeFurniture("einzeltisch", 0, 0);

    expect(belegungFuerMoebel([], tisch)).toEqual([]);
    expect(belegungFuerMoebel(undefined, tisch)).toEqual([]);
  });

  it("berücksichtigt nur die erste Belegung pro Stuhl", () => {
    const tisch = makeFurniture("einzeltisch", 0, 0);
    const belegung = [student("s1", seatId(tisch.id, 1)), student("s2", seatId(tisch.id, 1))];

    const ergebnis = belegungFuerMoebel(belegung, tisch);

    expect(ergebnis).toHaveLength(1);
    expect(ergebnis[0]!.student.studentId).toBe("s1");
  });
});
