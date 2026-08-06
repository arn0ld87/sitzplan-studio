// Orbit-Kamera: drehen, zoomen, verschieben — mit Leitplanken, damit der Raum
// nicht aus dem Bild fällt. Die Steuerung stammt aus `three/addons`; ein
// zusätzliches Steuerungspaket wäre dafür nicht nötig.

import { useEffect, useMemo, useRef } from "react";
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

/** Ob das System weniger Bewegung wünscht — dann läuft die Kamera ohne Nachlauf. */
function bewegungReduziert(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Orbit-Kamera für den Raum, in Perspektive oder Draufsicht.
 *
 * Die Steuerung wird einmal aufgebaut und nur dann neu erzeugt, wenn sich die
 * Raummaße ändern — nicht bei jedem Rendern. Deshalb hängen beide Effekte an
 * {@link masse} und nicht am `raum`-Objekt, das der Aufrufer bei jedem Rendern
 * neu bilden darf.
 */
export function Kamerasteuerung({
  raum,
  modus,
  zuruecksetzen,
}: {
  raum: Pick<RoomGeometry, "width" | "height" | "vorn">;
  modus: Ansichtsmodus;
  /** Zählerstand: jede Erhöhung stellt die Startansicht wieder her. */
  zuruecksetzen: number;
}) {
  const kamera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const steuerung = useRef<OrbitControls | null>(null);

  // Nur Maße und Ausrichtung zählen. Ein neues `raum`-Objekt mit gleichen
  // Werten darf die Steuerung nicht neu aufbauen — sonst springt die Kamera.
  const masse = useMemo(
    () => ({ width: raum.width, height: raum.height, vorn: raum.vorn }),
    [raum.width, raum.height, raum.vorn],
  );

  useEffect(() => {
    const c = new OrbitControls(kamera, gl.domElement);
    c.enableDamping = !bewegungReduziert();
    c.dampingFactor = 0.08;
    c.screenSpacePanning = false;
    // Unter den Fußboden zu tauchen hilft niemandem.
    c.maxPolarAngle = Math.PI / 2 - 0.04;
    c.minPolarAngle = 0;
    const grenzen = abstandsgrenzen(masse);
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
  }, [kamera, gl, masse, invalidate]);

  // Kamerastand setzen: beim Aufbau, bei Moduswechsel und bei jedem Zurücksetzen.
  useEffect(() => {
    const c = steuerung.current;
    if (!c) return;
    const stand: Kamerastand =
      modus === "draufsicht" ? draufsichtKamera(masse) : startKamera(masse);
    kamera.position.set(...stand.position);
    c.target.set(...stand.ziel);
    c.update();
    invalidate();
  }, [kamera, masse, modus, zuruecksetzen, invalidate]);

  // Das Verschieben (Pan) darf den Blickpunkt nicht beliebig weit forttragen.
  const grenze = useRef<THREE.Vector3 | null>(null);
  useFrame(() => {
    const c = steuerung.current;
    if (!c) return;
    if (!grenze.current) grenze.current = new THREE.Vector3();
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
