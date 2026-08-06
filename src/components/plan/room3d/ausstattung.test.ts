import { describe, expect, it } from "vitest";
import { makeFurniture, type RoomGeometry } from "@/data/types";
import { ausstattungPlatzierungen, naechsteWand, wandFreieAbschnitte } from "./ausstattung";

function raumMit(furniture: RoomGeometry["furniture"]): RoomGeometry {
  return { name: "Test", width: 900, height: 700, grid: 25, vorn: "oben", furniture };
}

function moebel(kind: Parameters<typeof makeFurniture>[0], x: number, y: number) {
  return { ...makeFurniture(kind, x, y) };
}

describe("naechsteWand", () => {
  it("ordnet eine Tafel an der oberen Kante der Nordwand zu", () => {
    expect(naechsteWand(moebel("tafel", 250, 0), raumMit([]))).toBe("nord");
  });
  it("ordnet ein Fenster an der linken Kante der Westwand zu", () => {
    expect(naechsteWand(moebel("fenster", 0, 200), raumMit([]))).toBe("west");
  });
});

describe("wandFreieAbschnitte", () => {
  it("liefert die ganze Wand, wenn nichts an ihr steht", () => {
    expect(wandFreieAbschnitte(raumMit([]), "sued")).toEqual([{ von: 0, bis: 900 }]);
  });
  it("schneidet eine Tür aus der Südwand aus", () => {
    const tuer = moebel("tuer", 400, 680); // 90 cm breit, an der unteren Kante
    const frei = wandFreieAbschnitte(raumMit([tuer]), "sued");
    expect(frei).toEqual([
      { von: 0, bis: 400 },
      { von: 490, bis: 900 },
    ]);
  });
  it("ignoriert Möbel, die weiter als 40 cm von der Wand stehen", () => {
    const pultMitte = moebel("pult", 300, 300);
    expect(wandFreieAbschnitte(raumMit([pultMitte]), "nord")).toEqual([{ von: 0, bis: 900 }]);
  });
});

describe("ausstattungPlatzierungen", () => {
  it("hängt die Uhr mittig über die Tafel", () => {
    const tafel = moebel("tafel", 250, 0); // 400 breit → Mitte bei x=450
    const uhr = ausstattungPlatzierungen(raumMit([tafel])).find((p) => p.art === "uhr");
    expect(uhr).toMatchObject({ xCm: 450, zCm: 255 });
  });
  it("lässt Schwamm und Kreide ohne Tafel weg", () => {
    const arten = ausstattungPlatzierungen(raumMit([])).map((p) => p.art);
    expect(arten).not.toContain("schwamm");
    expect(arten).not.toContain("kreide");
  });
  it("stellt die Pflanze in die türfernste Ecke", () => {
    const tuer = moebel("tuer", 0, 680); // unten links
    const pflanze = ausstattungPlatzierungen(raumMit([tuer])).find((p) => p.art === "pflanze");
    expect(pflanze).toMatchObject({ xCm: 865, yCm: 35 }); // oben rechts
  });
  it("enthält keine Großmöbel-Deko mehr — Schrank und Regal sind jetzt platzierbar", () => {
    const arten = ausstattungPlatzierungen(raumMit([])).map((p) => p.art);
    expect(arten).not.toContain("schrankDeko");
    expect(arten).not.toContain("regalDeko");
  });

  it("setzt kein Poster auf einen Wandabschnitt, den ein echter Schrank belegt", () => {
    // Tafel an der Nordwand schließt Poster dort aus.
    const tafel = moebel("tafel", 250, 0);
    // Schrank mittig an der Südwand — ohne die WANDGEBUNDEN-Erweiterung würde
    // das erste Poster auf der Südwand bei x≈450 (im belegten Intervall) landen.
    const schrank = moebel("schrank", 390, 650);
    const poster = ausstattungPlatzierungen(raumMit([tafel, schrank])).filter(
      (p) => p.art === "poster",
    );
    expect(poster.length).toBeGreaterThan(0);
    expect(poster.some((p) => p.yCm > 600 && p.xCm >= 390 && p.xCm <= 510)).toBe(false);
  });
  it("erzeugt für jedes Fenster einen Topf", () => {
    const raum = raumMit([moebel("fenster", 0, 100), moebel("fenster", 0, 400)]);
    const toepfe = ausstattungPlatzierungen(raum).filter((p) => p.art === "fensterTopf");
    expect(toepfe).toHaveLength(2);
  });
  it("legt bei 900×700 ein 3×2-Leuchtenraster an", () => {
    const leuchten = ausstattungPlatzierungen(raumMit([])).filter((p) => p.art === "leuchte");
    expect(leuchten).toHaveLength(6);
    expect(leuchten[0]).toMatchObject({ xCm: 150, yCm: 175, zCm: 293 });
  });
  it("liefert immer vier Deckenkanten", () => {
    const kanten = ausstattungPlatzierungen(raumMit([])).filter((p) => p.art === "deckenkante");
    expect(kanten).toHaveLength(4);
  });

  // Zusatztests (Review-Finding): Bodenstehende Deko darf nicht mit Möbeln oder
  // bereits platzierter Boden-Deko kollidieren.
  it("lässt den Papierkorb weg, wenn neben dem Pult ein Tisch steht", () => {
    const pult = moebel("pult", 100, 100); // 160×80, rechte Kante bei x=260
    // Papierkorb-Position ohne Blockade wäre (285, 140) — Tisch stellt sich genau
    // darüber (spannt x:[270,330], y:[115,165], enthält die 28×28-Fläche voll).
    const tisch = moebel("einzeltisch", 270, 115);
    const arten = ausstattungPlatzierungen(raumMit([pult, tisch])).map((p) => p.art);
    expect(arten).not.toContain("papierkorb");
  });
  it("lässt den Papierkorb weg, wenn das Pult an der Ostwand steht", () => {
    // Rechte Pult-Kante bei x=900: die 28×28-Fläche um (925, 340) ragt aus dem Raum.
    const pult = moebel("pult", 740, 300);
    const arten = ausstattungPlatzierungen(raumMit([pult])).map((p) => p.art);
    expect(arten).not.toContain("papierkorb");
  });
  it("weicht mit der Pflanze in die nächstbeste Ecke aus, wenn die türfernste belegt ist", () => {
    const tuer = moebel("tuer", 0, 680); // unten links — türfernste Ecke ist oben rechts (865, 35)
    // Tisch überlappt die 40×40-Fläche um (865,35): spannt x:[845,905], y:[15,65].
    const tisch = moebel("einzeltisch", 845, 15);
    const pflanze = ausstattungPlatzierungen(raumMit([tuer, tisch])).find(
      (p) => p.art === "pflanze",
    );
    expect(pflanze).toBeDefined();
    expect(pflanze).not.toMatchObject({ xCm: 865, yCm: 35 });
    // Nächstbeste Ecke nach Türferne (nach der belegten (865,35)) ist (865,665).
    expect(pflanze).toMatchObject({ xCm: 865, yCm: 665 });
  });
});
