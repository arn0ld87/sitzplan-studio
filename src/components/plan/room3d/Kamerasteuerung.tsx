// Orbit-Kamera: drehen, zoomen, verschieben — mit Leitplanken, damit der Raum
// nicht aus dem Bild fällt. Die Steuerung stammt aus `three/addons`; ein
// zusätzliches Steuerungspaket wäre dafür nicht nötig.

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as THREE from "three";
import type { RoomGeometry } from "@/data/types";
import {
  abstandsgrenzen,
  draufsichtKamera,
  raumMasse,
  startKamera,
  type Kamerastand,
} from "./geometrie";

export type Ansichtsmodus = "perspektive" | "draufsicht";

/** Läuft dieser Rechner mit reduzierter Bewegung? */
function bewegungReduziert(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function Kamerasteuerung({
  raum,
  modus,
  zuruecksetzen,
}: {
  raum: Pick<RoomGeometry, "width" | "height">;
  modus: Ansichtsmodus;
  /** Zählerstand: jede Erhöhung stellt die Startansicht wieder her. */
  zuruecksetzen: number;
}) {
  const kamera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const steuerung = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const c = new OrbitControls(kamera, gl.domElement);
    c.enableDamping = !bewegungReduziert();
    c.dampingFactor = 0.08;
    c.screenSpacePanning = false;
    // Unter den Fußboden zu tauchen hilft niemandem.
    c.maxPolarAngle = Math.PI / 2 - 0.04;
    c.minPolarAngle = 0;
    const grenzen = abstandsgrenzen(raum);
    c.minDistance = grenzen.min;
    c.maxDistance = grenzen.max;
    // Bedarfsmodus: jede Kamerabewegung fordert genau ein weiteres Bild an.
    const beiAenderung = () => invalidate();
    c.addEventListener("change", beiAenderung);
    steuerung.current = c;
    return () => {
      c.removeEventListener("change", beiAenderung);
      c.dispose();
      steuerung.current = null;
    };
  }, [kamera, gl, raum, invalidate]);

  // Kamerastand setzen: beim Aufbau, bei Moduswechsel und bei jedem Zurücksetzen.
  useEffect(() => {
    const c = steuerung.current;
    if (!c) return;
    const stand: Kamerastand = modus === "draufsicht" ? draufsichtKamera(raum) : startKamera(raum);
    kamera.position.set(...stand.position);
    c.target.set(...stand.ziel);
    c.update();
    invalidate();
  }, [kamera, raum, modus, zuruecksetzen, invalidate]);

  // Das Verschieben (Pan) darf den Blickpunkt nicht beliebig weit forttragen.
  const grenze = useRef(new THREE.Vector3());
  useFrame(() => {
    const c = steuerung.current;
    if (!c) return;
    const { breite, tiefe, hoehe } = raumMasse(raum);
    const rand = 0.6;
    const ziel = c.target;
    grenze.current.set(
      THREE.MathUtils.clamp(ziel.x, -breite / 2 - rand, breite / 2 + rand),
      THREE.MathUtils.clamp(ziel.y, 0, hoehe),
      THREE.MathUtils.clamp(ziel.z, -tiefe / 2 - rand, tiefe / 2 + rand),
    );
    if (!ziel.equals(grenze.current)) ziel.copy(grenze.current);
    c.update();
  });

  return null;
}
