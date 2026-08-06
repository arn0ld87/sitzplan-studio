import { describe, expect, it } from "vitest";
import { nachVornOben } from "./ausrichtung";
import { vornSeite, VORN_SEITEN } from "./types";

// Testraum: 800 cm breit, 600 cm tief. Die Tafel hängt als Referenzpunkt
// jeweils mittig an der Vorn-Kante — nach der Drehung muss sie immer bei
// kleinem y liegen, denn genau das verspricht der KI-Prompt dem Modell.
const B = 800;
const L = 600;

describe("nachVornOben", () => {
  it("lässt bei vorn=oben alles unverändert", () => {
    const welt = nachVornOben(B, L, "oben");
    expect(welt.breiteCm).toBe(B);
    expect(welt.laengeCm).toBe(L);
    expect(welt.punkt(120, 450)).toEqual({ x: 120, y: 450 });
  });

  it("dreht bei vorn=unten um 180 Grad", () => {
    const welt = nachVornOben(B, L, "unten");
    expect(welt.breiteCm).toBe(B);
    expect(welt.laengeCm).toBe(L);
    // Tafel mittig an der unteren Kante → mittig oben.
    expect(welt.punkt(B / 2, L)).toEqual({ x: B / 2, y: 0 });
    expect(welt.punkt(0, 0)).toEqual({ x: B, y: L });
  });

  it("macht bei vorn=links die linke Kante zur oberen und tauscht die Maße", () => {
    const welt = nachVornOben(B, L, "links");
    expect(welt.breiteCm).toBe(L);
    expect(welt.laengeCm).toBe(B);
    // Tafel mittig an der linken Kante → mittig oben.
    expect(welt.punkt(0, L / 2)).toEqual({ x: L / 2, y: 0 });
  });

  it("macht bei vorn=rechts die rechte Kante zur oberen und tauscht die Maße", () => {
    const welt = nachVornOben(B, L, "rechts");
    expect(welt.breiteCm).toBe(L);
    expect(welt.laengeCm).toBe(B);
    // Tafel mittig an der rechten Kante → mittig oben.
    expect(welt.punkt(B, L / 2)).toEqual({ x: L / 2, y: 0 });
  });

  it("bildet jeden Punkt des Raums wieder in den gedrehten Raum ab", () => {
    // Kein Punkt darf aus dem Grundriss herausfallen — sonst bekäme das
    // Modell Koordinaten außerhalb des beschriebenen Raums.
    const ecken: [number, number][] = [
      [0, 0],
      [B, 0],
      [0, L],
      [B, L],
      [B / 2, L / 2],
    ];
    for (const seite of VORN_SEITEN) {
      const welt = nachVornOben(B, L, seite);
      for (const [x, y] of ecken) {
        const p = welt.punkt(x, y);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(welt.breiteCm);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(welt.laengeCm);
      }
    }
  });

  it("dreht echt und spiegelt nicht — Links/Rechts-Verhältnisse bleiben", () => {
    // Kreuzprodukt zweier Kantenvektoren: Bei einer Drehung behält es sein
    // Vorzeichen, bei einer Spiegelung kippte es. Eine gespiegelte Welt
    // vertauschte Sitznachbarn seitenverkehrt.
    const a: [number, number] = [100, 100];
    const b: [number, number] = [300, 100];
    const c: [number, number] = [100, 400];
    for (const seite of VORN_SEITEN) {
      const welt = nachVornOben(B, L, seite);
      const pa = welt.punkt(...a);
      const pb = welt.punkt(...b);
      const pc = welt.punkt(...c);
      const kreuz = (pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x);
      expect(kreuz).toBeGreaterThan(0);
    }
  });

  it("erhält Abstände zwischen Punkten", () => {
    const abstand = (p: { x: number; y: number }, q: { x: number; y: number }) =>
      Math.hypot(p.x - q.x, p.y - q.y);
    for (const seite of VORN_SEITEN) {
      const welt = nachVornOben(B, L, seite);
      const p = welt.punkt(120, 80);
      const q = welt.punkt(560, 470);
      expect(abstand(p, q)).toBeCloseTo(Math.hypot(560 - 120, 470 - 80), 10);
    }
  });
});

describe("vornSeite", () => {
  it("lässt gültige Werte durch", () => {
    for (const seite of VORN_SEITEN) expect(vornSeite(seite)).toBe(seite);
  });

  it("fällt bei allem anderen auf „oben“ zurück", () => {
    // Altbestand ohne Feld und kaputte Fremdwerte verhalten sich wie bisher.
    expect(vornSeite(undefined)).toBe("oben");
    expect(vornSeite(null)).toBe("oben");
    expect(vornSeite("vorne")).toBe("oben");
    expect(vornSeite(90)).toBe("oben");
    expect(vornSeite({})).toBe("oben");
  });
});
