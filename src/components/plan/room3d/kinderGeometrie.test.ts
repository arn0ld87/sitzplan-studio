import { describe, expect, it } from "vitest";
import { CM_PRO_EINHEIT, kindPlatzierung, cmZuEinheit, STUHL, KIND } from "./geometrie";

describe("kindPlatzierung", () => {
  it("sitzt auf der Sitzhöhe eines Einzeltisch-Stuhls", () => {
    const platz = kindPlatzierung("einzeltisch", 0);
    expect(platz).not.toBeNull();
    expect(platz!.position[1]).toBe(cmZuEinheit(STUHL.sitzhoehe));
  });

  it("schaut vom Tisch weg (positive Z-Richtung)", () => {
    const platz = kindPlatzierung("einzeltisch", 0);
    expect(platz).not.toBeNull();
    expect(platz!.drehung).toBe(0);
    expect(platz!.position[2]).toBeGreaterThan(0);
  });

  it("liefert für beide Doppeltisch-Stühle dieselbe relative Position", () => {
    const a = kindPlatzierung("doppeltisch", 0);
    const b = kindPlatzierung("doppeltisch", 1);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    // Die seitliche Verschiebung erfolgt durch die Stuhl-Gruppe, nicht hier.
    expect(a!.position[0]).toBe(0);
    expect(b!.position[0]).toBe(0);
    expect(a!.position[2]).toBeCloseTo(b!.position[2], 4);
  });

  it("liefert null für ein Möbelstück ohne Stühle", () => {
    expect(kindPlatzierung("tafel", 0)).toBeNull();
  });

  it("positioniert die Figur so, dass der untere Rumpf die Sitzfläche berührt", () => {
    const platz = kindPlatzierung("einzeltisch", 0);
    expect(platz).not.toBeNull();
    // Der Rumpfmittelpunkt liegt bei Y = Sitzhöhe + halbe Körperhöhe.
    const erwarteteMitte = cmZuEinheit(STUHL.sitzhoehe + KIND.koerperhoehe / 2);
    expect(platz!.position[1] + cmZuEinheit(KIND.koerperhoehe / 2)).toBe(erwarteteMitte);
  });
});
