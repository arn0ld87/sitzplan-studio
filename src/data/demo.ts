// Fantasiedaten für die Demo. Kein Backend, keine echten Personen.

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
  return STUDENT_COLORS[index % STUDENT_COLORS.length];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export type Student = { id: string; name: string; colorIndex: number };

const NAMES = [
  "Alva Birkner",
  "Bo Castellan",
  "Cem Dorn",
  "Dara Elm",
  "Elif Fahr",
  "Finn Gorlitz",
  "Greta Halm",
  "Hanno Isen",
  "Ida Juhl",
  "Jaro Kell",
  "Kira Lund",
  "Levi Moor",
  "Mina Norr",
  "Noe Ostwald",
  "Ora Pels",
  "Pino Quandt",
  "Quirin Rasch",
  "Suri Tavor",
];

function makeStudents(prefix: string, count: number, offset = 0): Student[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-s${i + 1}`,
    name: NAMES[(i + offset) % NAMES.length]!,
    colorIndex: i,
  }));
}

export type SchoolClass = {
  id: string;
  name: string;
  note: string;
  colorIndex: number;
  students: Student[];
  rules: { id: string; text: string; kind: "trennen" | "zusammen" | "platz" }[];
  planIds: string[];
};

export const classes: SchoolClass[] = [
  {
    id: "7a",
    name: "Klasse 7a",
    note: "Deutsch, Klassenleitung",
    colorIndex: 0,
    students: makeStudents("7a", 18),
    rules: [
      { id: "r1", text: "Cem Dorn und Dara Elm nicht nebeneinander", kind: "trennen" },
      { id: "r2", text: "Alva Birkner in den vorderen zwei Reihen", kind: "platz" },
      { id: "r3", text: "Greta Halm und Ida Juhl als Lernpaar", kind: "zusammen" },
    ],
    planIds: ["p1", "p2"],
  },
  {
    id: "9c",
    name: "Klasse 9c",
    note: "Mathematik",
    colorIndex: 1,
    students: makeStudents("9c", 16, 3),
    rules: [{ id: "r1", text: "Levi Moor am Gang", kind: "platz" }],
    planIds: ["p3"],
  },
  {
    id: "5b",
    name: "Klasse 5b",
    note: "Erdkunde",
    colorIndex: 2,
    students: makeStudents("5b", 14, 6),
    rules: [],
    planIds: ["p4"],
  },
  {
    id: "6d",
    name: "Klasse 6d",
    note: "Deutsch, Vertretung",
    colorIndex: 3,
    students: makeStudents("6d", 15, 9),
    rules: [{ id: "r1", text: "Ora Pels und Pino Quandt trennen", kind: "trennen" }],
    planIds: [],
  },
  {
    id: "8a",
    name: "Klasse 8a",
    note: "Politik",
    colorIndex: 4,
    students: makeStudents("8a", 17, 2),
    rules: [],
    planIds: [],
  },
  {
    id: "10b",
    name: "Klasse 10b",
    note: "Deutsch, Prüfungsjahrgang",
    colorIndex: 5,
    students: makeStudents("10b", 12, 5),
    rules: [{ id: "r1", text: "Prüfungsabstand mindestens 80 cm", kind: "platz" }],
    planIds: [],
  },
];

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
  seats: string[]; // Sitzplatz-IDs
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

export type Room = {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: number;
  furniture: Furniture[];
};

function row(prefix: string, y: number, xs: number[], kind: FurnitureKind): Furniture[] {
  return xs.map((x, i) => ({
    id: `${prefix}-${i}`,
    kind,
    x,
    y,
    rotation: 0 as const,
    seats:
      FURNITURE_SPECS[kind].seats === 2
        ? [`${prefix}-${i}-a`, `${prefix}-${i}-b`]
        : FURNITURE_SPECS[kind].seats === 1
          ? [`${prefix}-${i}-a`]
          : [],
  }));
}

export const rooms: Room[] = [
  {
    id: "b204",
    name: "Raum B204",
    width: 720,
    height: 520,
    grid: 25,
    furniture: [
      { id: "tafel", kind: "tafel", x: 160, y: 40, rotation: 0, seats: [] },
      { id: "pult", kind: "pult", x: 280, y: 80, rotation: 0, seats: [] },
      { id: "tuer", kind: "tuer", x: 40, y: 470, rotation: 0, seats: [] },
      { id: "fenster1", kind: "fenster", x: 690, y: 120, rotation: 0, seats: [] },
      { id: "fenster2", kind: "fenster", x: 690, y: 320, rotation: 0, seats: [] },
      ...row("rA", 210, [80, 240, 400, 560], "doppeltisch"),
      ...row("rB", 300, [80, 240, 400, 560], "doppeltisch"),
      ...row("rC", 390, [80, 240, 400], "doppeltisch"),
      ...row("rD", 390, [560], "einzeltisch"),
    ],
  },
  {
    id: "a101",
    name: "Raum A101",
    width: 640,
    height: 480,
    grid: 25,
    furniture: [
      { id: "tafel", kind: "tafel", x: 120, y: 30, rotation: 0, seats: [] },
      { id: "pult", kind: "pult", x: 240, y: 70, rotation: 0, seats: [] },
      { id: "tuer", kind: "tuer", x: 30, y: 430, rotation: 0, seats: [] },
      ...row("gA", 190, [70, 380], "doppeltisch"),
      ...row("gB", 260, [70, 380], "doppeltisch"),
      ...row("gC", 350, [200], "doppeltisch"),
    ],
  },
  {
    id: "c12",
    name: "Raum C12",
    width: 560,
    height: 440,
    grid: 25,
    furniture: [
      { id: "tafel", kind: "tafel", x: 80, y: 30, rotation: 0, seats: [] },
      { id: "tuer", kind: "tuer", x: 30, y: 400, rotation: 0, seats: [] },
      { id: "fenster1", kind: "fenster", x: 530, y: 130, rotation: 0, seats: [] },
      ...row("kA", 170, [60, 220, 380], "einzeltisch"),
      ...row("kB", 260, [60, 220, 380], "einzeltisch"),
      ...row("kC", 340, [140, 300], "einzeltisch"),
    ],
  },
];

export type SeatingPlan = {
  id: string;
  title: string;
  classId: string;
  roomId: string;
  updated: string;
  status: "aktiv" | "entwurf" | "archiv";
  assignments: Record<string, string>; // seatId -> studentId
};

function autoAssign(roomId: string, classId: string, skip = 0): Record<string, string> {
  const room = rooms.find((r) => r.id === roomId)!;
  const cls = classes.find((c) => c.id === classId)!;
  const seats = room.furniture.flatMap((f) => f.seats);
  const out: Record<string, string> = {};
  cls.students.slice(0, Math.max(0, seats.length - skip)).forEach((s, i) => {
    if (seats[i]) out[seats[i]] = s.id;
  });
  return out;
}

export const plans: SeatingPlan[] = [
  {
    id: "p1",
    title: "Deutsch 7a — Halbjahr 2",
    classId: "7a",
    roomId: "b204",
    updated: "2026-08-01 07:42",
    status: "aktiv",
    assignments: autoAssign("b204", "7a", 2),
  },
  {
    id: "p2",
    title: "Gruppentische — Projektwoche",
    classId: "7a",
    roomId: "a101",
    updated: "2026-07-29 16:08",
    status: "entwurf",
    assignments: autoAssign("a101", "7a", 1),
  },
  {
    id: "p3",
    title: "Klassenarbeit — Reihen",
    classId: "9c",
    roomId: "c12",
    updated: "2026-07-24 11:15",
    status: "aktiv",
    assignments: autoAssign("c12", "9c", 0),
  },
  {
    id: "p4",
    title: "Stuhlkreis — Klassenrat",
    classId: "5b",
    roomId: "a101",
    updated: "2026-07-18 09:30",
    status: "archiv",
    assignments: autoAssign("a101", "5b", 3),
  },
];

export function seatCount(room: Room) {
  return room.furniture.reduce((n, f) => n + f.seats.length, 0);
}

export function getClass(id: string) {
  return classes.find((c) => c.id === id);
}
export function getRoom(id: string) {
  return rooms.find((r) => r.id === id);
}
export function getPlan(id: string) {
  return plans.find((p) => p.id === id);
}
