import { describe, expect, it } from "vitest";
import { makeFurniture } from "@/data/types";
import { lehrerinnenPultId } from "./lehrerin";

describe("lehrerinnenPultId", () => {
  it("wählt nur das erste Lehrerpult im Raum", () => {
    const tisch = makeFurniture("einzeltisch", 20, 20);
    const erstesPult = makeFurniture("pult", 100, 100);
    const zweitesPult = makeFurniture("pult", 300, 100);

    expect(lehrerinnenPultId([tisch, erstesPult, zweitesPult])).toBe(erstesPult.id);
  });

  it("liefert ohne Lehrerpult keine Position", () => {
    expect(lehrerinnenPultId([makeFurniture("doppeltisch", 20, 20)])).toBeNull();
  });
});
