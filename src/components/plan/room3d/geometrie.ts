// Umrechnung zwischen dem zentimetergenauen Grundriss und der 3D-Szene.
//
// Achsen und Ursprung
// -------------------
// Der Grundriss rechnet in Zentimetern: Ursprung in der linken oberen Raumecke,
// x nach rechts, y nach unten. Die Szene rechnet in Welteinheiten zu je 100 cm,
// Ursprung in der Raummitte auf Fußbodenhöhe:
//
//     3D-X = (2D-x − Raumbreite / 2) / 100   nach rechts
//     3D-Z = (2D-y − Raumtiefe  / 2) / 100   nach hinten, im Grundrissbild nach unten
//     3D-Y = Höhe über dem Fußboden  / 100   nach oben
//
// Die obere Grundrisskante (2D-y = 0) liegt damit bei negativem Z. Dort steht in
// aller Regel die Tafel, weshalb die Startkamera von positivem Z aus blickt.
//
// Drehung
// -------
// Eine SVG-Drehung um `deg` dreht im Bild im Uhrzeigersinn: der lokale +x-Vektor
// wandert nach +y, in der Szene also nach +Z. Eine Drehung um die Y-Achse
// schickt +X dagegen nach −Z. Die Szene dreht deshalb um den **negativen**
// Winkel — nur so decken sich 2D- und 3D-Darstellung bei 90°, 180° und 270°.

import {
  FURNITURE_SPECS,
  seatPositions,
  type Furniture,
  type FurnitureKind,
  type RoomGeometry,
  type VornSeite,
} from "@/data/types";

/** Maßstab der Szene: 100 cm entsprechen einer Welteinheit. */
export const CM_PRO_EINHEIT = 100;

/** Lichte Raumhöhe. Der Grundriss kennt nur Breite und Tiefe. */
export const RAUMHOEHE_CM = 300;

/** Wandstärke der Raumhülle. */
export const WANDSTAERKE_CM = 12;

/** Rechnet eine Länge in Zentimetern in Welteinheiten um. */
export function cmZuEinheit(cm: number): number {
  return cm / CM_PRO_EINHEIT;
}

/** Rechnet eine Länge in Welteinheiten in Zentimeter um. */
export function einheitZuCm(einheiten: number): number {
  return einheiten * CM_PRO_EINHEIT;
}

/**
 * Aufbauhöhe je Möbelart in Zentimetern. `hoehe` ist die Bauhöhe,
 * `sockel` die Unterkante über dem Fußboden.
 *
 * Diese Werte gibt der Grundriss nicht her — er kennt nur die Draufsicht.
 * Gewählt sind übliche Maße für Klassenraummobiliar.
 */
export const MOEBEL_AUFBAU: Record<FurnitureKind, { hoehe: number; sockel: number }> = {
  einzeltisch: { hoehe: 75, sockel: 0 },
  doppeltisch: { hoehe: 75, sockel: 0 },
  pult: { hoehe: 78, sockel: 0 },
  tafel: { hoehe: 120, sockel: 90 },
  tuer: { hoehe: 205, sockel: 0 },
  fenster: { hoehe: 120, sockel: 90 },
};

/** Maße eines einfachen Stuhls in Zentimetern. */
export const STUHL = {
  breite: 42,
  tiefe: 42,
  sitzhoehe: 45,
  lehnenhoehe: 42,
  /** Abstand zwischen Tischkante und Stuhlvorderkante. */
  abstand: 10,
} as const;

export type Platzierung = {
  /** Weltposition des Möbelmittelpunkts; Y ist die **Unterkante**. */
  position: [number, number, number];
  /** Drehung um die Y-Achse in Radiant. */
  drehung: number;
  /** Kantenlängen in Welteinheiten, vor der Drehung gemessen. */
  masse: { breite: number; hoehe: number; tiefe: number };
};

/**
 * Wandelt eine Grundriss-Drehung in Grad in die Szenendrehung in Radiant um —
 * mit dem oben erläuterten negativen Vorzeichen.
 */
export function drehungZuRadiant(rotation: Furniture["rotation"]): number {
  return (-rotation * Math.PI) / 180;
}

/**
 * Position, Drehung und Maße eines Möbelstücks in der 3D-Szene.
 * `raum` dient dazu, das Stück relativ zur Raummitte zu zentrieren.
 */
export function moebelPlatzierung(
  f: Furniture,
  raum: Pick<RoomGeometry, "width" | "height">,
): Platzierung {
  const spec = FURNITURE_SPECS[f.kind];
  const aufbau = MOEBEL_AUFBAU[f.kind];
  return {
    position: [
      cmZuEinheit(f.x + spec.w / 2 - raum.width / 2),
      cmZuEinheit(aufbau.sockel),
      cmZuEinheit(f.y + spec.h / 2 - raum.height / 2),
    ],
    drehung: drehungZuRadiant(f.rotation),
    masse: {
      breite: cmZuEinheit(spec.w),
      hoehe: cmZuEinheit(aufbau.hoehe),
      tiefe: cmZuEinheit(spec.h),
    },
  };
}

/**
 * Grundfläche eines Möbelstücks **nach** der Drehung, in Welteinheiten.
 * Bei 90° und 270° tauschen Breite und Tiefe die Rollen.
 */
export function gedrehteGrundflaeche(f: Furniture): { breite: number; tiefe: number } {
  const spec = FURNITURE_SPECS[f.kind];
  const quer = f.rotation === 90 || f.rotation === 270;
  return {
    breite: cmZuEinheit(quer ? spec.h : spec.w),
    tiefe: cmZuEinheit(quer ? spec.w : spec.h),
  };
}

/**
 * Position eines Sitzplatzes im lokalen Koordinatensystem des Möbelstücks.
 * Liefert `null`, wenn das Möbelstück an diesem Index keinen Sitzplatz hat.
 */
export function stuhlPlatzierung(
  kind: FurnitureKind,
  index: number,
): { position: [number, number, number] } | null {
  const spec = FURNITURE_SPECS[kind];
  const sitz = seatPositions(kind)[index];
  if (!sitz) return null;
  return {
    position: [
      cmZuEinheit(sitz.cx - spec.w / 2),
      0,
      cmZuEinheit(spec.h / 2 + STUHL.abstand + STUHL.tiefe / 2),
    ],
  };
}

/** Raummaße (Breite, Tiefe, Höhe) in Welteinheiten. */
export function raumMasse(raum: Pick<RoomGeometry, "width" | "height">): {
  breite: number;
  tiefe: number;
  hoehe: number;
} {
  return {
    breite: cmZuEinheit(raum.width),
    tiefe: cmZuEinheit(raum.height),
    hoehe: cmZuEinheit(RAUMHOEHE_CM),
  };
}

export type Kamerastand = {
  position: [number, number, number];
  ziel: [number, number, number];
};

/** Längere Raumkante, dient als Bezugsgröße für Kameraabstände. */
function spanne(raum: Pick<RoomGeometry, "width" | "height">): number {
  const { breite, tiefe } = raumMasse(raum);
  return Math.max(breite, tiefe);
}

/**
 * Perspektivkamera erhöht und der Vorn-Kante gegenüber positioniert. `vorn`
 * dreht die Kamera um den Raum, sodass die Klasse immer von „hinten" auf die
 * Vorn-Kante blickt — unabhängig davon, welche Seite des Grundrisses „vorn" ist.
 * Fehlt `vorn` (etwa in alten Tests), gilt „oben" und die Kamera steht wie
 * bisher bei positivem Z.
 */
export function startKamera(
  raum: Pick<RoomGeometry, "width" | "height"> & { vorn?: VornSeite },
): Kamerastand {
  const s = spanne(raum);
  const y = s * 0.78;
  const lang = s * 1.05;
  const quer = s * 0.62;
  const ziel = [0, cmZuEinheit(60), 0] as [number, number, number];
  switch (raum.vorn ?? "oben") {
    case "unten":
      return { position: [quer, y, -lang], ziel };
    case "links":
      return { position: [lang, y, quer], ziel };
    case "rechts":
      return { position: [-lang, y, quer], ziel };
    default:
      return { position: [quer, y, lang], ziel };
  }
}

/** Nahezu senkrechte Draufsicht-Kamera, ausgerichtet wie der Grundriss. */
export function draufsichtKamera(raum: Pick<RoomGeometry, "width" | "height">): Kamerastand {
  const s = spanne(raum);
  return {
    // Ein Hauch Versatz in Z, damit Blickrichtung und Oben-Vektor der Kamera
    // nicht exakt parallel liegen — sonst ist die Kameraausrichtung unbestimmt.
    position: [0, s * 1.35, 0.001],
    ziel: [0, 0, 0],
  };
}

/** Minimaler und maximaler Kameraabstand, abhängig von der Raumgröße. */
export function abstandsgrenzen(raum: Pick<RoomGeometry, "width" | "height">): {
  min: number;
  max: number;
} {
  const s = spanne(raum);
  return { min: Math.max(0.8, s * 0.15), max: s * 2.6 };
}

export type Wandseite = "nord" | "sued" | "west" | "ost";

export const WANDSEITEN: readonly Wandseite[] = ["nord", "sued", "west", "ost"] as const;

/** Prüft, ob eine Wand zwischen Kamera und Raum liegt — `true`, wenn die Kamera außerhalb dieser Wand steht. */
export function wandVerdeckt(
  seite: Wandseite,
  kamera: { x: number; z: number },
  raum: Pick<RoomGeometry, "width" | "height">,
): boolean {
  const { breite, tiefe } = raumMasse(raum);
  switch (seite) {
    case "nord":
      return kamera.z < -tiefe / 2;
    case "sued":
      return kamera.z > tiefe / 2;
    case "west":
      return kamera.x < -breite / 2;
    case "ost":
      return kamera.x > breite / 2;
  }
}

/** Deckkraft einer Wand: `0.06`, wenn sie den Blick auf den Raum verstellt, sonst `1`. */
export function wandDeckkraft(
  seite: Wandseite,
  kamera: { x: number; z: number },
  raum: Pick<RoomGeometry, "width" | "height">,
): number {
  return wandVerdeckt(seite, kamera, raum) ? 0.06 : 1;
}

/** Mittelposition, Drehung in Radiant und Länge einer Raumwand. */
export function wandPlatzierung(
  seite: Wandseite,
  raum: Pick<RoomGeometry, "width" | "height">,
): { position: [number, number, number]; drehung: number; laenge: number } {
  const { breite, tiefe, hoehe } = raumMasse(raum);
  const halbeStaerke = cmZuEinheit(WANDSTAERKE_CM) / 2;
  const y = hoehe / 2;
  switch (seite) {
    case "nord":
      return { position: [0, y, -tiefe / 2 - halbeStaerke], drehung: 0, laenge: breite };
    case "sued":
      return { position: [0, y, tiefe / 2 + halbeStaerke], drehung: 0, laenge: breite };
    case "west":
      return {
        position: [-breite / 2 - halbeStaerke, y, 0],
        drehung: Math.PI / 2,
        laenge: tiefe,
      };
    case "ost":
      return {
        position: [breite / 2 + halbeStaerke, y, 0],
        drehung: Math.PI / 2,
        laenge: tiefe,
      };
  }
}
