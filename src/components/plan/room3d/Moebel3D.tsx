// Ein Möbelstück in der Szene: Korpus, zugehörige Stühle und — wenn
// ausgewählt — der petrolfarbene Auswahlrahmen.
//
// Die Bauteile kommen fertig aus `bausatz.ts`; hier wird nur noch platziert.

import { useEffect, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Furniture, RoomGeometry } from "@/data/types";
import type { Bausatz, Bauteil } from "./bausatz";
import type { Szenenfarben } from "./farben";
import { cmZuEinheit, moebelPlatzierung, stuhlPlatzierung } from "./geometrie";

/**
 * Renders furniture parts as Three.js meshes with their configured geometry, material, and position.
 *
 * @param teile - The furniture parts to render
 */
function Bauteile({ teile }: { teile: Bauteil[] }) {
  return (
    <>
      {teile.map((teil, i) => (
        <mesh
          key={i}
          geometry={teil.geometrie}
          material={teil.material}
          position={teil.position}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}

/**
 * Renders a wireframe selection frame around a furniture item.
 *
 * @param breite - The furniture width.
 * @param hoehe - The furniture height.
 * @param tiefe - The furniture depth.
 * @param farbe - The selection frame color.
 */
function Auswahlrahmen({
  breite,
  hoehe,
  tiefe,
  farbe,
}: {
  breite: number;
  hoehe: number;
  tiefe: number;
  farbe: string;
}) {
  const geometrie = useMemo(() => {
    const luft = cmZuEinheit(6);
    const kasten = new THREE.BoxGeometry(breite + luft, hoehe + luft, tiefe + luft);
    const kanten = new THREE.EdgesGeometry(kasten);
    kasten.dispose();
    return kanten;
  }, [breite, hoehe, tiefe]);

  useEffect(() => () => geometrie.dispose(), [geometrie]);

  return (
    <lineSegments geometry={geometrie} position={[0, hoehe / 2, 0]} renderOrder={1}>
      {/* Ohne Tiefentest bleibt der Rahmen auch hinter Möbeln sichtbar. */}
      <lineBasicMaterial color={farbe} depthTest={false} transparent />
    </lineSegments>
  );
}

/**
 * Renders a positioned furniture item with its components, chairs, and optional selection frame.
 *
 * @param moebel - The furniture item to render
 * @param raum - The room dimensions used to calculate the furniture placement
 * @param bausatz - The furniture and chair component definitions
 * @param farben - The scene colors used for the selection frame
 * @param ausgewaehlt - Whether to display the selection frame
 * @param onSelect - Optional callback invoked with the furniture ID when the item is clicked
 * @returns The rendered furniture group
 */
export function Moebel3D({
  moebel,
  raum,
  bausatz,
  farben,
  ausgewaehlt,
  onSelect,
}: {
  moebel: Furniture;
  raum: Pick<RoomGeometry, "width" | "height">;
  bausatz: Bausatz;
  farben: Szenenfarben;
  ausgewaehlt: boolean;
  onSelect?: ((id: string) => void) | undefined;
}) {
  const { position, drehung, masse } = moebelPlatzierung(moebel, raum);
  const stuehle = moebel.seats
    .map((_, i) => stuhlPlatzierung(moebel.kind, i))
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <group
      position={position}
      rotation={[0, drehung, 0]}
      {...(onSelect
        ? {
            onClick: (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onSelect(moebel.id);
            },
          }
        : {})}
    >
      <Bauteile teile={bausatz.moebel[moebel.kind]} />
      {stuehle.map((stuhl, i) => (
        <group key={i} position={stuhl.position}>
          <Bauteile teile={bausatz.stuhl} />
        </group>
      ))}
      {ausgewaehlt && (
        <Auswahlrahmen
          breite={masse.breite}
          hoehe={masse.hoehe}
          tiefe={masse.tiefe}
          farbe={farben["--select"]}
        />
      )}
    </group>
  );
}
