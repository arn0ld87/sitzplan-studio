import { describe, expect, it } from "vitest";
import {
  FURNITURE_SPECS,
  MERKMALE,
  STUDENT_COLORS,
  allSeats,
  initials,
  makeFurniture,
  merkmalLabel,
  newId,
  parseSeatId,
  seatCount,
  seatId,
  seatPositions,
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
  const ada = {
    id: "1",
    firstName: "Ada",
    lastName: "Lovelace",
    colorIndex: 0,
    merkmale: [],
    notiz: "",
  };

  it("setzt Vor- und Nachname zusammen", () => {
    expect(studentName(ada)).toBe("Ada Lovelace");
  });

  it("lässt bei fehlendem Nachnamen kein Leerzeichen stehen", () => {
    expect(studentName({ ...ada, lastName: "" })).toBe("Ada");
  });
});

describe("merkmalLabel", () => {
  it("übersetzt einen Katalogschlüssel ins deutsche Label", () => {
    expect(merkmalLabel("schwerhoerig")).toBe("Schwerhörigkeit");
    expect(merkmalLabel("daz")).toBe("Deutsch als Zweitsprache");
  });

  it("gibt frei eingegebene Merkmale wörtlich zurück", () => {
    // Der Katalog ist eine Vorschlagsliste. Was nicht darin steht, darf beim
    // Anzeigen nicht verschwinden und nicht zu einem Platzhalter werden.
    expect(merkmalLabel("sitzt ungern am Fenster")).toBe("sitzt ungern am Fenster");
    expect(merkmalLabel("")).toBe("");
  });

  it("hält Katalogschlüssel frei von Zeichen, die eine Rundreise nicht überstehen", () => {
    // Die Schlüssel landen unverändert in einem text[] und im KI-Prompt.
    for (const m of MERKMALE) {
      expect(m.id).toMatch(/^[a-z_]+$/);
      expect(m.label.trim()).toBe(m.label);
      expect(m.label).not.toBe("");
    }
    expect(new Set(MERKMALE.map((m) => m.id)).size).toBe(MERKMALE.length);
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
    // Hartanker 5 der CLAUDE.md: `<objektId>__sitz_<n>` ist Vertrag zwischen
    // canvas_document (JSONB) und Oberfläche. Schlägt dieser Test fehl, sind
    // gespeicherte Sitzpläne nicht mehr lesbar — das Muster wird nicht
    // angepasst, sondern der Aufrufer.
    expect(seatId("abc", 2)).toBe("abc__sitz_2");
    expect(seatId("abc", 2)).toMatch(/^.+__sitz_\d+$/);
  });

  it("liefert für dieselbe Eingabe immer dieselbe Kennung", () => {
    expect(seatId("raum-7", 3)).toBe(seatId("raum-7", 3));
  });

  it("übernimmt Sonderzeichen der Objektkennung unverändert", () => {
    expect(seatId("a b/c.d-e_f", 1)).toBe("a b/c.d-e_f__sitz_1");
    expect(seatId("tisch__sitz", 1)).toBe("tisch__sitz__sitz_1");
  });

  it("hängt auch an eine Objektkennung an, die selbst wie ein Sitzplatz aussieht", () => {
    expect(seatId("tisch__sitz_2", 3)).toBe("tisch__sitz_2__sitz_3");
  });

  it("vergibt für verschiedene Objekte niemals dieselbe Sitzplatzkennung", () => {
    // Die Nummer ist rein numerisch, deshalb kann der Objektteil nie in den
    // Nummernteil einer anderen Kennung hineinwachsen.
    const objekte = ["a", "a_", "a__sitz", "a__sitz_1", "a__sitz_1__sitz_2", "b"];
    const kennungen = objekte.flatMap((o) => [1, 2, 3].map((n) => seatId(o, n)));
    expect(new Set(kennungen).size).toBe(kennungen.length);
  });

  it("unterscheidet Sitzplätze desselben Objekts anhand der Nummer", () => {
    expect(seatId("abc", 1)).not.toBe(seatId("abc", 2));
  });
});

describe("parseSeatId", () => {
  const objekte = [
    "abc",
    "3f9a-1b2c",
    "a b/c.d-e_f",
    "tisch__sitz",
    "tisch__sitz_2",
    "tisch__sitz_2__sitz_3",
  ];

  it.each(objekte)("gewinnt Objektkennung und Nummer aus %s zurück", (objektId) => {
    expect(parseSeatId(seatId(objektId, 4))).toEqual({ objektId, n: 4 });
  });

  it("erkennt eine Kennung ohne Sitzplatzmuster nicht an", () => {
    expect(parseSeatId("abc")).toBeNull();
    expect(parseSeatId("abc__stuhl_1")).toBeNull();
  });

  it("weist eine nicht numerische oder fehlende Nummer ab", () => {
    expect(parseSeatId("abc__sitz_")).toBeNull();
    expect(parseSeatId("abc__sitz_zwei")).toBeNull();
    expect(parseSeatId("abc__sitz_-1")).toBeNull();
    expect(parseSeatId("abc__sitz_1.0")).toBeNull();
  });

  it("akzeptiert nur die kanonische Schreibweise der Nummer", () => {
    // "007" ergäbe beim Rückweg eine andere Kennung als beim Hinweg.
    expect(parseSeatId("abc__sitz_007")).toBeNull();
    expect(parseSeatId("abc__sitz_7")).toEqual({ objektId: "abc", n: 7 });
  });

  it("trennt am letzten Vorkommen, nicht am ersten", () => {
    expect(parseSeatId("tisch__sitz_2__sitz_3")).toEqual({ objektId: "tisch__sitz_2", n: 3 });
  });

  it("kann eine Objektkennung in Sitzplatzform nicht als solche erkennen", () => {
    // Dokumentierte Grenze: Ein Objekt, dessen Kennung selbst auf `__sitz_<n>`
    // endet, ist vom Sitzplatz eines anderen Objekts nicht unterscheidbar.
    // Das Format trägt diese Information nicht — wer sie braucht, muss die
    // Objektkennung gegen die Möbelliste prüfen.
    const zweideutig = "tisch__sitz_2";
    expect(parseSeatId(zweideutig)).toEqual({ objektId: "tisch", n: 2 });
    expect(seatId("tisch", 2)).toBe(zweideutig);
  });

  it("führt für jeden echten Sitzplatz eines Möbels zurück zum Möbel", () => {
    const f = makeFurniture("doppeltisch", 0, 0);
    expect(f.seats.map((s) => parseSeatId(s))).toEqual([
      { objektId: f.id, n: 1 },
      { objektId: f.id, n: 2 },
    ]);
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

describe("seatPositions", () => {
  const ARTEN = Object.keys(FURNITURE_SPECS) as FurnitureKind[];

  it("liefert für jede Möbelart genau so viele Punkte wie Sitzplätze", () => {
    for (const kind of ARTEN) {
      expect(seatPositions(kind)).toHaveLength(FURNITURE_SPECS[kind].seats);
    }
  });

  it("setzt den einzelnen Sitzplatz in die Mitte der Tischfläche", () => {
    const spec = FURNITURE_SPECS.einzeltisch;
    expect(seatPositions("einzeltisch")).toEqual([{ cx: spec.w / 2, cy: spec.h / 2 }]);
  });

  it("verteilt zwei Sitzplätze symmetrisch auf den Doppeltisch", () => {
    const spec = FURNITURE_SPECS.doppeltisch;
    const [links, rechts] = seatPositions("doppeltisch");
    expect(links?.cx).toBeCloseTo(spec.w * 0.25);
    expect(rechts?.cx).toBeCloseTo(spec.w * 0.75);
    // Gleicher Abstand zur Tischmitte, gleiche Tiefe.
    expect(spec.w / 2 - (links?.cx ?? 0)).toBeCloseTo((rechts?.cx ?? 0) - spec.w / 2);
    expect(links?.cy).toBe(rechts?.cy);
  });

  it("hält jeden Sitzplatz innerhalb der Möbelfläche", () => {
    for (const kind of ARTEN) {
      const spec = FURNITURE_SPECS[kind];
      for (const { cx, cy } of seatPositions(kind)) {
        expect(cx).toBeGreaterThanOrEqual(0);
        expect(cx).toBeLessThanOrEqual(spec.w);
        expect(cy).toBeGreaterThanOrEqual(0);
        expect(cy).toBeLessThanOrEqual(spec.h);
      }
    }
  });

  it("passt zu den Sitzplatzkennungen, die makeFurniture vergibt", () => {
    // 2D-Zeichnung und 3D-Ansicht greifen beide über den Rang auf diese Punkte
    // zu — es muss zu jedem Sitzplatz genau ein Punkt gehören.
    for (const kind of ARTEN) {
      const f = makeFurniture(kind, 0, 0);
      expect(seatPositions(kind)).toHaveLength(f.seats.length);
    }
  });
});
