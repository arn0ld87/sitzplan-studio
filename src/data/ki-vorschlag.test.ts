import { describe, expect, it } from "vitest";
import { befundZusammenfassung, pruefeVorschlag, type KiZuordnung } from "./ki-vorschlag";
import { makeFurniture, seatId, type SeatRule, type Student } from "./types";
import type { PlanAusschnitt } from "./sitzregeln";

// Zwei Doppeltische — vier Plätze, davon je zwei benachbart. Das ist die
// kleinste Anordnung, in der sich „nicht neben" und „muss neben" überhaupt
// verletzen lassen.
const tischA = makeFurniture("doppeltisch", 0, 0);
const tischB = makeFurniture("doppeltisch", 200, 0);
const A1 = seatId(tischA.id, 1);
const A2 = seatId(tischA.id, 2);
const B1 = seatId(tischB.id, 1);
const B2 = seatId(tischB.id, 2);

const KLASSE = "klasse-1";

function schueler(id: string, firstName: string): Student {
  return { id, firstName, lastName: "", colorIndex: 0, merkmale: [], notiz: "" };
}

const ANNA = schueler("s-anna", "Anna");
const BEN = schueler("s-ben", "Ben");
const CEM = schueler("s-cem", "Cem");
const DANA = schueler("s-dana", "Dana");
const ALLE = [ANNA, BEN, CEM, DANA];

const PLAN: PlanAusschnitt = {
  classId: KLASSE,
  room: { name: "R1", width: 600, height: 400, grid: 25, furniture: [tischA, tischB] },
  assignments: {},
};

function z(sitzId: string, schuelerId: string, begruendung = "Grund"): KiZuordnung {
  return { sitzId, schuelerId, begruendung };
}

describe("pruefeVorschlag — der glatte Fall", () => {
  const ergebnis = pruefeVorschlag(
    { zuordnungen: [z(A1, ANNA.id), z(A2, BEN.id), z(B1, CEM.id), z(B2, DANA.id)] },
    PLAN,
    ALLE,
    [],
  );

  it("übernimmt alle Zuordnungen unverändert", () => {
    expect(ergebnis.assignments).toEqual({
      [A1]: ANNA.id,
      [A2]: BEN.id,
      [B1]: CEM.id,
      [B2]: DANA.id,
    });
  });

  it("meldet nichts", () => {
    expect(ergebnis.befunde).toEqual([]);
    expect(ergebnis.konflikte).toEqual([]);
    expect(befundZusammenfassung(ergebnis.befunde)).toEqual([]);
  });
});

describe("pruefeVorschlag — erfundene Kennungen", () => {
  it("verwirft einen Sitzplatz, den es im Raum nicht gibt, und lässt ihn leer", () => {
    const ergebnis = pruefeVorschlag(
      { zuordnungen: [z(A1, ANNA.id), z("tisch-erfunden__sitz_1", BEN.id)] },
      PLAN,
      ALLE,
      [],
    );
    expect(ergebnis.assignments).toEqual({ [A1]: ANNA.id });
    expect(ergebnis.befunde).toContainEqual({
      art: "unbekannter_sitz",
      sitzId: "tisch-erfunden__sitz_1",
      schuelerId: BEN.id,
    });
  });

  it("verwirft einen Schüler, den es in der Klasse nicht gibt", () => {
    const ergebnis = pruefeVorschlag({ zuordnungen: [z(A1, "s-erfunden")] }, PLAN, ALLE, []);
    expect(ergebnis.assignments).toEqual({});
    expect(ergebnis.befunde).toContainEqual({
      art: "unbekannter_schueler",
      schuelerId: "s-erfunden",
      sitzId: A1,
    });
  });

  it("prüft den Sitzplatz vor dem Schüler und meldet nur einen Befund je Zeile", () => {
    const ergebnis = pruefeVorschlag(
      { zuordnungen: [z("kein-sitz", "s-erfunden")] },
      PLAN,
      ALLE,
      [],
    );
    const zeilenbefunde = ergebnis.befunde.filter((b) => b.art !== "nicht_zugeordnet");
    expect(zeilenbefunde).toHaveLength(1);
    expect(zeilenbefunde[0]!.art).toBe("unbekannter_sitz");
  });
});

describe("pruefeVorschlag — Mehrfachnennungen", () => {
  it("verschmilzt eine wortgleich wiederholte Zeile, statt sie als Doppelbelegung zu lesen", () => {
    const ergebnis = pruefeVorschlag(
      { zuordnungen: [z(A1, ANNA.id), z(A1, ANNA.id)] },
      PLAN,
      ALLE,
      [],
    );
    expect(ergebnis.assignments).toEqual({ [A1]: ANNA.id });
    expect(ergebnis.befunde.filter((b) => b.art === "sitz_mehrfach")).toEqual([]);
  });

  it("verwirft einen doppelt besetzten Platz vollständig — er bleibt leer", () => {
    const ergebnis = pruefeVorschlag(
      { zuordnungen: [z(A1, ANNA.id), z(A1, BEN.id)] },
      PLAN,
      ALLE,
      [],
    );
    // Weder Anna noch Ben: welcher gemeint war, steht nirgends.
    expect(ergebnis.assignments).toEqual({});
    expect(ergebnis.befunde).toContainEqual({
      art: "sitz_mehrfach",
      sitzId: A1,
      schuelerIds: [ANNA.id, BEN.id],
    });
  });

  it("verwirft einen Schüler, der auf zwei Plätzen sitzen soll, von beiden", () => {
    const ergebnis = pruefeVorschlag(
      { zuordnungen: [z(A1, ANNA.id), z(B1, ANNA.id)] },
      PLAN,
      ALLE,
      [],
    );
    expect(ergebnis.assignments).toEqual({});
    expect(ergebnis.befunde).toContainEqual({
      art: "schueler_mehrfach",
      schuelerId: ANNA.id,
      sitzIds: [A1, B1],
    });
  });

  it("lässt die übrigen Zuordnungen von einer Doppelbelegung unberührt", () => {
    const ergebnis = pruefeVorschlag(
      { zuordnungen: [z(A1, ANNA.id), z(A1, BEN.id), z(B1, CEM.id)] },
      PLAN,
      ALLE,
      [],
    );
    expect(ergebnis.assignments).toEqual({ [B1]: CEM.id });
  });
});

describe("pruefeVorschlag — vergessene Schüler", () => {
  it("benennt jeden Schüler ohne Platz, statt ihn nachzusetzen", () => {
    const ergebnis = pruefeVorschlag({ zuordnungen: [z(A1, ANNA.id)] }, PLAN, ALLE, []);
    const offen = ergebnis.befunde
      .filter((b) => b.art === "nicht_zugeordnet")
      .map((b) => (b.art === "nicht_zugeordnet" ? b.schuelerId : ""));
    expect(offen).toEqual([BEN.id, CEM.id, DANA.id]);
  });

  it("hält die Reihenfolge der Klassenliste ein, damit die Anzeige nicht springt", () => {
    const umgedreht = [...ALLE].reverse();
    const ergebnis = pruefeVorschlag({ zuordnungen: [] }, PLAN, umgedreht, []);
    const offen = ergebnis.befunde.map((b) => (b.art === "nicht_zugeordnet" ? b.schuelerId : ""));
    expect(offen).toEqual([DANA.id, CEM.id, BEN.id, ANNA.id]);
  });

  it("zählt auch einen Schüler mit, dessen Zuordnung gerade verworfen wurde", () => {
    const ergebnis = pruefeVorschlag({ zuordnungen: [z("kein-sitz", ANNA.id)] }, PLAN, [ANNA], []);
    expect(ergebnis.befunde).toContainEqual({ art: "nicht_zugeordnet", schuelerId: ANNA.id });
  });
});

describe("pruefeVorschlag — Regeln", () => {
  const nichtNeben: SeatRule = {
    id: "r1",
    classId: KLASSE,
    a: ANNA.id,
    b: BEN.id,
    kind: "nicht_neben",
  };

  it("meldet einen Regelverstoß, korrigiert ihn aber nicht", () => {
    const ergebnis = pruefeVorschlag({ zuordnungen: [z(A1, ANNA.id), z(A2, BEN.id)] }, PLAN, ALLE, [
      nichtNeben,
    ]);
    // Entscheidend: Der Vorschlag bleibt stehen, wie das Modell ihn meinte.
    expect(ergebnis.assignments).toEqual({ [A1]: ANNA.id, [A2]: BEN.id });
    expect(ergebnis.konflikte).toHaveLength(1);
    expect(ergebnis.konflikte[0]).toMatchObject({ regelId: "r1", kind: "nicht_neben" });
  });

  it("prüft die Regeln gegen den bereinigten Stand, nicht gegen die Rohantwort", () => {
    // Ben landet auf einem erfundenen Platz und fällt raus — damit sitzt er
    // nicht mehr neben Anna, und die Regel ist nicht verletzt.
    const ergebnis = pruefeVorschlag(
      { zuordnungen: [z(A1, ANNA.id), z("kein-sitz", BEN.id)] },
      PLAN,
      ALLE,
      [nichtNeben],
    );
    expect(ergebnis.konflikte).toEqual([]);
  });
});

describe("pruefeVorschlag — Begründungen", () => {
  it("behält nur Begründungen tatsächlich gesetzter Schüler", () => {
    const ergebnis = pruefeVorschlag(
      { zuordnungen: [z(A1, ANNA.id, "vorn wegen Sehschwäche"), z("kein-sitz", BEN.id, "egal")] },
      PLAN,
      ALLE,
      [],
    );
    expect(ergebnis.begruendungen).toEqual({ [ANNA.id]: "vorn wegen Sehschwäche" });
  });

  it("schneidet Leerraum ab und lässt leere Begründungen weg", () => {
    const ergebnis = pruefeVorschlag(
      { zuordnungen: [z(A1, ANNA.id, "  vorn  "), z(A2, BEN.id, "   ")] },
      PLAN,
      ALLE,
      [],
    );
    expect(ergebnis.begruendungen).toEqual({ [ANNA.id]: "vorn" });
  });
});

describe("pruefeVorschlag — kaputte Antworten", () => {
  it("verträgt eine leere Liste", () => {
    const ergebnis = pruefeVorschlag({ zuordnungen: [] }, PLAN, ALLE, []);
    expect(ergebnis.assignments).toEqual({});
    expect(ergebnis.befunde).toHaveLength(ALLE.length);
  });

  it("verträgt eine fehlende Liste, ohne zu werfen", () => {
    // Das Schema verlangt `zuordnungen`, aber ein Modell ist kein Compiler.
    const ergebnis = pruefeVorschlag({} as { zuordnungen: KiZuordnung[] }, PLAN, ALLE, []);
    expect(ergebnis.assignments).toEqual({});
  });
});

describe("befundZusammenfassung", () => {
  it("zählt statt aufzuzählen und unterscheidet Einzahl von Mehrzahl", () => {
    expect(
      befundZusammenfassung([
        { art: "unbekannter_sitz", sitzId: "x", schuelerId: "a" },
        { art: "nicht_zugeordnet", schuelerId: "b" },
        { art: "nicht_zugeordnet", schuelerId: "c" },
      ]),
    ).toEqual([
      "1 Zuordnung nannte einen Platz oder Schüler, den es nicht gibt — verworfen.",
      "2 Schüler ohne Platz.",
    ]);
  });

  it("schweigt bei einem sauberen Vorschlag", () => {
    expect(befundZusammenfassung([])).toEqual([]);
  });
});
