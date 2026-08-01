import { describe, expect, it } from "vitest";
import { RASTER_STANDARD, aufRasterPunkt, aufRasterRunden, rasterWeite } from "./raster";

describe("rasterWeite", () => {
  it("übernimmt die Rasterweite des Raums", () => {
    expect(rasterWeite(10)).toBe(10);
    expect(rasterWeite(5)).toBe(5);
  });

  it("fällt ohne Angabe auf die Standardweite zurück", () => {
    expect(rasterWeite(undefined)).toBe(RASTER_STANDARD);
    expect(rasterWeite(null)).toBe(RASTER_STANDARD);
    expect(rasterWeite()).toBe(RASTER_STANDARD);
  });

  it("fällt bei unbrauchbarer Angabe auf die Standardweite zurück", () => {
    // Ein Raster von 0 würde durch Null teilen; die Datenbank verlangt ohnehin
    // mindestens 5 cm (CHECK raster_cm >= 5).
    expect(rasterWeite(0)).toBe(RASTER_STANDARD);
    expect(rasterWeite(Number.NaN)).toBe(RASTER_STANDARD);
  });
});

describe("aufRasterRunden", () => {
  it("lässt Werte auf einer Rasterlinie unverändert", () => {
    expect(aufRasterRunden(0, 25)).toBe(0);
    expect(aufRasterRunden(75, 25)).toBe(75);
    expect(aufRasterRunden(-50, 25)).toBe(-50);
  });

  it("zieht Werte auf die nächstgelegene Rasterlinie", () => {
    expect(aufRasterRunden(24, 25)).toBe(25);
    expect(aufRasterRunden(11, 25)).toBe(0);
    expect(aufRasterRunden(137, 25)).toBe(125);
  });

  it("entscheidet genau zwischen zwei Rasterlinien zur größeren Zahl", () => {
    expect(aufRasterRunden(12.5, 25)).toBe(25);
    expect(aufRasterRunden(37.5, 25)).toBe(50);
    // Auch im Negativen wird zur größeren Zahl gerundet, nicht vom Null weg.
    expect(aufRasterRunden(-37.5, 25)).toBe(-25);
    expect(aufRasterRunden(-12.5, 25)).toBeCloseTo(0);
  });

  it("rundet negative Werte symmetrisch zum positiven Bereich", () => {
    expect(aufRasterRunden(-24, 25)).toBe(-25);
    expect(aufRasterRunden(-11, 25)).toBe(-0);
    expect(aufRasterRunden(-137, 25)).toBe(-125);
  });

  it("kommt mit einer Rasterweite zurecht, die den Wert nicht teilt", () => {
    expect(aufRasterRunden(10, 7)).toBe(7);
    expect(aufRasterRunden(11, 7)).toBe(14);
    expect(aufRasterRunden(100, 30)).toBe(90);
  });

  it("liefert immer ein Vielfaches der Rasterweite", () => {
    for (const wert of [0, 3, 12.5, 99, 137.4, -3, -12.5, -137.4, 1000.5]) {
      expect(Math.abs(aufRasterRunden(wert, 25) % 25)).toBe(0);
      expect(Math.abs(aufRasterRunden(wert, 7) % 7)).toBe(0);
    }
  });

  it("ändert einen bereits gerundeten Wert nicht noch einmal", () => {
    for (const wert of [0, 13, 12.5, -13, -12.5, 137.4]) {
      const einmal = aufRasterRunden(wert, 25);
      expect(aufRasterRunden(einmal, 25)).toBe(einmal);
    }
  });
});

describe("aufRasterPunkt", () => {
  it("rundet beide Achsen getrennt", () => {
    expect(aufRasterPunkt(24, 137, 25)).toEqual({ x: 25, y: 125 });
  });

  it("verschiebt ein Möbel höchstens um einen halben Rasterschritt", () => {
    const raster = 25;
    const punkte: [number, number][] = [
      [0, 0],
      [13, 61],
      [-13, -61],
      [199.9, 0.4],
    ];
    for (const [x, y] of punkte) {
      const p = aufRasterPunkt(x, y, raster);
      expect(Math.abs(p.x - x)).toBeLessThanOrEqual(raster / 2);
      expect(Math.abs(p.y - y)).toBeLessThanOrEqual(raster / 2);
    }
  });

  it("lässt einen Punkt auf dem Raster liegen, wo er ist", () => {
    expect(aufRasterPunkt(50, 75, 25)).toEqual({ x: 50, y: 75 });
  });
});
