// Datentypen der Anwendung. Keine Inhalte — alles entsteht durch Eingabe.

export const STUDENT_COLORS = [
  "#E08A6B",
  "#9DBFA8",
  "#E3B56B",
  "#A99CCB",
  "#7CA9C2",
  "#D88BA0",
  "#B89970",
  "#82B7A5",
] as const;

export function studentColor(index: number) {
  return STUDENT_COLORS[
    ((index % STUDENT_COLORS.length) + STUDENT_COLORS.length) % STUDENT_COLORS.length
  ];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** UUID — die Kennung ist zugleich der Primärschlüssel in der Datenbank. */
export function newId(_prefix?: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  colorIndex: number;
};

export function studentName(s: Student) {
  return `${s.firstName} ${s.lastName}`.trim();
}

export type SchoolClass = {
  id: string;
  name: string;
  note: string;
  colorIndex: number;
  students: Student[];
  createdAt: string;
};

export type FurnitureKind = "einzeltisch" | "doppeltisch" | "pult" | "tafel" | "tuer" | "fenster";

export type Furniture = {
  id: string;
  kind: FurnitureKind;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  seats: string[];
};

export const FURNITURE_SPECS: Record<
  FurnitureKind,
  { label: string; w: number; h: number; seats: number }
> = {
  einzeltisch: { label: "Einzeltisch", w: 60, h: 50, seats: 1 },
  doppeltisch: { label: "Doppeltisch", w: 120, h: 50, seats: 2 },
  pult: { label: "Lehrerpult", w: 160, h: 80, seats: 0 },
  tafel: { label: "Tafel", w: 400, h: 15, seats: 0 },
  tuer: { label: "Tür", w: 90, h: 20, seats: 0 },
  fenster: { label: "Fenster", w: 15, h: 180, seats: 0 },
};

/** Sitzplatzkennung nach dem festen Muster `<objektId>__sitz_<n>`. */
export function seatId(objektId: string, n: number) {
  return `${objektId}__sitz_${n}`;
}

const SITZ_TRENNER = "__sitz_";

/**
 * Rückweg zu {@link seatId}: zerlegt eine Sitzplatzkennung in Objektkennung und
 * Nummer. `null`, wenn die Kennung nicht exakt dem Muster entspricht.
 *
 * Getrennt wird am **letzten** Vorkommen von `__sitz_`, damit Objektkennungen,
 * die selbst wie eine Sitzplatzkennung aussehen, den Rückweg überstehen.
 * Grenze: eine Objektkennung, die bereits auf `__sitz_<n>` endet, ist von einer
 * echten Sitzplatzkennung nicht unterscheidbar — das Format allein trägt diese
 * Information nicht.
 */
export function parseSeatId(id: string): { objektId: string; n: number } | null {
  const trenner = id.lastIndexOf(SITZ_TRENNER);
  if (trenner < 0) return null;
  const objektId = id.slice(0, trenner);
  const rest = id.slice(trenner + SITZ_TRENNER.length);
  if (!/^\d+$/.test(rest)) return null;
  const n = Number(rest);
  // Nur kanonische Kennungen gelten — schließt "007" oder "1e3" aus.
  if (seatId(objektId, n) !== id) return null;
  return { objektId, n };
}

export function makeFurniture(kind: FurnitureKind, x: number, y: number): Furniture {
  const id = newId();
  const n = FURNITURE_SPECS[kind].seats;
  const seats = Array.from({ length: n }, (_, i) => seatId(id, i + 1));
  return { id, kind, x, y, rotation: 0, seats };
}

/** Geometrie eines Raums — sowohl Vorlage als auch die Kopie im Sitzplan. */
export type RoomGeometry = {
  name: string;
  width: number;
  height: number;
  grid: number;
  furniture: Furniture[];
};

export type Room = RoomGeometry & { id: string; createdAt: string };

export type PlanStatus = "entwurf" | "aktiv" | "archiv";

export type SeatingPlan = {
  id: string;
  title: string;
  classId: string;
  /** Raumvorlage, aus der der Plan entstanden ist. */
  roomId: string;
  /** Kopie der Raumgeometrie zum Zeitpunkt des Anlegens (eingefroren). */
  room: RoomGeometry;
  status: PlanStatus;
  updated: string;
  assignments: Record<string, string>; // seatId -> studentId
};

export function seatCount(room: { furniture: Furniture[] }) {
  return room.furniture.reduce((n, f) => n + f.seats.length, 0);
}

export function allSeats(room: { furniture: Furniture[] }) {
  return room.furniture.flatMap((f) => f.seats);
}

export type TrashKind = "klasse" | "raum" | "sitzplan";

export type TrashItem = {
  id: string;
  kind: TrashKind;
  name: string;
  deletedAt: string;
  payload: SchoolClass | Room | SeatingPlan;
};

/** Sitzregel zwischen zwei Schülern derselben Klasse. */
export type RuleKind = "nicht_neben" | "muss_neben";

export type SeatRule = {
  id: string;
  classId: string;
  a: string;
  b: string;
  kind: RuleKind;
};
