import { describe, expect, it } from "vitest";
import { zeilenZuAppData, type Zeilen } from "./laden";
import { klasseZuRow, planZuRow, raumZuRow, regelZuRow, schuelerZuRow } from "./mapping";
import {
  makeFurniture,
  type Room,
  type SchoolClass,
  type SeatRule,
  type SeatingPlan,
} from "./types";

const NUTZER = "nutzer-1";
const GELOESCHT = "2026-07-01T09:00:00Z";
/** Vor der Klasse gegangen — der Unterschied entscheidet über das Zurückholen. */
const FRUEHER = "2026-06-01T09:00:00Z";

const ada = { id: "s1", firstName: "Ada", lastName: "Lovelace", colorIndex: 0 };
const cem = { id: "s2", firstName: "Cem", lastName: "Yildiz", colorIndex: 5 };

const klasse: SchoolClass = {
  id: "k1",
  name: "5b",
  note: "",
  colorIndex: 0,
  createdAt: "2026-01-15T08:00:00Z",
  students: [ada, cem],
};

const raum: Room = {
  id: "r1",
  name: "Raum 204",
  width: 800,
  height: 600,
  grid: 10,
  furniture: [makeFurniture("doppeltisch", 100, 100)],
  createdAt: "2026-01-15T08:00:00Z",
};

const plan: SeatingPlan = {
  id: "p1",
  title: "Klassenarbeit",
  classId: "k1",
  roomId: "r1",
  room: { name: "Raum 204", width: 800, height: 600, grid: 10, furniture: raum.furniture },
  status: "aktiv",
  updated: "2026-08-01T10:00:00Z",
  assignments: {},
};

const regel: SeatRule = { id: "re1", classId: "k1", a: "s1", b: "s2", kind: "nicht_neben" };

/** Ein vollständiger Datenbestand; jeder Test verschiebt daran genau eine Sache. */
function zeilen(ueberschreiben: Partial<Zeilen> = {}): Zeilen {
  return {
    klassen: [klasseZuRow(klasse, NUTZER, null)],
    schueler: klasse.students.map((s) => schuelerZuRow(s, klasse.id, NUTZER, null)),
    raeume: [raumZuRow(raum, NUTZER, null)],
    plaene: [planZuRow(plan, NUTZER, null)],
    regeln: [regelZuRow(regel, NUTZER, null)],
    ...ueberschreiben,
  };
}

describe("zeilenZuAppData", () => {
  it("übernimmt einen unversehrten Bestand vollständig", () => {
    const data = zeilenZuAppData(zeilen());
    expect(data.classes).toHaveLength(1);
    expect(data.rooms).toHaveLength(1);
    expect(data.plans).toHaveLength(1);
    expect(data.rules).toHaveLength(1);
    expect(data.trash).toEqual([]);
  });

  // Der Kern von Issue #2: Ein Schüler wird gelöscht, seine Zeile bleibt mit
  // `deleted_at` liegen. Ohne Filter zählt ihn jede Klassenliste mit, er steht
  // in Auswahlfeldern und lässt sich auf einen Sitzplan ziehen.
  it("lässt gelöschte Schüler aus der Klasse verschwinden", () => {
    const data = zeilenZuAppData(
      zeilen({
        schueler: [
          schuelerZuRow(ada, klasse.id, NUTZER, null),
          schuelerZuRow(cem, klasse.id, NUTZER, GELOESCHT),
        ],
      }),
    );
    const geladen = data.classes[0];
    expect(geladen?.students.map((s) => s.id)).toEqual(["s1"]);
  });

  it("behält im Papierkorb-Abbild die Schüler, die mit der Klasse gelöscht wurden", () => {
    // Wird eine Klasse gelöscht, bekommen alle ihre Schüler denselben
    // Zeitstempel. Würde der Soft-Delete-Filter hier stur greifen, käme die
    // Klasse leer zurück — der Papierkorb wäre wertlos.
    const data = zeilenZuAppData(
      zeilen({
        klassen: [klasseZuRow(klasse, NUTZER, GELOESCHT)],
        schueler: klasse.students.map((s) => schuelerZuRow(s, klasse.id, NUTZER, GELOESCHT)),
      }),
    );
    const eintrag = data.trash.find((t) => t.kind === "klasse");
    expect((eintrag?.payload as SchoolClass).students.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("lässt vorher einzeln gelöschte Schüler auch beim Wiederherstellen gelöscht", () => {
    // Cem ging vor der Klasse und trägt deshalb einen älteren Zeitstempel. Er
    // darf durch das Wiederherstellen nicht zurückkommen.
    const data = zeilenZuAppData(
      zeilen({
        klassen: [klasseZuRow(klasse, NUTZER, GELOESCHT)],
        schueler: [
          schuelerZuRow(ada, klasse.id, NUTZER, GELOESCHT),
          schuelerZuRow(cem, klasse.id, NUTZER, FRUEHER),
        ],
      }),
    );
    const eintrag = data.trash.find((t) => t.kind === "klasse");
    expect((eintrag?.payload as SchoolClass).students.map((s) => s.id)).toEqual(["s1"]);
  });

  it("räumt gelöschte Schüler aus den Sitzplätzen — kein besetzter, leerer Platz", () => {
    // Der Platz bliebe sonst als belegt gezählt, würde aber ohne Namen
    // gezeichnet: ein Sitzplan, der mehr Kinder behauptet, als da sind.
    const data = zeilenZuAppData(
      zeilen({
        schueler: [
          schuelerZuRow(ada, klasse.id, NUTZER, null),
          schuelerZuRow(cem, klasse.id, NUTZER, GELOESCHT),
        ],
        plaene: [
          planZuRow({ ...plan, assignments: { m1__sitz_0: "s1", m1__sitz_1: "s2" } }, NUTZER, null),
        ],
      }),
    );
    expect(data.plans[0]?.assignments).toEqual({ m1__sitz_0: "s1" });
  });

  it("ordnet Schüler ihrer eigenen Klasse zu", () => {
    const andere: SchoolClass = { ...klasse, id: "k2", name: "6a", students: [] };
    const data = zeilenZuAppData(
      zeilen({
        klassen: [klasseZuRow(klasse, NUTZER, null), klasseZuRow(andere, NUTZER, null)],
        schueler: [schuelerZuRow(ada, "k1", NUTZER, null), schuelerZuRow(cem, "k2", NUTZER, null)],
      }),
    );
    expect(data.classes.map((c) => c.students.map((s) => s.firstName))).toEqual([["Ada"], ["Cem"]]);
  });

  it("nimmt gelöschte Klassen, Räume und Pläne aus den Listen und legt sie in den Papierkorb", () => {
    const data = zeilenZuAppData({
      klassen: [klasseZuRow(klasse, NUTZER, "2026-07-01T09:00:00Z")],
      schueler: [],
      raeume: [raumZuRow(raum, NUTZER, "2026-07-03T09:00:00Z")],
      plaene: [planZuRow(plan, NUTZER, "2026-07-02T09:00:00Z")],
      regeln: [regelZuRow(regel, NUTZER, GELOESCHT)],
    });
    expect(data.classes).toEqual([]);
    expect(data.rooms).toEqual([]);
    expect(data.plans).toEqual([]);
    expect(data.rules).toEqual([]);
    expect(data.trash.map((t) => t.kind)).toEqual(["raum", "sitzplan", "klasse"]);
  });

  it("sortiert den Papierkorb mit dem zuletzt Gelöschten zuoberst", () => {
    const data = zeilenZuAppData({
      klassen: [klasseZuRow(klasse, NUTZER, "2026-07-01T09:00:00Z")],
      schueler: [],
      raeume: [raumZuRow(raum, NUTZER, "2026-07-09T09:00:00Z")],
      plaene: [],
      regeln: [],
    });
    expect(data.trash.map((t) => t.deletedAt)).toEqual([
      "2026-07-09T09:00:00Z",
      "2026-07-01T09:00:00Z",
    ]);
  });

  it("führt gelöschte Sitzregeln nicht mit — der Papierkorb kennt sie nicht", () => {
    const data = zeilenZuAppData(zeilen({ regeln: [regelZuRow(regel, NUTZER, GELOESCHT)] }));
    expect(data.rules).toEqual([]);
    expect(data.trash).toEqual([]);
  });

  it("kommt mit einem leeren Bestand zurecht", () => {
    const data = zeilenZuAppData({
      klassen: [],
      schueler: [],
      raeume: [],
      plaene: [],
      regeln: [],
    });
    expect(data).toMatchObject({ classes: [], rooms: [], plans: [], rules: [], trash: [] });
  });
});
