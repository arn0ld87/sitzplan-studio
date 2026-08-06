// Ein Möbelstück in der Szene: Korpus, zugehörige Stühle und — wenn
// ausgewählt — der petrolfarbene Auswahlrahmen.
//
// Die Bauteile kommen fertig aus `bausatz.ts`; hier wird nur noch platziert.

import { useEffect, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Furniture, RoomGeometry, SeatAssignment } from "@/data/types";
import type { Bausatz, Bauteil } from "./bausatz";
import type { Szenenfarben } from "./farben";
import {
  cmZuEinheit,
  kindPlatzierung,
  lehrerinPlatzierung,
  moebelPlatzierung,
  stuhlPlatzierung,
} from "./geometrie";
import type { KinderBausatz } from "./kinderBausatz";
import { Kind3D } from "./Kind3D";
import { Lehrerin3D } from "./Lehrerin3D";
import { belegungFuerMoebel } from "./kinder";

/** Rendert die Bauteile eines Möbelstücks als Three.js-Meshes mit ihrer vorgegebenen Geometrie, ihrem Material und ihrer Position. */
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

/** Zeichnet den Drahtgitter-Auswahlrahmen um ein Möbelstück. */
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

/** Platziert ein Möbelstück samt seiner Stühle und, wenn ausgewählt, dem Auswahlrahmen. */
export function Moebel3D({
  moebel,
  raum,
  bausatz,
  kinderBausatz,
  farben,
  ausgewaehlt,
  belegung,
  lehrerinAnzeigen,
  onSelect,
}: {
  moebel: Furniture;
  raum: Pick<RoomGeometry, "width" | "height">;
  bausatz: Bausatz;
  kinderBausatz: KinderBausatz;
  farben: Szenenfarben;
  ausgewaehlt: boolean;
  belegung?: SeatAssignment[] | undefined;
  lehrerinAnzeigen?: boolean;
  onSelect?: ((id: string) => void) | undefined;
}) {
  const { position, drehung, masse } = moebelPlatzierung(moebel, raum);
  const stuehle = moebel.seats
    .map((_, i) => stuhlPlatzierung(moebel.kind, i))
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const stuhlBelegung = belegungFuerMoebel(belegung, moebel);
  const lehrerinPlatz = lehrerinAnzeigen ? lehrerinPlatzierung(moebel.kind) : null;

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
      {lehrerinPlatz && (
        <group position={lehrerinPlatz.position} rotation={[0, lehrerinPlatz.drehung, 0]}>
          <Lehrerin3D farben={farben} />
        </group>
      )}
      {stuehle.map((stuhl, i) => {
        const kindPlatz = kindPlatzierung(moebel.kind, i);
        const student = stuhlBelegung.find((b) => b.seatIndex === i)?.student;
        return (
          <group key={i} position={stuhl.position}>
            <Bauteile teile={bausatz.stuhl} />
            {student && kindPlatz && (
              <group position={kindPlatz.position} rotation={[0, kindPlatz.drehung, 0]}>
                <Kind3D
                  colorIndex={student.colorIndex}
                  ausgewaehlt={ausgewaehlt}
                  bausatz={kinderBausatz}
                />
              </group>
            )}
          </group>
        );
      })}
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
