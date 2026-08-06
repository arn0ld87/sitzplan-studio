import { describe, expect, it } from "vitest";
import {
  ausPlanDokument,
  ausRaumDokument,
  sitzplaetzeFuer,
  zuPlanDokument,
  zuRaumDokument,
  klasseZuRow,
  planZuRow,
  raumZuRow,
  regelZuRow,
  rowZuKlasse,
  rowZuPlan,
  rowZuRaum,
  rowZuRegel,
  schuelerZuRow,
} from "./mapping";
import {
  STUDENT_COLORS,
  makeFurniture,
  type Furniture,
  type Room,
  type SchoolClass,
  type SeatRule,
  type SeatingPlan,
} from "./types";

// Der erste Eintrag einer Liste, mit Abbruch statt stiller Weiterfahrt:
// fehlt er, ist die Testvorlage kaputt und nicht die geprüfte Funktion.
function erster<T>(xs: readonly T[], was: string): T {
  const x = xs[0];
  if (x === undefined) throw new Error(`Testvorlage ohne ${was}`);
  return x;
}

describe("sitzplaetzeFuer", () => {
  it("verteilt zwei Plätze gleichmäßig über die Tischbreite", () => {
    const tisch = makeFurniture("doppeltisch", 0, 0);
    const plaetze = sitzplaetzeFuer(tisch);
    expect(plaetze.map((p) => p.lokalX_cm)).toEqual([30, 90]);
    expect(plaetze.map((p) => p.lokalY_cm)).toEqual([25, 25]);
  });

  it("setzt den einzelnen Platz in die Mitte", () => {
    const plaetze = sitzplaetzeFuer(makeFurniture("einzeltisch", 0, 0));
    expect(plaetze).toHaveLength(1);
    expect(plaetze[0]).toMatchObject({ lokalX_cm: 30 });
  });

  it("gibt für Möbel ohne Sitzplätze eine leere Liste", () => {
    expect(sitzplaetzeFuer(makeFurniture("tafel", 0, 0))).toEqual([]);
    expect(sitzplaetzeFuer(makeFurniture("pult", 0, 0))).toEqual([]);
  });

  it("behält die Kennungen des Möbels bei und beschriftet fortlaufend", () => {
    const tisch = makeFurniture("doppeltisch", 0, 0);
    const plaetze = sitzplaetzeFuer(tisch);
    expect(plaetze.map((p) => p.id)).toEqual(tisch.seats);
    expect(plaetze.map((p) => p.objektId)).toEqual([tisch.id, tisch.id]);
    expect(plaetze.map((p) => p.bezeichnung)).toEqual(["Platz 1", "Platz 2"]);
  });
});

describe("Raumdokument — Hin- und Rückweg", () => {
  const möbel: Furniture[] = [
    { ...makeFurniture("doppeltisch", 100, 50), rotation: 90 },
    makeFurniture("einzeltisch", 300, 50),
    makeFurniture("pult", 0, 400),
    makeFurniture("tafel", 0, 0),
    makeFurniture("tuer", 500, 0),
    makeFurniture("fenster", 0, 200),
  ];

  it("überlebt den Weg durch die Datenbank unverändert", () => {
    expect(ausRaumDokument(zuRaumDokument(möbel))).toEqual(möbel);
  });

  it("schreibt die Maße aus der Möbelspezifikation ins Dokument", () => {
    const doc = zuRaumDokument([makeFurniture("doppeltisch", 10, 20)]);
    expect(doc.objekte[0]).toMatchObject({
      typ: "table_double",
      x_cm: 10,
      y_cm: 20,
      breite_cm: 120,
      tiefe_cm: 50,
      rotation_deg: 0,
    });
    expect(doc.sitzplaetze).toHaveLength(2);
  });

  it("ordnet Sitzplätze beim Zurücklesen dem richtigen Möbel zu", () => {
    const a = makeFurniture("doppeltisch", 0, 0);
    const b = makeFurniture("doppeltisch", 200, 0);
    const zurück = ausRaumDokument(zuRaumDokument([a, b]));
    expect(zurück[0]?.seats).toEqual(a.seats);
    expect(zurück[1]?.seats).toEqual(b.seats);
  });
});

describe("ausRaumDokument — beschädigte Eingaben", () => {
  it("gibt bei fehlendem oder unbrauchbarem Dokument eine leere Liste", () => {
    expect(ausRaumDokument(null)).toEqual([]);
    expect(ausRaumDokument(undefined)).toEqual([]);
    expect(ausRaumDokument({})).toEqual([]);
    expect(ausRaumDokument({ objekte: "kaputt" })).toEqual([]);
  });

  it("fällt bei unbekanntem Objekttyp auf den Einzeltisch zurück", () => {
    const f = erster(
      ausRaumDokument({
        objekte: [{ id: "x", typ: "beamer", x_cm: 0, y_cm: 0, rotation_deg: 0 }],
        sitzplaetze: [],
      }),
      "Möbel",
    );
    expect(f.kind).toBe("einzeltisch");
  });

  it("ersetzt eine unzulässige Drehung durch 0", () => {
    const f = erster(
      ausRaumDokument({
        objekte: [{ id: "x", typ: "table_single", x_cm: 0, y_cm: 0, rotation_deg: 45 }],
        sitzplaetze: [],
      }),
      "Möbel",
    );
    expect(f.rotation).toBe(0);
  });

  it("übernimmt gültige Drehungen", () => {
    const f = erster(
      ausRaumDokument({
        objekte: [{ id: "x", typ: "table_single", x_cm: 0, y_cm: 0, rotation_deg: 270 }],
        sitzplaetze: [],
      }),
      "Möbel",
    );
    expect(f.rotation).toBe(270);
  });

  it("macht aus fehlenden Koordinaten eine 0 statt NaN", () => {
    const f = erster(
      ausRaumDokument({
        objekte: [{ id: "x", typ: "table_single", rotation_deg: 0 }],
        sitzplaetze: [],
      }),
      "Möbel",
    );
    expect(f.x).toBe(0);
    expect(f.y).toBe(0);
  });
});

describe("Plandokument", () => {
  const tisch = makeFurniture("doppeltisch", 100, 100);
  const plan: SeatingPlan = {
    id: "plan-1",
    title: "Klassenarbeit",
    classId: "klasse-1",
    roomId: "raum-1",
    room: {
      name: "Raum 204",
      width: 800,
      height: 600,
      grid: 10,
      vorn: "rechts",
      furniture: [tisch],
    },
    status: "entwurf",
    updated: "2026-08-01T10:00:00Z",
    assignments: { [erster(tisch.seats, "Sitzplatz")]: "schueler-1" },
  };

  it("überträgt Geometrie und Zuordnungen ins Dokument", () => {
    const doc = zuPlanDokument(plan);
    expect(doc.quelle).toEqual({ klasseId: "klasse-1", raumId: "raum-1" });
    expect(doc.raumGeometrie).toMatchObject({ breiteCm: 800, laengeCm: 600, rasterCm: 10 });
    expect(doc.zuordnungen).toEqual([
      { sitzplatzId: erster(tisch.seats, "Sitzplatz"), schuelerId: "schueler-1" },
    ]);
  });

  it("stellt Geometrie und Zuordnungen unverändert wieder her", () => {
    const { room, assignments } = ausPlanDokument(zuPlanDokument(plan), "Raum 204");
    expect(room).toEqual(plan.room);
    expect(assignments).toEqual(plan.assignments);
  });

  it("liest Altdokumente ohne Vorn-Feld als „vorn = oben“", () => {
    const doc = zuPlanDokument(plan);
    const { vorn: _weg, ...altGeometrie } = doc.raumGeometrie;
    const { room } = ausPlanDokument({ ...doc, raumGeometrie: altGeometrie }, "Raum 204");
    expect(room.vorn).toBe("oben");
  });

  it("verwendet den übergebenen Raumnamen — der Plan trägt eine eingefrorene Kopie", () => {
    const { room } = ausPlanDokument(zuPlanDokument(plan), "Raum 204 (umbenannt)");
    expect(room.name).toBe("Raum 204 (umbenannt)");
  });
});

// Die Row-Mapper stehen zwischen Datenbank und Oberfläche. Ein Fehler hier
// verliert oder verfälscht Daten, die die Lehrkraft selbst eingegeben hat.

const NUTZER = "nutzer-1";

describe("klasseZuRow und rowZuKlasse", () => {
  const klasse: SchoolClass = {
    id: "k1",
    name: "5b",
    note: "Doppelstunde Dienstag",
    colorIndex: 2,
    createdAt: "2026-01-15T08:00:00Z",
    students: [
      {
        id: "s1",
        firstName: "Ada",
        lastName: "Lovelace",
        colorIndex: 0,
        merkmale: ["adhs", "sitzt ungern am Fenster"],
        notiz: "Absprache mit den Eltern vom 12.03.",
      },
      { id: "s2", firstName: "Cem", lastName: "Yildiz", colorIndex: 5, merkmale: [], notiz: "" },
    ],
  };

  it("führt Klasse und Schüler unverändert hin und zurück", () => {
    const row = klasseZuRow(klasse, NUTZER, null);
    const schuelerRows = klasse.students.map((s) => schuelerZuRow(s, klasse.id, NUTZER, null));
    expect(rowZuKlasse(row, schuelerRows, klasse.colorIndex)).toEqual(klasse);
  });

  it("speichert eine leere Notiz als NULL statt als leeren Text", () => {
    expect(klasseZuRow({ ...klasse, note: "" }, NUTZER, null).notizen).toBeNull();
  });

  it("macht aus einer fehlenden Notiz wieder einen leeren Text", () => {
    const row = { ...klasseZuRow(klasse, NUTZER, null), notizen: null };
    expect(rowZuKlasse(row, [], 0).note).toBe("");
  });

  it("reicht die Löschmarkierung durch", () => {
    expect(klasseZuRow(klasse, NUTZER, "2026-08-01T00:00:00Z").deleted_at).toBe(
      "2026-08-01T00:00:00Z",
    );
  });
});

describe("schuelerZuRow", () => {
  const ada = {
    id: "s1",
    firstName: "Ada",
    lastName: "Lovelace",
    colorIndex: 0,
    merkmale: [],
    notiz: "",
  };

  it("berechnet die Initialen für die Anzeige mit", () => {
    expect(schuelerZuRow(ada, "k1", NUTZER, null).initialen).toBe("AL");
  });

  it("weicht bei fehlendem Nachnamen auf den Vornamen aus", () => {
    const row = schuelerZuRow({ ...ada, firstName: "Bo", lastName: "" }, "k1", NUTZER, null);
    expect(row.initialen).toBe("B");
  });

  it("hält den Farbindex innerhalb der Palette — auch bei negativen Werten", () => {
    // Die Datenbank erwartet einen gültigen Palettenplatz; ein negativer
    // Index würde in der Oberfläche als fehlende Farbe auffallen.
    for (const index of [-9, -1, 0, 7, 8, 99]) {
      const row = schuelerZuRow({ ...ada, colorIndex: index }, "k1", NUTZER, null);
      expect(row.farb_index).toBeGreaterThanOrEqual(0);
      expect(row.farb_index).toBeLessThan(STUDENT_COLORS.length);
    }
  });

  it("ordnet den Schüler der übergebenen Klasse zu", () => {
    expect(schuelerZuRow(ada, "k7", NUTZER, null).klasse_id).toBe("k7");
  });

  it("entdoppelt und beschneidet die Merkmale vor dem Schreiben", () => {
    const row = schuelerZuRow(
      { ...ada, merkmale: ["adhs", " adhs ", "", "  ", "daz"] },
      "k1",
      NUTZER,
      null,
    );
    expect(row.merkmale).toEqual(["adhs", "daz"]);
  });

  it("schreibt eine fehlende Notiz als leeren Text, nicht als NULL", () => {
    // Anders als bei der Klassennotiz: `notiz` ist NOT NULL, und die Oberfläche
    // rechnet nie mit `null`.
    expect(schuelerZuRow(ada, "k1", NUTZER, null).notiz).toBe("");
  });
});

describe("Merkmale und Notiz beim Lesen einer Zeile", () => {
  // Diese Fälle entstehen nicht in dieser Anwendung, sondern kommen aus Zeilen
  // vor der Migration, aus einem zweiten Client oder aus einem Direktzugriff
  // auf die Datenbank. Sie dürfen die Oberfläche nicht zerlegen.
  const basis = {
    id: "s1",
    user_id: NUTZER,
    klasse_id: "k1",
    vorname: "Ada",
    nachname: "Lovelace",
    initialen: "AL",
    farb_index: 0,
    deleted_at: null,
  };
  const klasseRow = {
    id: "k1",
    user_id: NUTZER,
    name: "5b",
    notizen: null,
    created_at: "2026-01-15T08:00:00Z",
    deleted_at: null,
  };
  function ersterSchueler(schueler: Record<string, unknown>) {
    const s = rowZuKlasse(klasseRow, [schueler as never], 0).students[0];
    if (!s) throw new Error("rowZuKlasse hat den Schüler verschluckt");
    return s;
  }

  it("macht aus einer fehlenden Spalte eine leere Liste und einen leeren Text", () => {
    const s = ersterSchueler(basis);
    expect(s.merkmale).toEqual([]);
    expect(s.notiz).toBe("");
  });

  it("verträgt NULL in beiden Spalten", () => {
    const s = ersterSchueler({ ...basis, merkmale: null, notiz: null });
    expect(s.merkmale).toEqual([]);
    expect(s.notiz).toBe("");
  });

  it("wirft weg, was keine Zeichenkette ist, und behält den Rest", () => {
    const s = ersterSchueler({ ...basis, merkmale: ["adhs", 7, null, { a: 1 }, "daz"] });
    expect(s.merkmale).toEqual(["adhs", "daz"]);
  });

  it("entdoppelt und beschneidet auch beim Lesen", () => {
    const s = ersterSchueler({ ...basis, merkmale: [" adhs", "adhs ", "", "daz"] });
    expect(s.merkmale).toEqual(["adhs", "daz"]);
  });

  it("verträgt einen Wert, der gar keine Liste ist", () => {
    expect(ersterSchueler({ ...basis, merkmale: "adhs" }).merkmale).toEqual([]);
  });

  it("behält frei eingegebene Merkmale, die nicht im Katalog stehen", () => {
    const s = ersterSchueler({ ...basis, merkmale: ["adhs", "sitzt ungern am Fenster"] });
    expect(s.merkmale).toEqual(["adhs", "sitzt ungern am Fenster"]);
  });
});

describe("raumZuRow und rowZuRaum", () => {
  const raum: Room = {
    id: "r1",
    name: "Raum 204",
    width: 800,
    height: 600,
    grid: 10,
    vorn: "unten",
    furniture: [makeFurniture("doppeltisch", 100, 100), makeFurniture("tafel", 0, 0)],
    createdAt: "2026-01-15T08:00:00Z",
  };

  it("führt den Raum samt Möblierung unverändert hin und zurück", () => {
    expect(rowZuRaum(raumZuRow(raum, NUTZER, null))).toEqual(raum);
  });

  it("liest Altdokumente ohne Vorn-Feld als „vorn = oben“", () => {
    // Räume aus der Zeit vor dem Feld haben im canvas_document kein `vorn` —
    // sie verhielten sich immer so, als wäre vorn oben.
    const row = raumZuRow(raum, NUTZER, null);
    const { vorn: _weg, ...altDokument } = row.canvas_document;
    expect(rowZuRaum({ ...row, canvas_document: altDokument }).vorn).toBe("oben");
  });

  it("liest Maße auch dann als Zahl, wenn die Datenbank sie als Text liefert", () => {
    // Postgres gibt numeric über PostgREST als String zurück — ohne die
    // Umwandlung würde aus einer Breite von 800 der Text "800" und jede
    // Rechnung im Editor stillschweigend falsch.
    const row = raumZuRow(raum, NUTZER, null);
    const alsText = { ...row, breite_cm: "800", laenge_cm: "600", raster_cm: "10" } as never;
    expect(rowZuRaum(alsText)).toMatchObject({ width: 800, height: 600, grid: 10 });
  });
});

describe("planZuRow und rowZuPlan", () => {
  const tisch = makeFurniture("doppeltisch", 100, 100);
  const plan: SeatingPlan = {
    id: "p1",
    title: "Klassenarbeit",
    classId: "k1",
    roomId: "r1",
    room: {
      name: "Raum 204",
      width: 800,
      height: 600,
      grid: 10,
      vorn: "links",
      furniture: [tisch],
    },
    status: "aktiv",
    updated: "2026-08-01T10:00:00Z",
    assignments: { [erster(tisch.seats, "Sitzplatz")]: "s1" },
  };

  it("führt den Plan unverändert hin und zurück", () => {
    const row = { ...planZuRow(plan, NUTZER, null), updated_at: plan.updated };
    expect(rowZuPlan(row, "Raum 204")).toEqual(plan);
  });

  it("behält den Status bei", () => {
    expect(planZuRow({ ...plan, status: "archiv" }, NUTZER, null).status).toBe("archiv");
  });

  it("liefert auch ohne Zeitstempel der Datenbank ein gültiges Datum", () => {
    const row = planZuRow(plan, NUTZER, null);
    expect(() => new Date(rowZuPlan(row, "Raum 204").updated).toISOString()).not.toThrow();
  });
});

describe("regelZuRow und rowZuRegel", () => {
  const regeln: SeatRule[] = [
    { id: "re1", classId: "k1", a: "s1", b: "s2", kind: "nicht_neben" },
    { id: "re2", classId: "k1", a: "s3", b: "s4", kind: "muss_neben" },
  ];

  it.each(regeln)("führt die Regel '$kind' unverändert hin und zurück", (regel) => {
    expect(rowZuRegel(regelZuRow(regel, NUTZER, null))).toEqual(regel);
  });

  it("behält die Reihenfolge der beiden Schüler bei", () => {
    // Bei 'nicht_neben' ist die Richtung egal, bei der Anzeige nicht:
    // die Lehrkraft hat die Regel in einer bestimmten Reihenfolge angelegt.
    const row = regelZuRow(erster(regeln, "Regel"), NUTZER, null);
    expect([row.schueler_a, row.schueler_b]).toEqual(["s1", "s2"]);
  });
});
