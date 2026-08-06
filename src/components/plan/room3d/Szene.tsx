// Die eigentliche 3D-Szene. Dieses Modul wird erst geladen, wenn jemand auf
// die 3D-Ansicht umschaltet — hier hängen Three.js und der Renderer dran.
//
// Gerendert wird im Bedarfsmodus (`frameloop="demand"`): ohne Bedienung läuft
// keine Bildschleife. `flat` schaltet das Tone-Mapping ab, damit die Farben
// exakt den Tokens aus dem Designsystem entsprechen.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import type { RoomGeometry, SeatAssignment } from "@/data/types";
import { Ausstattung3D } from "./Ausstattung3D";
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
  ausstattungZeigen: boolean;
  belegung?: SeatAssignment[] | undefined;
  onFehler?: () => void;
};

/**
 * Überwacht den WebGL-Kontext und meldet Verluste an die Fehlergrenze.
 *
 * @param onFehler - Callback bei Kontextverlust
 */
/**
 * Schaltet den Canvas-Frameloop auf "always", sobald belegte Sitzplätze
 * animierte Figuren enthalten. Sonst bleibt es beim sparsamen "demand".
 */
function FrameloopRegler({ animieren }: { animieren: boolean }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    setFrameloop(animieren ? "always" : "demand");
  }, [animieren, setFrameloop]);
  return null;
}

function KontextWaechter({ onFehler }: { onFehler?: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const element = gl.domElement;
    const beiVerlust = () => {
      console.error("WebGL-Kontext verloren");
      onFehler?.();
    };
    element.addEventListener("webglcontextlost", beiVerlust);
    return () => element.removeEventListener("webglcontextlost", beiVerlust);
  }, [gl, onFehler]);
  return null;
}

/** Beleuchtet die Szene mit Umgebungs- und Richtungslicht, angepasst an Raumgröße und Schattengrenzen. */
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

/** Interaktive 3D-Szene für einen Raum mit seinem Mobiliar. */
export default function Szene({
  raum,
  selectedId,
  onSelect,
  rasterZeigen,
  modus,
  zuruecksetzen,
  beschriftung,
  ausstattungZeigen,
  belegung,
  onFehler,
}: SzeneProps) {
  const start = startKamera(raum);
  const farben = useMemo(() => leseSzenenfarben(), []);
  const bausatz = useBausatz(farben);
  const waehlen = useCallback((id: string) => onSelect(id), [onSelect]);
  const animieren = (belegung ?? []).length > 0;

  return (
    <Canvas
      role="img"
      aria-label={beschriftung}
      shadows
      flat
      frameloop={animieren ? "always" : "demand"}
      dpr={[1, 2]}
      camera={{ position: start.position, fov: 42, near: 0.1, far: 400 }}
      onPointerMissed={() => onSelect(null)}
      style={{ background: farben["--plan"] }}
    >
      {onFehler && <KontextWaechter onFehler={onFehler} />}
      <FrameloopRegler animieren={animieren} />
      <Kamerasteuerung raum={raum} modus={modus} zuruecksetzen={zuruecksetzen} />
      <Beleuchtung raum={raum} farben={farben} />
      <Raumhuelle raum={raum} farben={farben} rasterZeigen={rasterZeigen} />
      {ausstattungZeigen && <Ausstattung3D raum={raum} farben={farben} />}
      {raum.furniture.map((moebel) => (
        <Moebel3D
          key={moebel.id}
          moebel={moebel}
          raum={raum}
          bausatz={bausatz}
          farben={farben}
          ausgewaehlt={selectedId === moebel.id}
          belegung={belegung}
          onSelect={waehlen}
        />
      ))}
    </Canvas>
  );
}
