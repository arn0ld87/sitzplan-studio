// Persönliche, stehende Lehrerinnenfigur für das erste Lehrerpult der 3D-Ansicht.
// Die abstrahierte Formsprache bleibt bei Three.js-Grundkörpern; Haarfarbe,
// Sonnenbrille und das gepunktete Kleid tragen die Wiedererkennbarkeit.

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Szenenfarben } from "./farben";
import { LEHRERIN, cmZuEinheit } from "./geometrie";

const HAUT_FARBE = "#e8c4a0";

const KLEID_FLECKEN = [
  [-7, 18, 11],
  [5, 19, 12],
  [-1, 11, 13],
  [9, 5, 12],
  [-9, 2, 12],
  [2, -4, 13],
  [-6, -13, 12],
  [8, -17, 11],
] as const;

function useGeometrien() {
  return useMemo(() => {
    const kugel = new THREE.SphereGeometry(1, 18, 14);
    const glied = new THREE.CylinderGeometry(1, 1, 1, 12);
    const rumpf = new THREE.CylinderGeometry(
      cmZuEinheit(LEHRERIN.koerperbreite * 0.38),
      cmZuEinheit(LEHRERIN.koerperbreite / 2),
      cmZuEinheit(LEHRERIN.koerperhoehe),
      16,
    );
    const quader = new THREE.BoxGeometry(1, 1, 1);
    const laecheln = new THREE.TorusGeometry(cmZuEinheit(3.2), cmZuEinheit(0.65), 8, 16, Math.PI);
    const guertel = new THREE.CylinderGeometry(
      cmZuEinheit(17),
      cmZuEinheit(18),
      cmZuEinheit(4),
      16,
    );
    const becher = new THREE.CylinderGeometry(
      cmZuEinheit(6),
      cmZuEinheit(5),
      cmZuEinheit(16),
      20,
      1,
      true,
    );
    const getraenk = new THREE.CylinderGeometry(
      cmZuEinheit(5.3),
      cmZuEinheit(4.4),
      cmZuEinheit(11),
      20,
    );
    const uhr = new THREE.TorusGeometry(cmZuEinheit(5), cmZuEinheit(1.1), 8, 18);
    return { kugel, glied, rumpf, quader, laecheln, guertel, becher, getraenk, uhr };
  }, []);
}

function useMaterialien(farben: Szenenfarben) {
  return useMemo(
    () => ({
      haut: new THREE.MeshStandardMaterial({ color: HAUT_FARBE, roughness: 0.72 }),
      haar: new THREE.MeshStandardMaterial({ color: farben["--action"], roughness: 0.82 }),
      kleid: new THREE.MeshStandardMaterial({ color: farben["--elevated"], roughness: 0.85 }),
      dunkel: new THREE.MeshStandardMaterial({ color: farben["--ink"], roughness: 0.66 }),
      leder: new THREE.MeshStandardMaterial({ color: farben["--wood"], roughness: 0.72 }),
      metall: new THREE.MeshStandardMaterial({
        color: farben["--metal"],
        roughness: 0.3,
        metalness: 0.38,
      }),
      glas: new THREE.MeshStandardMaterial({
        color: farben["--elevated"],
        roughness: 0.12,
        transparent: true,
        opacity: 0.36,
      }),
      getraenk: new THREE.MeshStandardMaterial({
        color: farben["--poster-a"],
        roughness: 0.25,
        transparent: true,
        opacity: 0.9,
      }),
    }),
    [farben],
  );
}

function Glied({
  von,
  nach,
  radius,
  geometrie,
  material,
}: {
  von: [number, number, number];
  nach: [number, number, number];
  radius: number;
  geometrie: THREE.BufferGeometry;
  material: THREE.Material;
}) {
  const start = new THREE.Vector3(...von);
  const ende = new THREE.Vector3(...nach);
  const richtung = ende.clone().sub(start);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    richtung.clone().normalize(),
  );

  return (
    <mesh
      geometry={geometrie}
      material={material}
      position={start.add(ende).multiplyScalar(0.5)}
      quaternion={quaternion}
      scale={[cmZuEinheit(radius), richtung.length(), cmZuEinheit(radius)]}
      castShadow
    />
  );
}

export function Lehrerin3D({ farben }: { farben: Szenenfarben }) {
  const geometrien = useGeometrien();
  const materialien = useMaterialien(farben);

  useEffect(
    () => () => {
      for (const geometrie of Object.values(geometrien)) geometrie.dispose();
      for (const material of Object.values(materialien)) material.dispose();
    },
    [geometrien, materialien],
  );

  const beinY = cmZuEinheit(LEHRERIN.beinhoehe / 2);
  const rumpfY = cmZuEinheit(LEHRERIN.beinhoehe + LEHRERIN.koerperhoehe / 2);
  const kopfY = cmZuEinheit(
    LEHRERIN.beinhoehe + LEHRERIN.koerperhoehe + LEHRERIN.kopfdurchmesser / 2,
  );
  const kopfRadius = cmZuEinheit(LEHRERIN.kopfdurchmesser / 2);

  return (
    <group>
      {/* Beine und Schuhe — hinter dem Pult meist nur aus schrägen Blickwinkeln sichtbar. */}
      {[-7, 7].map((x) => (
        <group key={x} position={[cmZuEinheit(x), 0, 0]}>
          <mesh
            geometry={geometrien.glied}
            material={materialien.haut}
            position={[0, beinY, 0]}
            scale={[cmZuEinheit(4), cmZuEinheit(LEHRERIN.beinhoehe), cmZuEinheit(4)]}
            castShadow
          />
          <mesh
            geometry={geometrien.quader}
            material={materialien.dunkel}
            position={[0, cmZuEinheit(3), cmZuEinheit(3)]}
            scale={[cmZuEinheit(10), cmZuEinheit(6), cmZuEinheit(16)]}
            castShadow
          />
        </group>
      ))}

      {/* Gepunktetes schwarz-weißes Kleid. */}
      <group position={[0, rumpfY, 0]}>
        <mesh geometry={geometrien.rumpf} material={materialien.kleid} castShadow />
        {KLEID_FLECKEN.map(([x, y, z], index) => (
          <mesh
            key={index}
            geometry={geometrien.kugel}
            material={materialien.dunkel}
            position={[cmZuEinheit(x), cmZuEinheit(y), cmZuEinheit(z)]}
            scale={[cmZuEinheit(2.6), cmZuEinheit(2), cmZuEinheit(0.8)]}
          />
        ))}
      </group>

      {/* Gürtel und Metallschnalle aus dem Figurenentwurf. */}
      <mesh
        geometry={geometrien.guertel}
        material={materialien.leder}
        position={[0, cmZuEinheit(LEHRERIN.beinhoehe + 22), 0]}
        castShadow
      />
      <mesh
        geometry={geometrien.quader}
        material={materialien.metall}
        position={[0, cmZuEinheit(LEHRERIN.beinhoehe + 22), cmZuEinheit(17.5)]}
        scale={[cmZuEinheit(11), cmZuEinheit(7), cmZuEinheit(2.5)]}
        castShadow
      />

      {/* Leicht angewinkelte Arme: links hält sie den Becher aus der Fotovorlage. */}
      <Glied
        von={[cmZuEinheit(-17), cmZuEinheit(128), 0]}
        nach={[cmZuEinheit(-22), cmZuEinheit(111), cmZuEinheit(5)]}
        radius={4.2}
        geometrie={geometrien.glied}
        material={materialien.haut}
      />
      <Glied
        von={[cmZuEinheit(-22), cmZuEinheit(111), cmZuEinheit(5)]}
        nach={[cmZuEinheit(-12), cmZuEinheit(110), cmZuEinheit(20)]}
        radius={3.5}
        geometrie={geometrien.glied}
        material={materialien.haut}
      />
      <Glied
        von={[cmZuEinheit(17), cmZuEinheit(128), 0]}
        nach={[cmZuEinheit(21), cmZuEinheit(112), cmZuEinheit(1)]}
        radius={4.2}
        geometrie={geometrien.glied}
        material={materialien.haut}
      />
      <Glied
        von={[cmZuEinheit(21), cmZuEinheit(112), cmZuEinheit(1)]}
        nach={[cmZuEinheit(22), cmZuEinheit(95), cmZuEinheit(3)]}
        radius={3.5}
        geometrie={geometrien.glied}
        material={materialien.haut}
      />
      {[-1, 1].map((seite) => (
        <mesh
          key={seite}
          geometry={geometrien.kugel}
          material={materialien.kleid}
          position={[cmZuEinheit(seite * 17), cmZuEinheit(128), 0]}
          scale={[cmZuEinheit(8), cmZuEinheit(7), cmZuEinheit(8)]}
          castShadow
        />
      ))}
      <mesh
        geometry={geometrien.kugel}
        material={materialien.haut}
        position={[cmZuEinheit(-12), cmZuEinheit(110), cmZuEinheit(20)]}
        scale={[cmZuEinheit(4), cmZuEinheit(5), cmZuEinheit(3.5)]}
      />
      <mesh
        geometry={geometrien.kugel}
        material={materialien.haut}
        position={[cmZuEinheit(22), cmZuEinheit(95), cmZuEinheit(3)]}
        scale={[cmZuEinheit(4), cmZuEinheit(5), cmZuEinheit(3.5)]}
      />
      <mesh
        geometry={geometrien.uhr}
        material={materialien.metall}
        position={[cmZuEinheit(22), cmZuEinheit(99), cmZuEinheit(3)]}
        rotation={[Math.PI / 2, 0, 0.1]}
      />

      <group position={[cmZuEinheit(-10), cmZuEinheit(111), cmZuEinheit(25)]}>
        <mesh geometry={geometrien.becher} material={materialien.glas} castShadow />
        <mesh
          geometry={geometrien.getraenk}
          material={materialien.getraenk}
          position={[0, cmZuEinheit(-1.5), 0]}
        />
      </group>

      {/* Kupferrotes, schulterlanges Haar liegt hinter Kopf und Gesicht. */}
      <group position={[0, kopfY, 0]}>
        <mesh
          geometry={geometrien.kugel}
          material={materialien.haar}
          position={[0, cmZuEinheit(-3), cmZuEinheit(-2)]}
          scale={[kopfRadius * 1.12, kopfRadius * 1.45, kopfRadius * 0.9]}
          castShadow
        />
        {[-1, 1].map((seite) => (
          <mesh
            key={seite}
            geometry={geometrien.kugel}
            material={materialien.haar}
            position={[cmZuEinheit(seite * 9), cmZuEinheit(-11), cmZuEinheit(-1)]}
            scale={[cmZuEinheit(4.5), cmZuEinheit(14), cmZuEinheit(4)]}
            castShadow
          />
        ))}
        <mesh
          geometry={geometrien.kugel}
          material={materialien.haut}
          scale={[kopfRadius * 0.84, kopfRadius, kopfRadius * 0.8]}
          castShadow
        />

        {/* Dunkle Cat-Eye-Brille und ein sichtbares Lächeln. */}
        {[-1, 1].map((seite) => (
          <mesh
            key={seite}
            geometry={geometrien.kugel}
            material={materialien.dunkel}
            position={[cmZuEinheit(seite * 5), cmZuEinheit(1.5), kopfRadius * 0.76]}
            scale={[cmZuEinheit(4.7), cmZuEinheit(3), cmZuEinheit(0.9)]}
          />
        ))}
        <mesh
          geometry={geometrien.quader}
          material={materialien.dunkel}
          position={[0, cmZuEinheit(1.5), kopfRadius * 0.78]}
          scale={[cmZuEinheit(2.5), cmZuEinheit(0.7), cmZuEinheit(0.8)]}
        />
        <mesh
          geometry={geometrien.laecheln}
          material={materialien.dunkel}
          position={[0, cmZuEinheit(-4), kopfRadius * 0.77]}
          rotation={[0, 0, Math.PI]}
        />
      </group>
    </group>
  );
}
