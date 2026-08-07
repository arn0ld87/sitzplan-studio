// Geteilte Three.js-Ressourcen für die Kinderfiguren der 3D-Ansicht.
//
// Kind3D-Instanzen teilen sich Geometrien und Materialien. Pro Klasse fallen
// bei einem vollen Sitzplan dreißig Figuren an; ohne diesen Bausatz wären das
// 240 eigenständige BufferGeometrien plus 90 Materialien. Mit Bausatz sind es
// sechs Geometrien plus drei Materialfamilien (Haut, Hose, Oberteil-Cache).
//
// Lebenszyklus: `useKinderBausatz` wird genau einmal pro Szene aufgerufen; der
// Cleanup-Effekt räumt alle geteilten Ressourcen beim Szenen-Abbau auf. Pro
// Kind-Komponente ist kein eigenes `useEffect` mehr nötig.

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { studentColor } from "@/data/types";
import { KIND, cmZuEinheit } from "./geometrie";

/** Lokales Koordinatensystem einer Kind3D-Instanz: Y=0 ist die Sitzfläche,
 * +Z zeigt vom Tisch weg. */
export type KinderBausatz = {
  /** Geometrien für Kopf, Rumpf und Gliedmaßen. */
  geometrien: {
    kopf: THREE.BufferGeometry;
    rumpf: THREE.BufferGeometry;
    arm: THREE.BufferGeometry;
    oberschenkel: THREE.BufferGeometry;
    bein: THREE.BufferGeometry;
    auge: THREE.BufferGeometry;
  };
  /** Materialien für Haut und Hose sowie der Oberteil-Cache pro Farbindex. */
  materialien: {
    haut: THREE.MeshStandardMaterial;
    hose: THREE.MeshStandardMaterial;
    /** Liefert für jeden `colorIndex` ein eigenes, wiederverwendetes Material. */
    oberteilFuer: (colorIndex: number) => THREE.MeshStandardMaterial;
  };
};

function baueGeometrien() {
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
  const oberschenkel = new THREE.CylinderGeometry(
    cmZuEinheit(3.5),
    cmZuEinheit(3.5),
    cmZuEinheit(KIND.oberschenkel),
    12,
  );
  const bein = new THREE.CylinderGeometry(
    cmZuEinheit(3),
    cmZuEinheit(3),
    cmZuEinheit(KIND.unterschenkel),
    12,
  );
  const auge = new THREE.SphereGeometry(cmZuEinheit(1), 8, 8);
  return { kopf, rumpf, arm, oberschenkel, bein, auge };
}

/** Reine Cache-Mechanik, getrennt vom React-Hook und damit ohne Three.js
 * initialisierbar testbar. */
export function baueOberteilCache(colorCount: number) {
  const cache: Record<number, THREE.MeshStandardMaterial> = {};
  const materialien: Set<THREE.MeshStandardMaterial> = new Set();
  const oberteilFuer = (colorIndex: number) => {
    const vorhanden = cache[colorIndex];
    if (vorhanden) return vorhanden;
    const material = new THREE.MeshStandardMaterial({
      color: studentColor(colorIndex) ?? "#7CA9C2",
      roughness: 0.8,
    });
    cache[colorIndex] = material;
    materialien.add(material);
    return material;
  };
  for (let i = 0; i < colorCount; i++) oberteilFuer(i);
  return { oberteilFuer, materialien };
}

/**
 * Erzeugt den Kinder-Bausatz einmalig für eine Szene und räumt beim Abbau auf.
 * `colorCount` deckt den Cache für Oberteile ab: für jeden Index 0..n-1 wird
 * genau ein Material bereitgestellt. Mehr Farben → mehr Materialien, bleibt
 * mit den üblichen acht Farben pro Klasse überschaubar.
 */
export function useKinderBausatz(colorCount: number): KinderBausatz {
  // Ref als Sidecar für alle dynamisch erzeugten Oberteile, damit auch sie
  // beim Szenen-Abbau aufgeräumt werden.
  const oberteileRef = useRef<Set<THREE.MeshStandardMaterial>>(new Set());

  const bausatz = useMemo<KinderBausatz>(() => {
    const geometrien = baueGeometrien();
    const haut = new THREE.MeshStandardMaterial({ color: "#e8c4a0", roughness: 0.7 });
    const hose = new THREE.MeshStandardMaterial({ color: "#5c6b73", roughness: 0.8 });
    const { oberteilFuer, materialien } = baueOberteilCache(colorCount);
    // Cache-Inhalt in die Sidecar-Sammlung spiegeln, damit dynamische
    // On-demand-Oberteile ebenfalls beim Aufräumen erfasst werden.
    for (const m of materialien) oberteileRef.current.add(m);
    return {
      geometrien,
      materialien: { haut, hose, oberteilFuer },
    };
  }, [colorCount]);

  useEffect(() => {
    // Snapshot der dynamisch erzeugten Oberteile für den Cleanup; das Ref
    // könnte sich bis dahin geändert haben.
    const oberteile = new Set(oberteileRef.current);
    return () => {
      for (const g of Object.values(bausatz.geometrien)) g.dispose();
      bausatz.materialien.haut.dispose();
      bausatz.materialien.hose.dispose();
      for (const m of oberteile) m.dispose();
    };
  }, [bausatz]);

  return bausatz;
}
