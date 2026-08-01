// Boden, Raster und Wände. Die Wände stehen rundum, blenden sich aber aus,
// sobald sie zwischen Kamera und Raum geraten — so bleibt der Blick von jedem
// Winkel frei, ohne dass eine Seite dauerhaft fehlt.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RoomGeometry } from "@/data/types";
import { rasterWeite } from "@/lib/raster";
import type { Szenenfarben } from "./farben";
import {
  WANDSEITEN,
  WANDSTAERKE_CM,
  cmZuEinheit,
  raumMasse,
  wandDeckkraft,
  wandPlatzierung,
  type Wandseite,
} from "./geometrie";

/**
 * Creates a floor-aligned grid geometry sized to the room.
 *
 * @param raum - The room dimensions and grid configuration.
 * @returns The generated grid geometry.
 */
function useRastergeometrie(raum: Pick<RoomGeometry, "width" | "height" | "grid">) {
  const geometrie = useMemo(() => {
    const weite = rasterWeite(raum.grid);
    const { breite, tiefe } = raumMasse(raum);
    const punkte: number[] = [];
    const y = 0.002; // knapp über dem Boden, sonst flimmern Linie und Fläche
    if (weite > 0) {
      for (let cm = 0; cm <= raum.width + 0.001; cm += weite) {
        const x = cmZuEinheit(cm) - breite / 2;
        punkte.push(x, y, -tiefe / 2, x, y, tiefe / 2);
      }
      for (let cm = 0; cm <= raum.height + 0.001; cm += weite) {
        const z = cmZuEinheit(cm) - tiefe / 2;
        punkte.push(-breite / 2, y, z, breite / 2, y, z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(punkte, 3));
    return g;
  }, [raum]);

  useEffect(() => () => geometrie.dispose(), [geometrie]);
  return geometrie;
}

/**
 * Renders a room wall with the specified material and dimensions.
 *
 * @param seite - The wall side to render
 * @param raum - The room dimensions used to position and size the wall
 * @param material - The material applied to the wall
 */
function Wand({
  seite,
  raum,
  material,
}: {
  seite: Wandseite;
  raum: Pick<RoomGeometry, "width" | "height">;
  material: THREE.Material;
}) {
  const { position, drehung, laenge } = wandPlatzierung(seite, raum);
  const { hoehe } = raumMasse(raum);
  return (
    <mesh position={position} rotation={[0, drehung, 0]} material={material} receiveShadow>
      <boxGeometry args={[laenge, hoehe, cmZuEinheit(WANDSTAERKE_CM)]} />
    </mesh>
  );
}

/**
 * Renders the room floor, optional grid, and four walls with camera-dependent wall transparency.
 *
 * @param raum - Room dimensions and grid spacing used to construct the room shell
 * @param farben - Scene colors for the floor, walls, and grid
 * @param rasterZeigen - Whether to display the floor grid
 */
export function Raumhuelle({
  raum,
  farben,
  rasterZeigen,
}: {
  raum: Pick<RoomGeometry, "width" | "height" | "grid">;
  farben: Szenenfarben;
  rasterZeigen: boolean;
}) {
  const { breite, tiefe } = raumMasse(raum);
  const raster = useRastergeometrie(raum);

  const wandstoffe = useMemo(() => {
    const eintraege = WANDSEITEN.map(
      (seite) =>
        [
          seite,
          new THREE.MeshStandardMaterial({
            color: farben["--canvas"],
            roughness: 0.95,
            metalness: 0,
            transparent: true,
            side: THREE.DoubleSide,
          }),
        ] as const,
    );
    return eintraege;
  }, [farben]);

  useEffect(() => {
    return () => {
      for (const [, stoff] of wandstoffe) stoff.dispose();
    };
  }, [wandstoffe]);

  // Die Kameraposition ändert sich nur bei Bedienung; die Szene rendert im
  // Bedarfsmodus, dieser Abgleich läuft also nicht dauerhaft im Leerlauf.
  const letzte = useRef<Record<string, number>>({});
  useFrame(({ camera }) => {
    const kamera = { x: camera.position.x, z: camera.position.z };
    for (const [seite, stoff] of wandstoffe) {
      const soll = wandDeckkraft(seite, kamera, raum);
      if (letzte.current[seite] === soll) continue;
      letzte.current[seite] = soll;
      stoff.opacity = soll;
      stoff.depthWrite = soll > 0.5;
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[breite, tiefe]} />
        <meshStandardMaterial color={farben["--plan"]} roughness={0.92} metalness={0} />
      </mesh>

      {rasterZeigen && (
        <lineSegments geometry={raster}>
          <lineBasicMaterial color={farben["--line"]} transparent opacity={0.9} />
        </lineSegments>
      )}

      {wandstoffe.map(([seite, stoff]) => (
        <Wand key={seite} seite={seite} raum={raum} material={stoff} />
      ))}
    </group>
  );
}
