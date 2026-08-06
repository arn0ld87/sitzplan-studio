import { describe, expect, it } from "vitest";
import { baueOberteilCache } from "./kinderBausatz";

describe("baueOberteilCache", () => {
  it("vergibt für jeden Farbindex genau ein Material", () => {
    const cache = baueOberteilCache(4);
    const m1 = cache.oberteilFuer(0);
    const m2 = cache.oberteilFuer(0);
    expect(m1).toBe(m2);
    const m3 = cache.oberteilFuer(1);
    expect(m1).not.toBe(m3);
  });

  it("verwaltet die Materialien in einem Set für den späteren Cleanup", () => {
    const { materialien } = baueOberteilCache(2);
    expect(materialien.size).toBe(2);
    materialien.add({} as never); // Platzhalter
    expect(materialien.size).toBe(3);
  });

  it("liefert auch über die vorgegebene Anzahl hinaus weitere Materialien", () => {
    const cache = baueOberteilCache(2);
    const extra = cache.oberteilFuer(99);
    expect(extra).toBeDefined();
    // Wiederholter Aufruf liefert dasselbe Objekt.
    expect(cache.oberteilFuer(99)).toBe(extra);
  });
});
