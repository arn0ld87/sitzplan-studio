// Die eigentliche 3D-Szene. Dieses Modul wird erst geladen, wenn jemand auf
// die 3D-Ansicht umschaltet — hier hängen Three.js und der Renderer dran.
//
// Gerendert wird im Bedarfsmodus (`frameloop="demand"`): ohne Bedienung läuft
// keine Bildschleife. `flat` schaltet das Tone-Mapping ab, damit die Farben
// exakt den Tokens aus dem Designsystem entsprechen.

import { useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import type { RoomGeometry } from "@/data/types";
import { useBausatz } from "./bausatz";
import { leseSzenenfarben, type Szenenfarben } from "./farben";
import { Kamerasteuerung, type Ansichtsmodus } from "./Kamerasteuerung";
import { Moebel3D } from "./Moebel3D";
import { Raumhuelle } from "./Raumhuelle";
import { raumMasse, startKamera } from "./geometrie";

export type SzeneProps = {
  raum: RoomGeometry;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  rasterZeigen: boolean;
  modus: Ansichtsmodus;
  zuruecksetzen: number;
  beschriftung: string;
};

/**
 * Renders ambient and directional lighting for the room scene.
 *
 * @param raum - The room geometry used to size the lighting and shadow bounds.
 * @param farben - The scene colors used for the ambient light.
 */
function Beleuchtung({ raum, farben }: { raum: RoomGeometry; farben: Szenenfarben }) {
  const { breite, tiefe, hoehe } = raumMasse(raum);
  const spanne = Math.max(breite, tiefe);
  const rand = spanne * 0.75;
  return (
    <>
      {/* Grundhelligkeit aus Decke und Boden — ohne sie kippen Rückseiten ins Schwarze. */}
      <hemisphereLight args={[farben["--panel"], farben["--canvas"], 1.05]} />
      {/* Ein einzelnes gerichtetes Licht von schräg oben, wie Tageslicht durch die Fensterseite.
          Es trägt den größeren Teil der Helligkeit, damit Flächen Form bekommen. */}
      <directionalLight
        castShadow
        position={[spanne * 0.5, hoehe * 2.2, spanne * 0.65]}
        intensity={1.75}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-rand}
        shadow-camera-right={rand}
        shadow-camera-top={rand}
        shadow-camera-bottom={-rand}
        shadow-camera-near={0.5}
        shadow-camera-far={spanne * 6}
        shadow-bias={-0.0012}
        shadow-normalBias={0.02}
      />
    </>
  );
}

/**
 * Renders an interactive 3D scene for a room and its furniture.
 *
 * @param raum - The room geometry and furniture to display
 * @param selectedId - The identifier of the selected furniture item
 * @param onSelect - Callback invoked when furniture selection changes
 * @param rasterZeigen - Whether to display the room grid
 * @param modus - The active camera view mode
 * @param zuruecksetzen - Trigger for resetting the camera
 * @param beschriftung - Accessible label for the scene
 */
export default function Szene({
  raum,
  selectedId,
  onSelect,
  rasterZeigen,
  modus,
  zuruecksetzen,
  beschriftung,
}: SzeneProps) {
  const start = startKamera(raum);
  const farben = useMemo(() => leseSzenenfarben(), []);
  const bausatz = useBausatz(farben);
  const waehlen = useCallback((id: string) => onSelect(id), [onSelect]);

  return (
    <Canvas
      role="img"
      aria-label={beschriftung}
      shadows
      flat
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: start.position, fov: 42, near: 0.1, far: 400 }}
      onPointerMissed={() => onSelect(null)}
      style={{ background: farben["--plan"] }}
    >
      <Kamerasteuerung raum={raum} modus={modus} zuruecksetzen={zuruecksetzen} />
      <Beleuchtung raum={raum} farben={farben} />
      <Raumhuelle raum={raum} farben={farben} rasterZeigen={rasterZeigen} />
      {raum.furniture.map((moebel) => (
        <Moebel3D
          key={moebel.id}
          moebel={moebel}
          raum={raum}
          bausatz={bausatz}
          farben={farben}
          ausgewaehlt={selectedId === moebel.id}
          onSelect={waehlen}
        />
      ))}
    </Canvas>
  );
}
