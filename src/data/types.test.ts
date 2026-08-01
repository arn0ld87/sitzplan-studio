import { describe, expect, it } from "vitest";
import {
  FURNITURE_SPECS,
  STUDENT_COLORS,
  allSeats,
  initials,
  makeFurniture,
  newId,
  seatCount,
  seatId,
  studentColor,
  studentName,
  type FurnitureKind,
} from "./types";

describe("studentColor", () => {
  it("gibt für Index 0 die erste Farbe", () => {
    expect(studentColor(0)).toBe(STUDENT_COLORS[0]);
  });

  it("läuft am Ende der Palette um", () => {
    expect(studentColor(STUDENT_COLORS.length)).toBe(STUDENT_COLORS[0]);
    expect(studentColor(STUDENT_COLORS.length + 3)).toBe(STUDENT_COLORS[3]);
  });

  it("liefert auch bei negativem Index eine gültige Farbe", () => {
    // Der doppelte Modulo in der Implementierung existiert genau dafür:
    // ein einfaches % ergäbe hier undefined.
    expect(studentColor(-1)).toBe(STUDENT_COLORS[STUDENT_COLORS.length - 1]);
    expect(studentColor(-STUDENT_COLORS.length)).toBe(STUDENT_COLORS[0]);
  });
});

describe("initials", () => {
  it("nimmt die Anfangsbuchstaben der ersten beiden Wörter", () => {
    expect(initials("Anna Berger")).toBe("AB");
  });

  it("ignoriert überzählige Namensteile", () => {
    expect(initials("Maria Luisa von Hohenstein")).toBe("ML");
  });

  it("kommt mit nur einem Namen aus", () => {
    expect(initials("Cem")).toBe("C");
  });

  it("verträgt führende, mehrfache und schließende Leerzeichen", () => {
    expect(initials("   jonas    weber  ")).toBe("JW");
  });

  it("gibt bei leerer Eingabe einen leeren String", () => {
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
  });
});

describe("studentName", () => {
  it("setzt Vor- und Nachname zusammen", () => {
    expect(studentName({ id: "1", firstName: "Ada", lastName: "Lovelace", colorIndex: 0 })).toBe(
      "Ada Lovelace",
    );
  });

  it("lässt bei fehlendem Nachnamen kein Leerzeichen stehen", () => {
    expect(studentName({ id: "1", firstName: "Ada", lastName: "", colorIndex: 0 })).toBe("Ada");
  });
});

describe("newId", () => {
  it("erzeugt eindeutige Kennungen im UUID-Format", () => {
    const a = newId();
    const b = newId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe("seatId", () => {
  it("hält das vereinbarte Muster ein", () => {
    // Dieses Muster ist Vertrag zwischen canvas_document und Oberfläche.
    expect(seatId("abc", 2)).toBe("abc__sitz_2");
  });
});

describe("makeFurniture", () => {
  const seatsJeArt: [FurnitureKind, number][] = [
    ["einzeltisch", 1],
    ["doppeltisch", 2],
    ["pult", 0],
    ["tafel", 0],
    ["tuer", 0],
    ["fenster", 0],
  ];

  it.each(seatsJeArt)("legt für %s genau %i Sitzplätze an", (kind, erwartet) => {
    const f = makeFurniture(kind, 0, 0);
    expect(f.seats).toHaveLength(erwartet);
    expect(FURNITURE_SPECS[kind].seats).toBe(erwartet);
  });

  it("nummeriert Sitzplätze ab 1 und bindet sie an die eigene Kennung", () => {
    const f = makeFurniture("doppeltisch", 120, 80);
    expect(f.seats).toEqual([seatId(f.id, 1), seatId(f.id, 2)]);
  });

  it("übernimmt die Position und startet ungedreht", () => {
    const f = makeFurniture("einzeltisch", 120, 80);
    expect(f).toMatchObject({ kind: "einzeltisch", x: 120, y: 80, rotation: 0 });
  });

  it("vergibt für jedes Möbel eine eigene Kennung", () => {
    expect(makeFurniture("einzeltisch", 0, 0).id).not.toBe(makeFurniture("einzeltisch", 0, 0).id);
  });
});

describe("seatCount und allSeats", () => {
  const raum = {
    furniture: [
      makeFurniture("doppeltisch", 0, 0),
      makeFurniture("einzeltisch", 200, 0),
      makeFurniture("pult", 0, 300),
      makeFurniture("tafel", 0, 400),
    ],
  };

  it("zählt nur Möbel mit Sitzplätzen", () => {
    expect(seatCount(raum)).toBe(3);
  });

  it("liefert alle Sitzplatzkennungen in Reihenfolge der Möbel", () => {
    expect(allSeats(raum)).toEqual(raum.furniture.flatMap((f) => f.seats));
    expect(allSeats(raum)).toHaveLength(seatCount(raum));
  });

  it("kommt mit einem leeren Raum zurecht", () => {
    expect(seatCount({ furniture: [] })).toBe(0);
    expect(allSeats({ furniture: [] })).toEqual([]);
  });
});
