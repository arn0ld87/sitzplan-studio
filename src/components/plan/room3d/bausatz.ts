// Bauteile der Möbel, gebaut aus Three.js-Grundkörpern. Keine externen Modelle,
// keine Texturen — die Formen sollen die SVG-Zeichnung räumlich fortsetzen,
// nicht sie ersetzen.
//
// Geometrien und Materialien entstehen **einmal je Möbelart** und werden von
// allen Exemplaren geteilt. Ein Raum mit vierzig Doppeltischen erzeugt damit
// rund zwanzig Puffer statt tausend.

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { FURNITURE_SPECS, type FurnitureKind } from "@/data/types";
import type { Szenenfarben } from "./farben";
import { MOEBEL_AUFBAU, STUHL, cmZuEinheit } from "./geometrie";

/** Ein Bauteil: geteilte Geometrie, geteiltes Material, feste Lage im Möbel. */
export type Bauteil = {
  geometrie: THREE.BufferGeometry;
  material: THREE.Material;
  position: [number, number, number];
};

type Werkstoffe = {
  platte: THREE.Material;
  gestell: THREE.Material;
  korpus: THREE.Material;
  tafel: THREE.Material;
  rahmen: THREE.Material;
  glas: THREE.Material;
  sitz: THREE.Material;
};

export type Bausatz = {
  moebel: Record<FurnitureKind, Bauteil[]>;
  stuhl: Bauteil[];
  werkstoffe: Werkstoffe;
};

/** Nichtmetallisches Standardmaterial in der angegebenen Farbe und Rauheit. */
export function flaeche(farbe: string, rauheit: number): THREE.Material {
  return new THREE.MeshStandardMaterial({ color: farbe, roughness: rauheit, metalness: 0 });
}

/** Baut die Werkstoffe der Möbelbauteile aus den Szenenfarben. */
function werkstoffeBauen(farben: Szenenfarben): Werkstoffe {
  return {
    platte: flaeche(farben["--elevated"], 0.62),
    gestell: flaeche(farben["--line-plan"], 0.78),
    korpus: flaeche(farben["--line-strong"], 0.8),
    tafel: flaeche(farben["--board"], 0.9),
    rahmen: flaeche(farben["--sunken"], 0.75),
    glas: new THREE.MeshStandardMaterial({
      color: farben["--window"],
      roughness: 0.15,
      metalness: 0,
      transparent: true,
      opacity: 0.42,
    }),
    sitz: flaeche(farben["--panel"], 0.82),
  };
}

/** Quaderförmiges Bauteil mit den angegebenen Maßen und der angegebenen Position. */
export function kasten(
  material: THREE.Material,
  masse: [number, number, number],
  position: [number, number, number],
): Bauteil {
  return { geometrie: new THREE.BoxGeometry(...masse), material, position };
}

/**
 * Vier zylindrische Beine an den Ecken eines rechteckigen Bauteils — alle vier
 * teilen sich eine einzige Zylinder-Geometrie.
 */
function beine(
  material: THREE.Material,
  breite: number,
  tiefe: number,
  hoehe: number,
  staerke: number,
): Bauteil[] {
  const geometrie = new THREE.CylinderGeometry(staerke / 2, staerke / 2, hoehe, 8);
  const dx = breite / 2 - staerke;
  const dz = tiefe / 2 - staerke;
  const ecken: [number, number][] = [
    [-dx, -dz],
    [dx, -dz],
    [-dx, dz],
    [dx, dz],
  ];
  return ecken.map(([x, z]) => ({
    geometrie,
    material,
    position: [x, hoehe / 2, z] as [number, number, number],
  }));
}

/** Bauteile für Einzel- oder Doppeltisch, beim Doppeltisch inklusive Trennfuge in der Mitte. */
function tischBauen(kind: "einzeltisch" | "doppeltisch", w: Werkstoffe): Bauteil[] {
  const spec = FURNITURE_SPECS[kind];
  const breite = cmZuEinheit(spec.w);
  const tiefe = cmZuEinheit(spec.h);
  const hoehe = cmZuEinheit(MOEBEL_AUFBAU[kind].hoehe);
  const staerke = cmZuEinheit(4);
  const teile: Bauteil[] = [
    kasten(w.platte, [breite, staerke, tiefe], [0, hoehe - staerke / 2, 0]),
    ...beine(w.gestell, breite, tiefe, hoehe - staerke, cmZuEinheit(5)),
  ];
  if (kind === "doppeltisch") {
    // Trennfuge wie die Mittellinie der SVG-Zeichnung.
    teile.push(
      kasten(w.gestell, [cmZuEinheit(1.5), staerke * 1.05, tiefe], [0, hoehe - staerke / 2, 0]),
    );
  }
  return teile;
}

/** Bauteile des Lehrerpults: Tischplatte und zurückgesetzter Korpus. */
function pultBauen(w: Werkstoffe): Bauteil[] {
  const spec = FURNITURE_SPECS.pult;
  const breite = cmZuEinheit(spec.w);
  const tiefe = cmZuEinheit(spec.h);
  const hoehe = cmZuEinheit(MOEBEL_AUFBAU.pult.hoehe);
  const staerke = cmZuEinheit(4.5);
  return [
    kasten(w.platte, [breite, staerke, tiefe], [0, hoehe - staerke / 2, 0]),
    // Zurückgesetzter Korpus, damit das Pult schwerer wirkt als ein Schülertisch.
    kasten(
      w.korpus,
      [breite - cmZuEinheit(10), hoehe - staerke, tiefe - cmZuEinheit(10)],
      [0, (hoehe - staerke) / 2, 0],
    ),
  ];
}

/** Rahmen, Schreibfläche und vorkragende Kreideablage der Tafel. */
function tafelBauen(w: Werkstoffe): Bauteil[] {
  const spec = FURNITURE_SPECS.tafel;
  const breite = cmZuEinheit(spec.w);
  const tiefe = cmZuEinheit(spec.h);
  const hoehe = cmZuEinheit(MOEBEL_AUFBAU.tafel.hoehe);
  const rand = cmZuEinheit(6);
  return [
    // Rückwand hinten, Schreibfläche davor. Beide Körper dürfen sich nicht
    // durchdringen, sonst verschwindet das Grün im Rahmen.
    kasten(w.rahmen, [breite + rand, hoehe + rand, tiefe * 0.6], [0, hoehe / 2, -tiefe * 0.2]),
    kasten(w.tafel, [breite, hoehe, tiefe * 0.5], [0, hoehe / 2, tiefe * 0.25]),
    // Kreideablage an der Unterkante, nach vorn auskragend.
    kasten(
      w.rahmen,
      [breite + rand, cmZuEinheit(3), tiefe * 1.8],
      [0, -cmZuEinheit(2), tiefe * 0.5],
    ),
  ];
}

/** Türzarge mit zurückgesetztem Türblatt und Griff. */
function tuerBauen(w: Werkstoffe): Bauteil[] {
  const spec = FURNITURE_SPECS.tuer;
  const breite = cmZuEinheit(spec.w);
  const tiefe = cmZuEinheit(spec.h);
  const hoehe = cmZuEinheit(MOEBEL_AUFBAU.tuer.hoehe);
  const zarge = cmZuEinheit(7);
  const blattBreite = breite - 2 * zarge;
  const blattHoehe = hoehe - zarge;
  return [
    // Zarge als zwei Pfosten und ein Sturz — ein voller Kasten würde das
    // Türblatt einschließen und die Tür zur Platte machen.
    kasten(w.gestell, [zarge, hoehe, tiefe], [-(breite - zarge) / 2, hoehe / 2, 0]),
    kasten(w.gestell, [zarge, hoehe, tiefe], [(breite - zarge) / 2, hoehe / 2, 0]),
    kasten(w.gestell, [breite, zarge, tiefe], [0, hoehe - zarge / 2, 0]),
    // Türblatt liegt in der Zarge und steht ein Stück nach innen vor.
    kasten(w.platte, [blattBreite, blattHoehe, tiefe * 0.5], [0, blattHoehe / 2, tiefe * 0.15]),
    // Griff auf üblicher Höhe — daran lässt sich der Maßstab ablesen.
    kasten(
      w.korpus,
      [cmZuEinheit(12), cmZuEinheit(2.5), cmZuEinheit(2.5)],
      [blattBreite / 2 - cmZuEinheit(10), cmZuEinheit(105), tiefe * 0.45],
    ),
  ];
}

/** Fenster mit gerahmter Scheibe, Kämpfer in der Mitte und nach innen ragender Fensterbank. */
function fensterBauen(w: Werkstoffe): Bauteil[] {
  const spec = FURNITURE_SPECS.fenster;
  const breite = cmZuEinheit(spec.w);
  const tiefe = cmZuEinheit(spec.h);
  const hoehe = cmZuEinheit(MOEBEL_AUFBAU.fenster.hoehe);
  const rahmen = cmZuEinheit(8);
  const lichteHoehe = hoehe - 2 * rahmen;
  const lichteBreite = breite - 2 * rahmen;
  return [
    // Vier Rahmenschenkel statt eines Kastens — nur so ist die Scheibe zu sehen.
    kasten(w.rahmen, [breite, rahmen, tiefe], [0, rahmen / 2, 0]),
    kasten(w.rahmen, [breite, rahmen, tiefe], [0, hoehe - rahmen / 2, 0]),
    kasten(w.rahmen, [rahmen, hoehe, tiefe], [-(breite - rahmen) / 2, hoehe / 2, 0]),
    kasten(w.rahmen, [rahmen, hoehe, tiefe], [(breite - rahmen) / 2, hoehe / 2, 0]),
    // Ein Kämpfer teilt die Scheibe — ohne ihn wirkt sie zu groß.
    kasten(w.rahmen, [lichteBreite, rahmen * 0.6, tiefe - 2 * rahmen], [0, hoehe / 2, 0]),
    kasten(w.glas, [lichteBreite, lichteHoehe, tiefe - 2 * rahmen], [0, hoehe / 2, 0]),
    // Fensterbank nach innen.
    kasten(w.korpus, [breite, cmZuEinheit(3), tiefe], [0, -cmZuEinheit(1.5), 0]),
  ];
}

/** Sitzfläche, Lehne und Beine eines Stuhls. */
function stuhlBauen(w: Werkstoffe): Bauteil[] {
  const breite = cmZuEinheit(STUHL.breite);
  const tiefe = cmZuEinheit(STUHL.tiefe);
  const sitzhoehe = cmZuEinheit(STUHL.sitzhoehe);
  const lehne = cmZuEinheit(STUHL.lehnenhoehe);
  const staerke = cmZuEinheit(3.5);
  return [
    kasten(w.sitz, [breite, staerke, tiefe], [0, sitzhoehe - staerke / 2, 0]),
    // Die Lehne steht hinten, also auf der tischabgewandten Seite.
    kasten(w.sitz, [breite, lehne, staerke], [0, sitzhoehe + lehne / 2, tiefe / 2 - staerke / 2]),
    ...beine(w.gestell, breite, tiefe, sitzhoehe - staerke, cmZuEinheit(3)),
  ];
}

/** Baut Möbelbauteile und Materialien für die Szene und memoisiert sie. */
export function useBausatz(farben: Szenenfarben): Bausatz {
  const bausatz = useMemo<Bausatz>(() => {
    const werkstoffe = werkstoffeBauen(farben);
    return {
      werkstoffe,
      stuhl: stuhlBauen(werkstoffe),
      moebel: {
        einzeltisch: tischBauen("einzeltisch", werkstoffe),
        doppeltisch: tischBauen("doppeltisch", werkstoffe),
        pult: pultBauen(werkstoffe),
        tafel: tafelBauen(werkstoffe),
        tuer: tuerBauen(werkstoffe),
        fenster: fensterBauen(werkstoffe),
      },
    };
  }, [farben]);

  useEffect(() => {
    return () => {
      const teile = [...Object.values(bausatz.moebel).flat(), ...bausatz.stuhl];
      // Die Beine teilen sich eine Geometrie; `dispose` ist idempotent.
      for (const teil of teile) teil.geometrie.dispose();
      for (const stoff of Object.values(bausatz.werkstoffe)) stoff.dispose();
    };
  }, [bausatz]);

  return bausatz;
}
