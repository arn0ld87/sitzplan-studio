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

/**
 * Vorschlagsliste für Besonderheiten eines Schülers.
 *
 * Bewusst eine Liste und **keine Schranke**: `Student.merkmale` nimmt auch
 * Werte auf, die hier nicht stehen — der Schulalltag ist reicher als jede
 * Aufzählung. Bekannte Schlüssel werden zum deutschen Label, unbekannte
 * erscheinen wörtlich (siehe {@link merkmalLabel}).
 *
 * Merkmale sind Anzeige und Eingabe für den KI-Vorschlag. Sie erzeugen
 * **keine** prüfbaren Sitzregeln — dafür gibt es `sitzregeln.ts`.
 */
export const MERKMALE = [
  { id: "adhs", label: "ADHS" },
  { id: "autismus_spektrum", label: "Autismus-Spektrum" },
  { id: "schwerhoerig", label: "Schwerhörigkeit" },
  { id: "sehschwaeche", label: "Sehschwäche" },
  { id: "legasthenie", label: "Legasthenie" },
  { id: "dyskalkulie", label: "Dyskalkulie" },
  { id: "daz", label: "Deutsch als Zweitsprache" },
  { id: "nachteilsausgleich", label: "Nachteilsausgleich" },
  { id: "motorisch", label: "motorische Einschränkung" },
  { id: "chronisch_krank", label: "chronische Erkrankung" },
] as const;

/** Anzeigename eines Merkmals — unbekannte Werte bleiben, wie sie eingegeben wurden. */
export function merkmalLabel(id: string) {
  return MERKMALE.find((m) => m.id === id)?.label ?? id;
}

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  colorIndex: number;
  /** Schlüssel aus {@link MERKMALE} oder frei eingegebener Text. Nie `undefined`. */
  merkmale: string[];
  /** Freie Notiz zur Person. Leer heißt `""`, nicht `undefined`. */
  notiz: string;
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

/**
 * Lage der Sitzplätze auf einem Möbelstück, in Zentimetern relativ zu dessen
 * linker oberer Ecke — vor jeder Drehung.
 *
 * Gemeinsame Quelle für die SVG-Zeichnung und die 3D-Ansicht: beide setzen ihre
 * Sitzplätze an dieselben Punkte, damit kein zweites Sitzplatzraster entsteht.
 */
export function seatPositions(kind: FurnitureKind): { cx: number; cy: number }[] {
  const spec = FURNITURE_SPECS[kind];
  if (spec.seats === 1) return [{ cx: spec.w / 2, cy: spec.h / 2 }];
  if (spec.seats === 2)
    return [
      { cx: spec.w * 0.25, cy: spec.h / 2 },
      { cx: spec.w * 0.75, cy: spec.h / 2 },
    ];
  return [];
}

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

/**
 * Seite des Grundrisses, an der die Klasse „vorn" hat — dort steht in aller
 * Regel die Tafel. Bezugsystem ist die Zeichnung: „oben" ist die obere Kante
 * des Grundrisses, nicht eine Himmelsrichtung.
 */
export const VORN_SEITEN = ["oben", "rechts", "unten", "links"] as const;
export type VornSeite = (typeof VORN_SEITEN)[number];

export const VORN_LABEL: Record<VornSeite, string> = {
  oben: "Oben",
  rechts: "Rechts",
  unten: "Unten",
  links: "Links",
};

/**
 * Tolerante Lesart für Dokumente und Fremdwerte: Alles Unbekannte fällt auf
 * „oben" zurück — die stillschweigende Annahme aller Pläne vor diesem Feld.
 */
export function vornSeite(wert: unknown): VornSeite {
  return (VORN_SEITEN as readonly unknown[]).includes(wert) ? (wert as VornSeite) : "oben";
}

/** Geometrie eines Raums — sowohl Vorlage als auch die Kopie im Sitzplan. */
export type RoomGeometry = {
  name: string;
  width: number;
  height: number;
  grid: number;
  /** Wo die Klasse „vorn" hat — siehe {@link VornSeite}. */
  vorn: VornSeite;
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
