import { describe, expect, it } from "vitest";
import {
  nachbarplaetze,
  platzVonSchueler,
  pruefeSitzregeln,
  sindBenachbart,
  type PlanAusschnitt,
} from "./sitzregeln";
import { makeFurniture, type Furniture, type RuleKind, type SeatRule } from "./types";

const KLASSE = "klasse-7b";

// Ein Sitzplatz eines Möbelstücks, mit Abbruch statt stiller Weiterfahrt:
// fehlt er, ist die Testvorlage kaputt und nicht die geprüfte Funktion.
function sitz(moebel: Furniture, n: number): string {
  const s = moebel.seats[n - 1];
  if (!s) throw new Error(`Möbelstück ${moebel.kind} hat keinen Sitzplatz ${n}`);
  return s;
}

function regel(kind: RuleKind, a: string, b: string, id = `regel-${kind}-${a}-${b}`): SeatRule {
  return { id, classId: KLASSE, a, b, kind };
}

/**
 * Zwei Doppeltische und ein Einzeltisch. Damit lassen sich Nachbarschaft,
 * Distanz und Einzelplatz ohne Nachbarn in einem Raum abbilden.
 */
function raumMitZweiDoppeltischen() {
  const linksT = makeFurniture("doppeltisch", 0, 0);
  const rechtsT = makeFurniture("doppeltisch", 200, 0);
  const einzelT = makeFurniture("einzeltisch", 0, 200);
  return {
    room: {
      name: "7b",
      width: 600,
      height: 400,
      grid: 10,
      vorn: "oben" as const,
      furniture: [linksT, rechtsT, einzelT],
    },
    linksA: sitz(linksT, 1),
    linksB: sitz(linksT, 2),
    rechtsA: sitz(rechtsT, 1),
    rechtsB: sitz(rechtsT, 2),
    einzel: sitz(einzelT, 1),
  };
}

function plan(
  vorlage: ReturnType<typeof raumMitZweiDoppeltischen>,
  assignments: Record<string, string>,
): PlanAusschnitt {
  return { classId: KLASSE, room: vorlage.room, assignments };
}

describe("platzVonSchueler", () => {
  it("dreht die Zuordnung Sitzplatz zu Schüler um", () => {
    expect(platzVonSchueler({ tisch__sitz_1: "ada", tisch__sitz_2: "bo" })).toEqual({
      ada: "tisch__sitz_1",
      bo: "tisch__sitz_2",
    });
  });

  it("gibt für einen Plan ohne Zuweisungen eine leere Zuordnung", () => {
    expect(platzVonSchueler({})).toEqual({});
  });

  it("behält bei doppelt gesetztem Schüler den zuletzt eingetragenen Platz", () => {
    // Datenlage, die es nicht geben sollte — festgehalten wird der Ist-Zustand.
    expect(platzVonSchueler({ a__sitz_1: "ada", b__sitz_1: "ada" })).toEqual({
      ada: "b__sitz_1",
    });
  });
});

describe("nachbarplaetze", () => {
  it("nennt am Doppeltisch den zweiten Platz als Nachbarn", () => {
    const v = raumMitZweiDoppeltischen();
    expect(nachbarplaetze(v.room, v.linksA)).toEqual([v.linksB]);
  });

  it("lässt einen Einzeltisch ohne Nachbarn", () => {
    const v = raumMitZweiDoppeltischen();
    expect(nachbarplaetze(v.room, v.einzel)).toEqual([]);
  });

  it("meldet für einen Platz, den es im Raum nicht gibt, keine Nachbarn", () => {
    const v = raumMitZweiDoppeltischen();
    expect(nachbarplaetze(v.room, "geloeschtes-moebel__sitz_1")).toEqual([]);
  });

  it("kommt mit einem Raum ohne Möbel zurecht", () => {
    expect(nachbarplaetze({ furniture: [] }, "irgendein__sitz_1")).toEqual([]);
  });
});

describe("sindBenachbart", () => {
  it("erkennt zwei Plätze am selben Doppeltisch als benachbart", () => {
    const v = raumMitZweiDoppeltischen();
    expect(sindBenachbart(v.room, v.linksA, v.linksB)).toBe(true);
  });

  it("sieht Plätze an verschiedenen Tischen nicht als benachbart", () => {
    const v = raumMitZweiDoppeltischen();
    expect(sindBenachbart(v.room, v.linksA, v.rechtsA)).toBe(false);
  });

  it("hält einen Platz nicht für seinen eigenen Nachbarn", () => {
    const v = raumMitZweiDoppeltischen();
    expect(sindBenachbart(v.room, v.linksA, v.linksA)).toBe(false);
  });
});

describe("Sitzregel nicht_neben", () => {
  it("meldet einen Konflikt, wenn beide am selben Doppeltisch sitzen", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "ada", [v.linksB]: "bo" });
    const konflikte = pruefeSitzregeln(p, [regel("nicht_neben", "ada", "bo")]);
    expect(konflikte).toEqual([
      {
        regelId: "regel-nicht_neben-ada-bo",
        kind: "nicht_neben",
        a: "ada",
        b: "bo",
        sitzA: v.linksA,
        sitzB: v.linksB,
      },
    ]);
  });

  it("schweigt, wenn beide an verschiedenen Tischen sitzen", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "ada", [v.rechtsA]: "bo" });
    expect(pruefeSitzregeln(p, [regel("nicht_neben", "ada", "bo")])).toEqual([]);
  });

  it("meldet den Konflikt auch, wenn die Regel in umgekehrter Reihenfolge steht", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "ada", [v.linksB]: "bo" });
    const konflikte = pruefeSitzregeln(p, [regel("nicht_neben", "bo", "ada")]);
    expect(konflikte).toHaveLength(1);
    expect(konflikte[0]).toMatchObject({ a: "bo", b: "ada", sitzA: v.linksB, sitzB: v.linksA });
  });
});

describe("Sitzregel muss_neben", () => {
  it("meldet einen Konflikt, wenn die beiden an verschiedenen Tischen sitzen", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "ada", [v.rechtsA]: "bo" });
    const konflikte = pruefeSitzregeln(p, [regel("muss_neben", "ada", "bo")]);
    expect(konflikte).toEqual([
      {
        regelId: "regel-muss_neben-ada-bo",
        kind: "muss_neben",
        a: "ada",
        b: "bo",
        sitzA: v.linksA,
        sitzB: v.rechtsA,
      },
    ]);
  });

  it("schweigt, wenn beide am selben Doppeltisch sitzen", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "ada", [v.linksB]: "bo" });
    expect(pruefeSitzregeln(p, [regel("muss_neben", "ada", "bo")])).toEqual([]);
  });

  it("bleibt verletzt, solange einer der beiden am Einzeltisch sitzt", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.einzel]: "ada", [v.linksA]: "bo" });
    expect(pruefeSitzregeln(p, [regel("muss_neben", "ada", "bo")])).toHaveLength(1);
  });
});

describe("Mehrere Sitzregeln gleichzeitig", () => {
  it("meldet jede verletzte Regel einzeln und in Eingabereihenfolge", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, {
      [v.linksA]: "ada",
      [v.linksB]: "bo",
      [v.rechtsA]: "cem",
      [v.rechtsB]: "dana",
    });
    const konflikte = pruefeSitzregeln(p, [
      regel("nicht_neben", "ada", "bo"),
      regel("muss_neben", "ada", "cem"),
      regel("nicht_neben", "cem", "dana"),
    ]);
    expect(konflikte.map((k) => k.regelId)).toEqual([
      "regel-nicht_neben-ada-bo",
      "regel-muss_neben-ada-cem",
      "regel-nicht_neben-cem-dana",
    ]);
  });

  it("führt erfüllte und verletzte Regeln nebeneinander sauber", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "ada", [v.linksB]: "bo", [v.rechtsA]: "cem" });
    const konflikte = pruefeSitzregeln(p, [
      regel("muss_neben", "ada", "bo"), // erfüllt
      regel("nicht_neben", "ada", "cem"), // erfüllt
      regel("muss_neben", "bo", "cem"), // verletzt
    ]);
    expect(konflikte.map((k) => k.regelId)).toEqual(["regel-muss_neben-bo-cem"]);
  });

  it("wertet Regeln fremder Klassen nicht aus", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "ada", [v.linksB]: "bo" });
    const fremd: SeatRule = { ...regel("nicht_neben", "ada", "bo"), classId: "klasse-9a" };
    expect(pruefeSitzregeln(p, [fremd])).toEqual([]);
  });
});

describe("Einander widersprechende Sitzregeln", () => {
  // Die Anwendung verhindert beim Anlegen nur ein zweites Mal dasselbe Paar in
  // derselben Ansicht; über getrennte Wege kann ein Widerspruch entstehen.
  // Aufgelöst wird er nicht — jede Regel wird für sich bewertet, also ist
  // immer genau eine der beiden verletzt.
  it("meldet bei nebeneinander sitzenden Schülern nur die nicht_neben-Regel", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "ada", [v.linksB]: "bo" });
    const konflikte = pruefeSitzregeln(p, [
      regel("nicht_neben", "ada", "bo", "regel-verbot"),
      regel("muss_neben", "ada", "bo", "regel-gebot"),
    ]);
    expect(konflikte.map((k) => k.regelId)).toEqual(["regel-verbot"]);
  });

  it("meldet bei getrennt sitzenden Schülern nur die muss_neben-Regel", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "ada", [v.rechtsA]: "bo" });
    const konflikte = pruefeSitzregeln(p, [
      regel("nicht_neben", "ada", "bo", "regel-verbot"),
      regel("muss_neben", "ada", "bo", "regel-gebot"),
    ]);
    expect(konflikte.map((k) => k.regelId)).toEqual(["regel-gebot"]);
  });

  it("lässt einen Widerspruch niemals beide Regeln zugleich melden", () => {
    const v = raumMitZweiDoppeltischen();
    const nebeneinander = plan(v, { [v.linksA]: "ada", [v.linksB]: "bo" });
    const getrennt = plan(v, { [v.linksA]: "ada", [v.rechtsA]: "bo" });
    const paar = [regel("nicht_neben", "ada", "bo", "v"), regel("muss_neben", "ada", "bo", "g")];
    expect(pruefeSitzregeln(nebeneinander, paar)).toHaveLength(1);
    expect(pruefeSitzregeln(getrennt, paar)).toHaveLength(1);
  });
});

describe("Sitzregeln auf nicht gesetzte oder entfernte Schüler", () => {
  it("überspringt eine Regel, deren erster Schüler keinen Platz hat", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksB]: "bo" });
    expect(pruefeSitzregeln(p, [regel("muss_neben", "ada", "bo")])).toEqual([]);
  });

  it("überspringt eine Regel, deren zweiter Schüler keinen Platz hat", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "ada" });
    expect(pruefeSitzregeln(p, [regel("nicht_neben", "ada", "bo")])).toEqual([]);
  });

  it("stürzt bei einer Regel auf zwei aus der Klasse entfernte Schüler nicht ab", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "cem", [v.linksB]: "dana" });
    expect(pruefeSitzregeln(p, [regel("nicht_neben", "geloescht-1", "geloescht-2")])).toEqual([]);
  });

  it("wertet die übrigen Regeln weiter aus, wenn eine ins Leere zeigt", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "ada", [v.linksB]: "bo" });
    const konflikte = pruefeSitzregeln(p, [
      regel("muss_neben", "ada", "entfernt"),
      regel("nicht_neben", "ada", "bo"),
    ]);
    expect(konflikte.map((k) => k.regelId)).toEqual(["regel-nicht_neben-ada-bo"]);
  });

  it("behandelt einen Platz, dessen Möbelstück fehlt, als ohne Nachbarn", () => {
    // Der Sitzplatz stammt aus einem Möbelstück, das später entfernt wurde.
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { verwaist__sitz_1: "ada", [v.linksA]: "bo" });
    expect(pruefeSitzregeln(p, [regel("muss_neben", "ada", "bo")])).toHaveLength(1);
    expect(pruefeSitzregeln(p, [regel("nicht_neben", "ada", "bo")])).toEqual([]);
  });
});

describe("Randfälle des Plans", () => {
  it("meldet für einen Plan ohne Regeln keinen Konflikt", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, { [v.linksA]: "ada", [v.linksB]: "bo" });
    expect(pruefeSitzregeln(p, [])).toEqual([]);
  });

  it("meldet für einen Plan ohne Sitzverteilung keinen Konflikt", () => {
    const v = raumMitZweiDoppeltischen();
    const p = plan(v, {});
    expect(
      pruefeSitzregeln(p, [regel("nicht_neben", "ada", "bo"), regel("muss_neben", "cem", "dana")]),
    ).toEqual([]);
  });

  it("meldet für einen leeren Raum ohne Möbel und ohne Schüler keinen Konflikt", () => {
    const leer: PlanAusschnitt = {
      classId: KLASSE,
      room: { name: "leer", width: 400, height: 300, grid: 10, vorn: "oben", furniture: [] },
      assignments: {},
    };
    expect(leer.room.furniture).toHaveLength(0);
    expect(pruefeSitzregeln(leer, [regel("muss_neben", "ada", "bo")])).toEqual([]);
  });

  it("lässt die Sitzverteilung des Plans unverändert", () => {
    const v = raumMitZweiDoppeltischen();
    const assignments = { [v.linksA]: "ada", [v.linksB]: "bo" };
    const p = plan(v, assignments);
    pruefeSitzregeln(p, [regel("nicht_neben", "ada", "bo")]);
    expect(p.assignments).toEqual(assignments);
  });
});
