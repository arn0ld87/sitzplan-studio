// Stilisierte, sitzende Kinderfigur für die 3D-Ansicht.
//
// Figuren werden aus Three.js-Grundkörpern prozedural gebaut. Sie wippen im
// Idle, winken bei Hover und hüpfen kurz auf, wenn das zugehörige Möbelstück
// ausgewählt wird.

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { studentColor } from "@/data/types";
import { cmZuEinheit, KIND, STUHL } from "./geometrie";

type Kind3DProps = {
  /** Farbindex des Schülers — bestimmt Oberteil-Farbe. */
  colorIndex: number;
  /** Ob das zugehörige Möbelstück gerade ausgewählt ist. */
  ausgewaehlt: boolean;
};

const HAUT_FARBE = "#e8c4a0";
const HOSE_FARBE = "#5c6b73";

/** Prüft, ob der Nutzer reduzierte Bewegung bevorzugt. */
function reducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Baut die Geometrien einer Figur einmalig. */
function useKindGeometrien() {
  return useMemo(() => {
    const kopf = new THREE.SphereGeometry(cmZuEinheit(KIND.kopfdurchmesser / 2), 16, 16);
    const rumpf = new THREE.BoxGeometry(
      cmZuEinheit(KIND.koerperbreite),
      cmZuEinheit(KIND.koerperhoehe),
      cmZuEinheit(KIND.koerpertiefe),
    );
    const arm = new THREE.CylinderGeometry(
      cmZuEinheit(2.5),
      cmZuEinheit(2.5),
      cmZuEinheit(KIND.koerperhoehe * 0.55),
      12,
    );
    const bein = new THREE.CylinderGeometry(
      cmZuEinheit(3),
      cmZuEinheit(3),
      cmZuEinheit(KIND.unterschenkel),
      12,
    );
    const oberschenkel = new THREE.CylinderGeometry(
      cmZuEinheit(3.5),
      cmZuEinheit(3.5),
      cmZuEinheit(KIND.oberschenkel),
      12,
    );
    return { kopf, rumpf, arm, bein, oberschenkel };
  }, []);
}

/** Baut Materialien aus geteilten Farben. */
function useKindMaterialien(colorIndex: number) {
  return useMemo(() => {
    const haut = new THREE.MeshStandardMaterial({ color: HAUT_FARBE, roughness: 0.7 });
    const oberteil = new THREE.MeshStandardMaterial({
      color: studentColor(colorIndex) ?? "#7CA9C2",
      roughness: 0.8,
    });
    const hose = new THREE.MeshStandardMaterial({ color: HOSE_FARBE, roughness: 0.8 });
    return { haut, oberteil, hose };
  }, [colorIndex]);
}

export function Kind3D({ colorIndex, ausgewaehlt }: Kind3DProps) {
  const geometrien = useKindGeometrien();
  const materialien = useKindMaterialien(colorIndex);
  const gruppe = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const [huepferStart, setHuepferStart] = useState<number | null>(null);
  const reduced = useMemo(() => reducedMotion(), []);

  // Beim Umschalten von ausgewaehlt → nicht-ausgewaehlt den Hüpfer zurücksetzen.
  useEffect(() => {
    if (ausgewaehlt) {
      setHuepferStart(performance.now());
    } else {
      setHuepferStart(null);
    }
  }, [ausgewaehlt]);

  // Ressourcen abbauen.
  useEffect(() => {
    return () => {
      for (const g of Object.values(geometrien)) g.dispose();
      for (const m of Object.values(materialien)) m.dispose();
    };
  }, [geometrien, materialien]);

  useFrame(({ camera }) => {
    if (!gruppe.current) return;
    const now = performance.now();
    const dt = now / 1000;
    const root = gruppe.current;

    if (reduced) {
      root.position.y = 0;
      return;
    }

    // Idle-Wippen.
    let y = Math.sin(dt * 2) * cmZuEinheit(0.5);

    // Hüpfer bei Auswahl: 15 Frames ≈ 250 ms, Sinus-Bogen.
    if (huepferStart !== null) {
      const vergangen = (now - huepferStart) / 1000;
      if (vergangen < 0.25) {
        y += Math.sin(vergangen * Math.PI * 4) * cmZuEinheit(1.5);
      }
    }

    root.position.y = y;

    // Hover: Kopf zur Kamera drehen.
    // Wir drehen nur den Y-Anteil, sodass die Figur dem Betrachter zugewandt bleibt.
    if (hover) {
      const weltPosition = new THREE.Vector3();
      root.getWorldPosition(weltPosition);
      const richtung = new THREE.Vector3().subVectors(camera.position, weltPosition);
      const zielWinkel = Math.atan2(richtung.x, richtung.z);
      // Sanfte Annäherung.
      root.rotation.y += (zielWinkel - root.rotation.y) * 0.1;
    }
  });

  const rumpfY = cmZuEinheit(KIND.koerperhoehe / 2);
  const kopfY = cmZuEinheit(KIND.koerperhoehe + KIND.kopfdurchmesser / 2);
  const armX = cmZuEinheit(KIND.koerperbreite / 2 + 1);
  const armY = cmZuEinheit(KIND.koerperhoehe * 0.35);

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
      {/* Kopf */}
      <mesh
        geometry={geometrien.kopf}
        material={materialien.haut}
        position={[0, kopfY, 0]}
        castShadow
      >
        {/* Augen — zwei kleine Kugeln als minimale Mimik */}
        <mesh
          position={[cmZuEinheit(3), cmZuEinheit(1), cmZuEinheit(KIND.kopfdurchmesser / 2 - 0.5)]}
        >
          <sphereGeometry args={[cmZuEinheit(1), 8, 8]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh
          position={[-cmZuEinheit(3), cmZuEinheit(1), cmZuEinheit(KIND.kopfdurchmesser / 2 - 0.5)]}
        >
          <sphereGeometry args={[cmZuEinheit(1), 8, 8]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </mesh>

      {/* Rumpf */}
      <mesh
        geometry={geometrien.rumpf}
        material={materialien.oberteil}
        position={[0, rumpfY, 0]}
        castShadow
      />

      {/* Arme */}
      <group position={[0, armY, 0]}>
        <mesh
          geometry={geometrien.arm}
          material={materialien.haut}
          position={[armX, 0, 0]}
          rotation={[0, 0, hover ? -Math.PI / 3 : -0.15]}
          castShadow
        />
        <mesh
          geometry={geometrien.arm}
          material={materialien.haut}
          position={[-armX, 0, 0]}
          rotation={[0, 0, hover ? Math.PI / 6 : 0.15]}
          castShadow
        />
      </group>

      {/* Oberschenkel — sitzend nach vorne */}
      <group position={[0, cmZuEinheit(STUHL.sitzhoehe), cmZuEinheit(KIND.koerpertiefe / 4)]}>
        <mesh
          geometry={geometrien.oberschenkel}
          material={materialien.hose}
          position={[cmZuEinheit(4), 0, cmZuEinheit(KIND.oberschenkel / 2)]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        />
        <mesh
          geometry={geometrien.oberschenkel}
          material={materialien.hose}
          position={[-cmZuEinheit(4), 0, cmZuEinheit(KIND.oberschenkel / 2)]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        />
      </group>

      {/* Unterschenkel — senkrecht nach unten */}
      <group
        position={[
          0,
          cmZuEinheit(STUHL.sitzhoehe - KIND.unterschenkel / 2),
          cmZuEinheit(KIND.koerpertiefe / 4 + KIND.oberschenkel),
        ]}
      >
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
