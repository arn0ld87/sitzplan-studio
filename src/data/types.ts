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
  return STUDENT_COLORS[((index % STUDENT_COLORS.length) + STUDENT_COLORS.length) % STUDENT_COLORS.length];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function newId(prefix: string) {
  // UUIDs, damit Datensätze direkt Primärschlüssel der Datenbank sein können.
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
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

export type FurnitureKind =
  | "einzeltisch"
  | "doppeltisch"
  | "pult"
  | "tafel"
  | "tuer"
  | "fenster";

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

export function makeFurniture(kind: FurnitureKind, x: number, y: number): Furniture {
  const id = newId(kind);
  const n = FURNITURE_SPECS[kind].seats;
  const seats = Array.from({ length: n }, (_, i) => `${id}-s${i + 1}`);
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
  /** Kopie der Raumgeometrie zum Zeitpunkt des Anlegens. */
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
