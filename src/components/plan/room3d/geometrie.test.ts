import { describe, expect, it } from "vitest";
import { FURNITURE_SPECS, makeFurniture, type Furniture, type FurnitureKind } from "@/data/types";
import {
  CM_PRO_EINHEIT,
  MOEBEL_AUFBAU,
  RAUMHOEHE_CM,
  STUHL,
  WANDSEITEN,
  abstandsgrenzen,
  cmZuEinheit,
  draufsichtKamera,
  drehungZuRadiant,
  einheitZuCm,
  gedrehteGrundflaeche,
  moebelPlatzierung,
  raumMasse,
  startKamera,
  stuhlPlatzierung,
  wandDeckkraft,
  wandPlatzierung,
  wandVerdeckt,
} from "./geometrie";

const RAUM = { width: 800, height: 600 };

/** Möbelstück an fester Stelle — `makeFurniture` vergibt echte Kennungen. */
function moebel(kind: FurnitureKind, x: number, y: number, rotation: Furniture["rotation"] = 0) {
  return { ...makeFurniture(kind, x, y), rotation };
}

const ALLE_ARTEN = Object.keys(FURNITURE_SPECS) as FurnitureKind[];
const ALLE_DREHUNGEN: Furniture["rotation"][] = [0, 90, 180, 270];

describe("cmZuEinheit", () => {
  it("rechnet 100 cm in eine Welteinheit um", () => {
    expect(cmZuEinheit(100)).toBe(1);
    expect(cmZuEinheit(0)).toBe(0);
    expect(cmZuEinheit(250)).toBe(2.5);
    expect(CM_PRO_EINHEIT).toBe(100);
  });

  it("behält das Vorzeichen", () => {
    expect(cmZuEinheit(-75)).toBe(-0.75);
  });

  it("ist die Umkehrung von einheitZuCm", () => {
    for (const cm of [0, 15, 60, 137.5, 800, -240]) {
      expect(einheitZuCm(cmZuEinheit(cm))).toBeCloseTo(cm, 10);
    }
  });
});

describe("drehungZuRadiant", () => {
  it("bildet die vier erlaubten Drehungen ab", () => {
    expect(drehungZuRadiant(0)).toBe(-0);
    expect(drehungZuRadiant(90)).toBeCloseTo(-Math.PI / 2);
    expect(drehungZuRadiant(180)).toBeCloseTo(-Math.PI);
    expect(drehungZuRadiant(270)).toBeCloseTo(-(3 * Math.PI) / 2);
  });

  it("dreht die Szene genau so, wie das SVG das Bild dreht", () => {
    // Ein Punkt im lokalen Möbelsystem, einmal über die SVG-Drehung und einmal
    // über die Y-Drehung der Szene geführt. Beide Wege müssen denselben Punkt
    // treffen, sonst stehen 2D und 3D bei 90°/270° quer zueinander.
    const punkte: [number, number][] = [
      [1, 0],
      [0, 1],
      [30, -12],
      [-7.5, 4.25],
    ];
    for (const grad of ALLE_DREHUNGEN) {
      const a = (grad * Math.PI) / 180;
      const theta = drehungZuRadiant(grad);
      for (const [x, y] of punkte) {
        // SVG: rotate(a) im Uhrzeigersinn, danach 2D-x → 3D-X und 2D-y → 3D-Z.
        const svgX = x * Math.cos(a) - y * Math.sin(a);
        const svgY = x * Math.sin(a) + y * Math.cos(a);
        // Szene: erst abbilden, dann um die Y-Achse drehen.
        const szeneX = x * Math.cos(theta) + y * Math.sin(theta);
        const szeneZ = -x * Math.sin(theta) + y * Math.cos(theta);
        expect(szeneX).toBeCloseTo(svgX, 10);
        expect(szeneZ).toBeCloseTo(svgY, 10);
      }
    }
  });
});

describe("moebelPlatzierung", () => {
  it("setzt den Mittelpunkt des Möbels an den Mittelpunkt seiner Grundfläche", () => {
    // Einzeltisch 60 × 50 cm bei (100, 200) im Raum 800 × 600.
    // Mitte im Grundriss: (130, 225) → bezogen auf die Raummitte (400, 300):
    // (−270, −75) cm → (−2.7, −0.75) Einheiten.
    const p = moebelPlatzierung(moebel("einzeltisch", 100, 200), RAUM);
    expect(p.position[0]).toBeCloseTo(-2.7);
    expect(p.position[2]).toBeCloseTo(-0.75);
  });

  it("legt den Ursprung in die Raummitte", () => {
    const spec = FURNITURE_SPECS.einzeltisch;
    const mittig = moebel("einzeltisch", RAUM.width / 2 - spec.w / 2, RAUM.height / 2 - spec.h / 2);
    const p = moebelPlatzierung(mittig, RAUM);
    expect(p.position[0]).toBeCloseTo(0);
    expect(p.position[2]).toBeCloseTo(0);
  });

  it("bildet die obere Grundrisskante auf negatives Z ab", () => {
    // Die Tafel steht üblicherweise oben im Grundriss; dort muss sie in der
    // Szene hinten liegen, sonst blickt die Startkamera auf die falsche Wand.
    const oben = moebelPlatzierung(moebel("tafel", 200, 0), RAUM);
    const unten = moebelPlatzierung(moebel("tafel", 200, RAUM.height - 15), RAUM);
    expect(oben.position[2]).toBeLessThan(0);
    expect(unten.position[2]).toBeGreaterThan(0);
  });

  it("lässt die Position von der Drehung unberührt", () => {
    // Im SVG dreht `rotate()` um (w/2, h/2) — der Mittelpunkt bleibt liegen.
    const ohne = moebelPlatzierung(moebel("doppeltisch", 150, 275), RAUM);
    for (const grad of ALLE_DREHUNGEN) {
      const p = moebelPlatzierung(moebel("doppeltisch", 150, 275, grad), RAUM);
      expect(p.position).toEqual(ohne.position);
    }
  });

  it("stellt jedes Möbel mit seiner Unterkante auf den vorgesehenen Sockel", () => {
    for (const kind of ALLE_ARTEN) {
      const p = moebelPlatzierung(moebel(kind, 0, 0), RAUM);
      expect(p.position[1]).toBeCloseTo(cmZuEinheit(MOEBEL_AUFBAU[kind].sockel));
    }
  });

  it("übernimmt Breite und Tiefe unverändert aus den Möbelmaßen", () => {
    for (const kind of ALLE_ARTEN) {
      const spec = FURNITURE_SPECS[kind];
      const p = moebelPlatzierung(moebel(kind, 0, 0), RAUM);
      expect(einheitZuCm(p.masse.breite)).toBeCloseTo(spec.w);
      expect(einheitZuCm(p.masse.tiefe)).toBeCloseTo(spec.h);
      expect(einheitZuCm(p.masse.hoehe)).toBeCloseTo(MOEBEL_AUFBAU[kind].hoehe);
    }
  });

  it("hält jedes Möbel innerhalb der Raumhöhe", () => {
    for (const kind of ALLE_ARTEN) {
      const aufbau = MOEBEL_AUFBAU[kind];
      expect(aufbau.sockel + aufbau.hoehe).toBeLessThanOrEqual(RAUMHOEHE_CM);
    }
  });
});

describe("gedrehteGrundflaeche", () => {
  it("lässt Breite und Tiefe bei 0° und 180° stehen", () => {
    // Doppeltisch 120 × 50 cm.
    for (const grad of [0, 180] as const) {
      const g = gedrehteGrundflaeche(moebel("doppeltisch", 0, 0, grad));
      expect(einheitZuCm(g.breite)).toBeCloseTo(120);
      expect(einheitZuCm(g.tiefe)).toBeCloseTo(50);
    }
  });

  it("tauscht Breite und Tiefe bei 90° und 270°", () => {
    for (const grad of [90, 270] as const) {
      const g = gedrehteGrundflaeche(moebel("doppeltisch", 0, 0, grad));
      expect(einheitZuCm(g.breite)).toBeCloseTo(50);
      expect(einheitZuCm(g.tiefe)).toBeCloseTo(120);
    }
  });

  it("erhält die Grundfläche über alle Drehungen", () => {
    for (const kind of ALLE_ARTEN) {
      const spec = FURNITURE_SPECS[kind];
      for (const grad of ALLE_DREHUNGEN) {
        const g = gedrehteGrundflaeche(moebel(kind, 0, 0, grad));
        expect(einheitZuCm(g.breite) * einheitZuCm(g.tiefe)).toBeCloseTo(spec.w * spec.h, 6);
      }
    }
  });

  it("beschreibt ein hochkant gedrehtes Fenster als schmal und tief", () => {
    // Fenster 15 × 180 cm liegt ungedreht an einer senkrechten Wand.
    const laengs = gedrehteGrundflaeche(moebel("fenster", 0, 0, 90));
    expect(einheitZuCm(laengs.breite)).toBeCloseTo(180);
    expect(einheitZuCm(laengs.tiefe)).toBeCloseTo(15);
  });
});

describe("stuhlPlatzierung", () => {
  it("setzt den einzelnen Stuhl mittig hinter den Einzeltisch", () => {
    const s = stuhlPlatzierung("einzeltisch", 0);
    expect(s).not.toBeNull();
    expect(s?.position[0]).toBeCloseTo(0);
    // Tischtiefe 50 cm → Kante bei 25 cm, plus Abstand und halbe Stuhltiefe.
    expect(einheitZuCm(s?.position[2] ?? 0)).toBeCloseTo(25 + STUHL.abstand + STUHL.tiefe / 2);
  });

  it("verteilt die beiden Stühle des Doppeltischs seitengleich", () => {
    const links = stuhlPlatzierung("doppeltisch", 0);
    const rechts = stuhlPlatzierung("doppeltisch", 1);
    // Doppeltisch 120 cm breit, Sitzplätze bei 25 % und 75 %: ∓30 cm zur Mitte.
    expect(einheitZuCm(links?.position[0] ?? 0)).toBeCloseTo(-30);
    expect(einheitZuCm(rechts?.position[0] ?? 0)).toBeCloseTo(30);
    expect(links?.position[2]).toBeCloseTo(rechts?.position[2] ?? 0);
  });

  it("steht vor der Tischkante, nicht unter der Tischplatte", () => {
    for (const kind of ["einzeltisch", "doppeltisch"] as const) {
      const spec = FURNITURE_SPECS[kind];
      const s = stuhlPlatzierung(kind, 0);
      const vorderkante = einheitZuCm(s?.position[2] ?? 0) - STUHL.tiefe / 2;
      expect(vorderkante).toBeGreaterThanOrEqual(spec.h / 2);
    }
  });

  it("liefert nichts für Möbel und Ränge ohne Sitzplatz", () => {
    expect(stuhlPlatzierung("tafel", 0)).toBeNull();
    expect(stuhlPlatzierung("pult", 0)).toBeNull();
    expect(stuhlPlatzierung("einzeltisch", 1)).toBeNull();
    expect(stuhlPlatzierung("doppeltisch", 2)).toBeNull();
  });

  it("liefert für jede Möbelart genau so viele Stühle wie Sitzplätze", () => {
    for (const kind of ALLE_ARTEN) {
      const anzahl = FURNITURE_SPECS[kind].seats;
      for (let i = 0; i < anzahl; i++) expect(stuhlPlatzierung(kind, i)).not.toBeNull();
      expect(stuhlPlatzierung(kind, anzahl)).toBeNull();
    }
  });
});

describe("raumMasse", () => {
  it("rechnet die Raumkanten in Welteinheiten um", () => {
    expect(raumMasse(RAUM)).toEqual({ breite: 8, tiefe: 6, hoehe: RAUMHOEHE_CM / 100 });
  });
});

describe("startKamera", () => {
  it("blickt von der Tafelwand weg auf die Raummitte", () => {
    const k = startKamera(RAUM);
    // Die Tafel liegt bei negativem Z, die Kamera muss also von +Z kommen.
    expect(k.position[2]).toBeGreaterThan(0);
    expect(k.position[1]).toBeGreaterThan(0);
    expect(k.ziel[0]).toBe(0);
    expect(k.ziel[2]).toBe(0);
  });

  it("rückt bei größeren Räumen weiter ab", () => {
    const klein = startKamera({ width: 400, height: 400 });
    const gross = startKamera({ width: 1600, height: 1200 });
    const laenge = (p: [number, number, number]) => Math.hypot(p[0], p[1], p[2]);
    expect(laenge(gross.position)).toBeGreaterThan(laenge(klein.position));
  });

  it("richtet sich nach der längeren Raumkante", () => {
    expect(startKamera({ width: 900, height: 400 })).toEqual(
      startKamera({ width: 400, height: 900 }),
    );
  });

  it("bleibt bei fehlendem vorn wie bisher von +Z ausgerichtet", () => {
    const k = startKamera({ width: 800, height: 600 });
    expect(k.position[2]).toBeGreaterThan(0);
  });

  it.each([
    ["oben", "z", 1] as const,
    ["unten", "z", -1] as const,
    ["links", "x", 1] as const,
    ["rechts", "x", -1] as const,
  ])("blickt bei vorn=%s längs der %s-Achse in Richtung %i", (vorn, achse, vorzeichen) => {
    const k = startKamera({ width: 800, height: 600, vorn });
    const [x, , z] = k.position;
    // Die Hauptkomponente (lang) liegt in der Achse der Vorn-Richtung,
    // die Nebenkomponente (quer) in der jeweils anderen Horizontalachse.
    if (achse === "z") {
      expect(Math.abs(z)).toBeGreaterThan(Math.abs(x));
      expect(Math.sign(z)).toBe(vorzeichen);
    } else {
      expect(Math.abs(x)).toBeGreaterThan(Math.abs(z));
      expect(Math.sign(x)).toBe(vorzeichen);
    }
  });

  it("behält Höhe und Blickziel über alle vier Ausrichtungen bei", () => {
    const varianten = (["oben", "rechts", "unten", "links"] as const).map((vorn) =>
      startKamera({ width: 800, height: 600, vorn }),
    );
    expect(varianten.every((k) => k.position[1] === varianten[0]!.position[1])).toBe(true);
    expect(varianten.every((k) => k.ziel[0] === 0 && k.ziel[2] === 0)).toBe(true);
  });
});

describe("draufsichtKamera", () => {
  it("steht senkrecht über der Raummitte", () => {
    const k = draufsichtKamera(RAUM);
    expect(k.position[0]).toBe(0);
    expect(k.position[1]).toBeGreaterThan(raumMasse(RAUM).hoehe);
    expect(k.ziel).toEqual([0, 0, 0]);
  });

  it("weicht der unbestimmten Kameraausrichtung mit einem Restversatz aus", () => {
    // Genau senkrecht wäre die Blickrichtung parallel zum Oben-Vektor.
    expect(draufsichtKamera(RAUM).position[2]).not.toBe(0);
  });
});

describe("abstandsgrenzen", () => {
  it("lässt die Kamera weder in den Raum stürzen noch ihn verlieren", () => {
    const g = abstandsgrenzen(RAUM);
    expect(g.min).toBeGreaterThan(0);
    expect(g.max).toBeGreaterThan(g.min);
    const start = startKamera(RAUM).position;
    const abstand = Math.hypot(start[0], start[1], start[2]);
    expect(abstand).toBeGreaterThanOrEqual(g.min);
    expect(abstand).toBeLessThanOrEqual(g.max);
  });

  it("hält auch in einem sehr kleinen Raum einen Mindestabstand", () => {
    expect(abstandsgrenzen({ width: 200, height: 200 }).min).toBeGreaterThanOrEqual(0.8);
  });
});

describe("wandVerdeckt", () => {
  it("blendet nur die Wand aus, hinter der die Kamera steht", () => {
    // Kamera südöstlich außerhalb: Süd- und Ostwand verdecken den Blick.
    const kamera = { x: 10, z: 10 };
    expect(wandVerdeckt("sued", kamera, RAUM)).toBe(true);
    expect(wandVerdeckt("ost", kamera, RAUM)).toBe(true);
    expect(wandVerdeckt("nord", kamera, RAUM)).toBe(false);
    expect(wandVerdeckt("west", kamera, RAUM)).toBe(false);
  });

  it("lässt bei einer Kamera im Raum alle Wände stehen", () => {
    for (const seite of WANDSEITEN) {
      expect(wandVerdeckt(seite, { x: 0, z: 0 }, RAUM)).toBe(false);
    }
  });

  it("blendet aus jeder Position höchstens zwei Wände aus", () => {
    const positionen = [
      { x: 0, z: 12 },
      { x: -12, z: 12 },
      { x: 12, z: -12 },
      { x: -12, z: 0 },
      { x: 3.9, z: 2.9 },
    ];
    for (const kamera of positionen) {
      const ausgeblendet = WANDSEITEN.filter((s) => wandVerdeckt(s, kamera, RAUM));
      expect(ausgeblendet.length).toBeLessThanOrEqual(2);
    }
  });

  it("liefert für die Startkamera eine freie Sicht auf die Tafelwand", () => {
    const [x, , z] = startKamera(RAUM).position;
    expect(wandVerdeckt("nord", { x, z }, RAUM)).toBe(false);
  });
});

describe("wandDeckkraft", () => {
  it("zeigt sichtbare Wände voll und verdeckende nur als Andeutung", () => {
    expect(wandDeckkraft("nord", { x: 0, z: 10 }, RAUM)).toBe(1);
    const verdeckt = wandDeckkraft("sued", { x: 0, z: 10 }, RAUM);
    expect(verdeckt).toBeGreaterThan(0);
    expect(verdeckt).toBeLessThan(0.2);
  });
});

describe("wandPlatzierung", () => {
  it("stellt jede Wand außen an ihre Raumkante", () => {
    const { breite, tiefe } = raumMasse(RAUM);
    expect(wandPlatzierung("nord", RAUM).position[2]).toBeLessThan(-tiefe / 2);
    expect(wandPlatzierung("sued", RAUM).position[2]).toBeGreaterThan(tiefe / 2);
    expect(wandPlatzierung("west", RAUM).position[0]).toBeLessThan(-breite / 2);
    expect(wandPlatzierung("ost", RAUM).position[0]).toBeGreaterThan(breite / 2);
  });

  it("gibt den Längswänden die Raumbreite und den Querwänden die Raumtiefe", () => {
    const { breite, tiefe } = raumMasse(RAUM);
    expect(wandPlatzierung("nord", RAUM).laenge).toBe(breite);
    expect(wandPlatzierung("sued", RAUM).laenge).toBe(breite);
    expect(wandPlatzierung("west", RAUM).laenge).toBe(tiefe);
    expect(wandPlatzierung("ost", RAUM).laenge).toBe(tiefe);
  });

  it("stellt jede Wand mittig auf halber Raumhöhe", () => {
    const { hoehe } = raumMasse(RAUM);
    for (const seite of WANDSEITEN) {
      expect(wandPlatzierung(seite, RAUM).position[1]).toBeCloseTo(hoehe / 2);
    }
  });

  it("dreht die Seitenwände quer zu den Stirnwänden", () => {
    expect(wandPlatzierung("nord", RAUM).drehung).toBe(0);
    expect(wandPlatzierung("west", RAUM).drehung).toBeCloseTo(Math.PI / 2);
  });
});
