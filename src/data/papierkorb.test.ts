// Prüft die Regel aus docs/decisions/0004-soft-delete-und-papierkorb.md:
// „Jede Leseabfrage auf Nutzdaten enthält `deleted_at IS NULL`."
//
// Weder Datenbank noch Typsystem erzwingen sie. Was ein vergessener Filter
// kostet, merkt die Lehrkraft erst vor der Klasse: ein gelöschter Schüler steht
// im Sitzplan. Diese Datei ist der Ersatz für den fehlenden Zwang — je Entität
// ein Nachweis, dass Gelöschtes aus Listen, Zählern und Auswahlfeldern
// verschwindet und über den Papierkorb zurückkehrt.

import { describe, expect, it } from "vitest";
import {
  klasseZuRow,
  planZuRow,
  raumZuRow,
  regelZuRow,
  rowZuKlasse,
  rowZuRegel,
  schuelerZuRow,
  type SchuelerRow,
} from "./mapping";
import {
  aktiveSchuelerDerKlasse,
  aktiveZuweisungen,
  anzahlAktiverSchueler,
  geloescht,
  istAktiv,
  istGeloescht,
  nurAktive,
  nurGeloeschte,
  wiederhergestellt,
  type SoftDeleteRow,
} from "./papierkorb";
import {
  makeFurniture,
  seatId,
  type Room,
  type SchoolClass,
  type SeatRule,
  type SeatingPlan,
  type Student,
} from "./types";

const NUTZER = "11111111-1111-4111-8111-111111111111";
const KLASSE_ID = "22222222-2222-4222-8222-222222222222";
const GELOESCHT_AM = "2026-08-01T10:00:00.000Z";

function schueler(
  id: string,
  vorname: string,
  nachname: string,
  farbe: number,
  merkmale: string[] = [],
  notiz = "",
): Student {
  return { id, firstName: vorname, lastName: nachname, colorIndex: farbe, merkmale, notiz };
}

// Anna trägt Merkmale und eine Notiz. Damit prüft jede Rundreise durch den
// Papierkorb mit, ob die Felder das Löschen und Zurückholen überstehen — die
// Nutzlast einer gelöschten Klasse trägt ihre Schüler vollständig mit sich.
const ANNA = schueler("s-anna", "Anna", "Berg", 0, ["adhs", "eigenes Merkmal"], "sitzt gern vorn");
const BEN = schueler("s-ben", "Ben", "Cordes", 1);
const CLARA = schueler("s-clara", "Clara", "Dietz", 2);

const KLASSE: SchoolClass = {
  id: KLASSE_ID,
  name: "7b",
  note: "Doppelstunde Deutsch",
  colorIndex: 3,
  students: [ANNA, BEN, CLARA],
  createdAt: "2026-07-01T08:00:00.000Z",
};

const TISCH = makeFurniture("doppeltisch", 100, 100);
const PLATZ_LINKS = seatId(TISCH.id, 1);
const PLATZ_RECHTS = seatId(TISCH.id, 2);

const RAUM: Room = {
  id: "r-101",
  name: "Raum 101",
  width: 800,
  height: 600,
  grid: 10,
  furniture: [TISCH],
  createdAt: "2026-07-02T08:00:00.000Z",
};

const PLAN: SeatingPlan = {
  id: "p-1",
  title: "7b im Raum 101",
  classId: KLASSE_ID,
  roomId: RAUM.id,
  room: {
    name: RAUM.name,
    width: RAUM.width,
    height: RAUM.height,
    grid: RAUM.grid,
    furniture: [TISCH],
  },
  status: "aktiv",
  updated: "2026-07-20T08:00:00.000Z",
  assignments: { [PLATZ_LINKS]: ANNA.id, [PLATZ_RECHTS]: BEN.id },
};

const REGEL: SeatRule = {
  id: "regel-1",
  classId: KLASSE_ID,
  a: ANNA.id,
  b: BEN.id,
  kind: "nicht_neben",
};

/** Alle fünf Nutzdatentabellen in einer Liste — ein Test statt fünf Kopien. */
const NUTZDATEN: { tabelle: string; zeile: () => SoftDeleteRow }[] = [
  { tabelle: "Klassen", zeile: () => klasseZuRow(KLASSE, NUTZER, null) },
  { tabelle: "Räume", zeile: () => raumZuRow(RAUM, NUTZER, null) },
  { tabelle: "Schüler", zeile: () => schuelerZuRow(ANNA, KLASSE_ID, NUTZER, null) },
  { tabelle: "Sitzpläne", zeile: () => planZuRow(PLAN, NUTZER, null) },
  { tabelle: "Sitzregeln", zeile: () => regelZuRow(REGEL, NUTZER, null) },
];

describe("Soft-Delete-Filter über alle Nutzdatentabellen", () => {
  it.each(NUTZDATEN)("$tabelle: eine frisch angelegte Zeile gilt als aktiv", ({ zeile }) => {
    const row = zeile();
    expect(row.deleted_at).toBeNull();
    expect(istAktiv(row)).toBe(true);
    expect(istGeloescht(row)).toBe(false);
  });

  it.each(NUTZDATEN)("$tabelle: eine gelöschte Zeile verschwindet aus der Liste", ({ zeile }) => {
    const aktiv = zeile();
    const weg = geloescht({ ...zeile(), id: `${aktiv.id}-weg` }, GELOESCHT_AM);

    expect(nurAktive([aktiv, weg]).map((r) => r.id)).toEqual([aktiv.id]);
  });

  it.each(NUTZDATEN)("$tabelle: eine gelöschte Zeile steht im Papierkorb", ({ zeile }) => {
    const aktiv = zeile();
    const weg = geloescht({ ...zeile(), id: `${aktiv.id}-weg` }, GELOESCHT_AM);

    expect(nurGeloeschte([aktiv, weg]).map((r) => r.id)).toEqual([weg.id]);
    expect(weg.deleted_at).toBe(GELOESCHT_AM);
  });

  it.each(NUTZDATEN)("$tabelle: Zähler ignorieren gelöschte Zeilen", ({ zeile }) => {
    const aktiv = zeile();
    const weg = geloescht({ ...zeile(), id: `${aktiv.id}-weg` }, GELOESCHT_AM);

    expect(nurAktive([aktiv, weg])).toHaveLength(1);
  });

  it.each(NUTZDATEN)(
    "$tabelle: Rundlauf — löschen, prüfen, wiederherstellen, prüfen",
    ({ zeile }) => {
      const original = zeile();
      expect(nurAktive([original])).toHaveLength(1);

      const weg = geloescht(original, GELOESCHT_AM);
      expect(nurAktive([weg])).toHaveLength(0);
      expect(nurGeloeschte([weg])).toHaveLength(1);

      const zurueck = wiederhergestellt(weg);
      expect(nurAktive([zurueck])).toHaveLength(1);
      expect(nurGeloeschte([zurueck])).toHaveLength(0);
      expect(zurueck).toEqual(original);
    },
  );
});

describe("Löschen und Wiederherstellen als reine Umformung", () => {
  it("lässt die übrigen Felder der Zeile unangetastet", () => {
    const row = klasseZuRow(KLASSE, NUTZER, null);
    const weg = geloescht(row, GELOESCHT_AM);

    expect({ ...weg, deleted_at: null }).toEqual(row);
  });

  it("behält beim zweiten Löschen den ersten Zeitstempel", () => {
    const row = raumZuRow(RAUM, NUTZER, null);
    const weg = geloescht(row, GELOESCHT_AM);
    const nochmal = geloescht(weg, "2026-08-02T12:00:00.000Z");

    expect(nochmal.deleted_at).toBe(GELOESCHT_AM);
  });

  it("verändert die übergebene Zeile nicht", () => {
    const row = regelZuRow(REGEL, NUTZER, null);
    geloescht(row, GELOESCHT_AM);

    expect(row.deleted_at).toBeNull();
  });
});

describe("Klassenliste und Schülerzähler", () => {
  const alleSchueler: SchuelerRow[] = [
    schuelerZuRow(ANNA, KLASSE_ID, NUTZER, null),
    schuelerZuRow(BEN, KLASSE_ID, NUTZER, GELOESCHT_AM),
    schuelerZuRow(CLARA, KLASSE_ID, NUTZER, null),
    schuelerZuRow(schueler("s-fremd", "Dora", "Ernst", 4), "andere-klasse", NUTZER, null),
  ];

  it("führt einen gelöschten Schüler nicht in der Klasse", () => {
    const namen = aktiveSchuelerDerKlasse(alleSchueler, KLASSE_ID).map((s) => s.vorname);

    expect(namen).toEqual(["Anna", "Clara"]);
  });

  it("zählt nur die Schüler, die die Lehrkraft auch sieht", () => {
    expect(anzahlAktiverSchueler(alleSchueler, KLASSE_ID)).toBe(2);
  });

  it("nimmt einen wiederhergestellten Schüler wieder in die Klasse auf", () => {
    const zurueck = alleSchueler.map((s) => (s.id === BEN.id ? wiederhergestellt(s) : s));

    expect(anzahlAktiverSchueler(zurueck, KLASSE_ID)).toBe(3);
    expect(aktiveSchuelerDerKlasse(zurueck, KLASSE_ID).map((s) => s.vorname)).toEqual([
      "Anna",
      "Ben",
      "Clara",
    ]);
  });

  it("trennt die Klassen — ein Schüler einer anderen Klasse zählt nicht mit", () => {
    expect(anzahlAktiverSchueler(alleSchueler, "andere-klasse")).toBe(1);
  });

  it("stellt einer Auswahlliste nur aktive Schüler bereit", () => {
    const auswahl = aktiveSchuelerDerKlasse(alleSchueler, KLASSE_ID).map((s) => s.id);

    expect(auswahl).not.toContain(BEN.id);
  });
});

describe("Sitzplan mit gelöschtem Schüler", () => {
  const alleSchueler: SchuelerRow[] = [
    schuelerZuRow(ANNA, KLASSE_ID, NUTZER, null),
    schuelerZuRow(BEN, KLASSE_ID, NUTZER, GELOESCHT_AM),
  ];

  it("blendet den Platz eines gelöschten Schülers aus", () => {
    const aktiv = aktiveSchuelerDerKlasse(alleSchueler, KLASSE_ID);
    const sichtbar = aktiveZuweisungen(PLAN.assignments, aktiv);

    expect(sichtbar).toEqual({ [PLATZ_LINKS]: ANNA.id });
  });

  it("zählt einen gelöschten Schüler in keinem Sitzplan-Zähler mit", () => {
    const aktiv = aktiveSchuelerDerKlasse(alleSchueler, KLASSE_ID);
    const belegt = Object.keys(aktiveZuweisungen(PLAN.assignments, aktiv)).length;

    expect(belegt).toBe(1);
  });

  it("gibt einem wiederhergestellten Schüler seinen Platz zurück", () => {
    const zurueck = alleSchueler.map(wiederhergestellt);
    const sichtbar = aktiveZuweisungen(PLAN.assignments, zurueck);

    expect(sichtbar).toEqual(PLAN.assignments);
  });

  it("lässt die gespeicherte Zuweisung unangetastet", () => {
    aktiveZuweisungen(PLAN.assignments, []);

    expect(PLAN.assignments[PLATZ_RECHTS]).toBe(BEN.id);
  });
});

describe("Sitzregeln eines gelöschten Schülers", () => {
  it("behält die Regel als Zeile, damit sie den Rundlauf übersteht", () => {
    const row = regelZuRow(REGEL, NUTZER, null);
    const zurueck = wiederhergestellt(geloescht(row, GELOESCHT_AM));

    expect(rowZuRegel(zurueck)).toEqual(REGEL);
  });

  it("lässt eine gelöschte Regel nicht in die Regelliste", () => {
    const aktiv = regelZuRow(REGEL, NUTZER, null);
    const weg = regelZuRow({ ...REGEL, id: "regel-2", b: CLARA.id }, NUTZER, GELOESCHT_AM);

    expect(nurAktive([aktiv, weg]).map(rowZuRegel)).toEqual([REGEL]);
  });
});

describe("Lesepfad im Store — offene Mängel", () => {
  const alleSchueler: SchuelerRow[] = [
    schuelerZuRow(ANNA, KLASSE_ID, NUTZER, null),
    schuelerZuRow(BEN, KLASSE_ID, NUTZER, GELOESCHT_AM),
  ];

  // Mangel: ladeDaten in src/store/app.tsx übergibt die Schülerzeilen
  // ungefiltert an rowZuKlasse (`schueler.filter((x) => x.klasse_id === row.id)`).
  // Klassen, Räume, Pläne und Regeln werden dort auf `!row.deleted_at` gefiltert,
  // Schüler nicht. Ein gelöschter Schüler landet damit in `class.students` und
  // von dort in Zählern, Auswahlfeldern und Sitzplänen — genau der Fall, den
  // ADR-0004 ausschließt. Der Test bleibt rot, bis der Filter dort steht;
  // repariert wird er nicht in dieser Datei.
  it.fails("führt einen gelöschten Schüler nicht in der geladenen Klasse", () => {
    const klasse = rowZuKlasse(
      klasseZuRow(KLASSE, NUTZER, null),
      alleSchueler.filter((s) => s.klasse_id === KLASSE_ID),
      0,
    );

    expect(klasse.students.map((s) => s.id)).toEqual([ANNA.id]);
  });

  it("wäre mit aktiveSchuelerDerKlasse als Filter behoben", () => {
    const klasse = rowZuKlasse(
      klasseZuRow(KLASSE, NUTZER, null),
      aktiveSchuelerDerKlasse(alleSchueler, KLASSE_ID),
      0,
    );

    expect(klasse.students.map((s) => s.id)).toEqual([ANNA.id]);
  });

  // Mangel: TrashKind in src/data/types.ts kennt nur "klasse" | "raum" |
  // "sitzplan". Gelöschte Schüler und Sitzregeln werden beim Laden zwar
  // ausgeblendet, tauchen aber in keinem Papierkorb auf und sind damit nicht
  // wiederherstellbar. Das widerspricht ADR-0004 („Der Papierkorb zeigt, was
  // einen Zeitstempel trägt, und stellt es wieder her").
  it.todo("zeigt einen gelöschten Schüler im Papierkorb");
  it.todo("zeigt eine gelöschte Sitzregel im Papierkorb");
});
