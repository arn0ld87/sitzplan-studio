import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoomPlan } from "./RoomPlan";
import { makeFurniture, type RoomGeometry, type Student } from "@/data/types";

function raumMit(rotation: 0 | 90 | 180 | 270): RoomGeometry {
  const tisch = makeFurniture("einzeltisch", 100, 100);
  return {
    name: "R1",
    width: 800,
    height: 600,
    grid: 25,
    furniture: [{ ...tisch, rotation }],
  };
}

const ELIAS: Student = {
  id: "s1",
  firstName: "Elias",
  lastName: "Eggers",
  colorIndex: 0,
  merkmale: [],
  notiz: "",
};

/** Der Text des Sitzplatzes — der einzige `<text>` innerhalb der Möbelgruppe. */
function sitzText(container: HTMLElement) {
  return [...container.querySelectorAll("text")].find((t) => t.textContent === "EE");
}

describe("RoomPlan — Beschriftung gedrehter Sitzplätze", () => {
  // Der Sitzplatz steckt in der gedrehten Gruppe des Möbels. Ohne Gegendrehung
  // stünden die Initialen bei 180° auf dem Kopf: aus "EE" wird "ƎƎ".
  it.each([90, 180, 270] as const)("dreht die Initialen bei %i° zurück", (rotation) => {
    // Der Raum muss **einmal** gebaut werden: `makeFurniture` vergibt bei jedem
    // Aufruf eine neue Kennung, und die Zuordnung hängt an der Sitzplatzkennung.
    const raum = raumMit(rotation);
    const sitz = raum.furniture[0]!.seats[0]!;
    const { container } = render(
      <RoomPlan
        room={raum}
        mode="seating"
        assignments={{ [sitz]: ELIAS.id }}
        studentsById={{ [ELIAS.id]: ELIAS }}
      />,
    );
    // Gezielt der Sitzplatztext — die Raumbemaßung am Rand ist ebenfalls
    // gedreht und würde eine breitere Abfrage verfälschen.
    expect(sitzText(container)?.getAttribute("transform")).toBe(`rotate(${-rotation} 30 25)`);
  });

  it("lässt die Beschriftung bei einem ungedrehten Möbel unangetastet", () => {
    const raum = raumMit(0);
    const sitz = raum.furniture[0]!.seats[0]!;
    const { container } = render(
      <RoomPlan
        room={raum}
        mode="seating"
        assignments={{ [sitz]: ELIAS.id }}
        studentsById={{ [ELIAS.id]: ELIAS }}
      />,
    );
    const text = sitzText(container);
    expect(text).toBeDefined();
    // Kein überflüssiges transform-Attribut, wo nichts zu drehen ist.
    expect(text?.getAttribute("transform")).toBeNull();
  });

  it("zeigt die Initialen des gesetzten Schülers", () => {
    const raum = raumMit(0);
    const sitz = raum.furniture[0]!.seats[0]!;
    const { container } = render(
      <RoomPlan
        room={raum}
        mode="seating"
        assignments={{ [sitz]: ELIAS.id }}
        studentsById={{ [ELIAS.id]: ELIAS }}
      />,
    );
    expect(sitzText(container)).toBeDefined();
  });
});
