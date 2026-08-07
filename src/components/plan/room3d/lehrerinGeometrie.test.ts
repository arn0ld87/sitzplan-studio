import { describe, expect, it } from "vitest";
import { FURNITURE_SPECS } from "@/data/types";
import { LEHRERIN, RAUMHOEHE_CM, cmZuEinheit, lehrerinPlatzierung } from "./geometrie";

describe("lehrerinPlatzierung", () => {
  it("steht hinter dem Lehrerpult und blickt in den Raum", () => {
    const platz = lehrerinPlatzierung("pult");

    expect(platz).not.toBeNull();
    expect(platz!.position[0]).toBe(0);
    expect(platz!.position[1]).toBe(0);
    expect(platz!.position[2]).toBeLessThan(-cmZuEinheit(FURNITURE_SPECS.pult.h / 2));
    expect(platz!.drehung).toBe(0);
  });

  it("erscheint nicht an anderen Möbelarten", () => {
    expect(lehrerinPlatzierung("einzeltisch")).toBeNull();
    expect(lehrerinPlatzierung("tafel")).toBeNull();
  });

  it("bleibt mit erwachsenen Proportionen innerhalb der Raumhöhe", () => {
    const gesamtHoehe = LEHRERIN.beinhoehe + LEHRERIN.koerperhoehe + LEHRERIN.kopfdurchmesser;

    expect(gesamtHoehe).toBeGreaterThan(150);
    expect(gesamtHoehe).toBeLessThan(RAUMHOEHE_CM);
  });
});
