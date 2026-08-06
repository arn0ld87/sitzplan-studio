// Stilisierte, sitzende Kinderfigur für die 3D-Ansicht.
//
// Lokales Koordinatensystem: Y=0 = Sitzfläche, +Y nach oben, +Z vom Tisch weg.
// Der Pivot liegt auf der Sitzebene; alle Kindmaße sind relativ zu ihm.
//
// Geometrien, Haut- und Hosenmaterial sowie ein Oberteil-Material je
// Farbindex werden über `KinderBausatz` aus `kinderBausatz.ts` geteilt —
// `Kind3D` baut selbst weder BufferGeometries noch Materialien. Animationen
// werden nur bei sichtbaren Figuren ausgeführt; `prefers-reduced-motion`
// schaltet sie ab.

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { KinderBausatz } from "./kinderBausatz";
import { KIND, cmZuEinheit } from "./geometrie";

type Kind3DProps = {
  /** Farbindex des Schülers — bestimmt die Oberteil-Farbe. */
  colorIndex: number;
  /** Ob das zugehörige Möbelstück gerade ausgewählt ist. */
  ausgewaehlt: boolean;
  /** Geteilte Geometrien und Materialien aus `useKinderBausatz`. */
  bausatz: KinderBausatz;
};

/** Prüft, ob der Nutzer reduzierte Bewegung bevorzugt. */
function reducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Kind3D({ colorIndex, ausgewaehlt, bausatz }: Kind3DProps) {
  const { geometrien, materialien } = bausatz;
  const gruppe = useRef<THREE.Group | null>(null);
  const kopf = useRef<THREE.Group | null>(null);
  const [hover, setHover] = useState(false);
  const [huepferStart, setHuepferStart] = useState<number | null>(null);
  const reduced = useRef(reducedMotion());

  useEffect(() => {
    if (ausgewaehlt) setHuepferStart(performance.now());
    else setHuepferStart(null);
  }, [ausgewaehlt]);

  useFrame(({ camera }) => {
    const root = gruppe.current;
    if (!root) return;

    if (reduced.current) {
      root.position.y = 0;
      return;
    }

    const now = performance.now();
    let y = Math.sin((now / 1000) * 2) * cmZuEinheit(0.5);

    if (huepferStart !== null) {
      const vergangen = (now - huepferStart) / 1000;
      if (vergangen < 0.25) {
        y += Math.sin(vergangen * Math.PI * 4) * cmZuEinheit(1.5);
      }
    }
    root.position.y = y;

    // Kopf und Arme reagieren auf Hover nur, wenn reduced-motion aus ist.
    const kopfGruppe = kopf.current;
    if (kopfGruppe && hover) {
      const welt = new THREE.Vector3();
      root.getWorldPosition(welt);
      const richtung = new THREE.Vector3().subVectors(camera.position, welt);
      const zielWinkel = Math.atan2(richtung.x, richtung.z);
      kopfGruppe.rotation.y += (zielWinkel - kopfGruppe.rotation.y) * 0.1;
    }
  });

  // Y-Koordinaten im lokalen Sitz-KOS (Y=0 = Sitzfläche, +Y nach oben).
  const rumpfY = cmZuEinheit(KIND.koerperhoehe / 2);
  const kopfY = cmZuEinheit(KIND.koerperhoehe + KIND.kopfdurchmesser / 2);
  const armSeitlich = cmZuEinheit(KIND.koerperbreite / 2 + 1);
  const armY = cmZuEinheit(KIND.koerperhoehe * 0.35);
  const oberschenkelZ = cmZuEinheit(KIND.oberschenkel / 2);
  const beinY = -cmZuEinheit(KIND.unterschenkel / 2);
  const beinZ = cmZuEinheit(KIND.oberschenkel);
  const oberteil = materialien.oberteilFuer(colorIndex);

  // Hover hebt nur die Arme und dreht den Kopf, wenn reduced-motion aus ist.
  const armHebungReduziert = !reduced.current;
  const armLinks = hover && armHebungReduziert ? -Math.PI / 3 : -0.15;
  const armRechts = hover && armHebungReduziert ? Math.PI / 6 : 0.15;

  return (
    <group
      ref={gruppe}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHover(false);
      }}
    >
      {/* Kopf — eigene Gruppe, damit Hover-Drehung nicht die ganze Figur dreht. */}
      <group ref={kopf} position={[0, kopfY, 0]}>
        <mesh geometry={geometrien.kopf} material={materialien.haut} castShadow>
          <mesh
            geometry={geometrien.auge}
            material={materialien.haut}
            position={[cmZuEinheit(3), cmZuEinheit(1), cmZuEinheit(KIND.kopfdurchmesser / 2 - 0.5)]}
          />
          <mesh
            geometry={geometrien.auge}
            material={materialien.haut}
            position={[
              -cmZuEinheit(3),
              cmZuEinheit(1),
              cmZuEinheit(KIND.kopfdurchmesser / 2 - 0.5),
            ]}
          />
        </mesh>
      </group>

      <mesh geometry={geometrien.rumpf} material={oberteil} position={[0, rumpfY, 0]} castShadow />

      <group position={[0, armY, 0]}>
        <mesh
          geometry={geometrien.arm}
          material={materialien.haut}
          position={[armSeitlich, 0, 0]}
          rotation={[0, 0, armLinks]}
          castShadow
        />
        <mesh
          geometry={geometrien.arm}
          material={materialien.haut}
          position={[-armSeitlich, 0, 0]}
          rotation={[0, 0, armRechts]}
          castShadow
        />
      </group>

      {/* Oberschenkel liegen flach auf der Sitzfläche, Knie nach vorn (+Z). */}
      <group position={[0, 0, cmZuEinheit(KIND.koerpertiefe / 4)]}>
        <mesh
          geometry={geometrien.oberschenkel}
          material={materialien.hose}
          position={[cmZuEinheit(4), 0, oberschenkelZ]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        />
        <mesh
          geometry={geometrien.oberschenkel}
          material={materialien.hose}
          position={[-cmZuEinheit(4), 0, oberschenkelZ]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        />
      </group>

      {/* Unterschenkel hängen senkrecht vom Knie nach unten (Sitz-Pivot). */}
      <group position={[0, beinY, cmZuEinheit(KIND.koerpertiefe / 4) + beinZ]}>
        <mesh
          geometry={geometrien.bein}
          material={materialien.hose}
          position={[cmZuEinheit(4), 0, 0]}
          castShadow
        />
        <mesh
          geometry={geometrien.bein}
          material={materialien.hose}
          position={[-cmZuEinheit(4), 0, 0]}
          castShadow
        />
      </group>
    </group>
  );
}
