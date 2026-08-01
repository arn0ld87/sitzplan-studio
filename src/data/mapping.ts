// Übersetzung zwischen den Datenbankzeilen und den Formen, mit denen die
// Oberfläche arbeitet. Die Dokumentformate sind bewusst fachlich benannt.
import {
  FURNITURE_SPECS,
  initials,
  seatId,
  type Furniture,
  type FurnitureKind,
  type Room,
  type RoomGeometry,
  type SchoolClass,
  type SeatingPlan,
  type Student,
  type PlanStatus,
  type RuleKind,
  type SeatRule,
} from "./types";

export const RAUM_DOKUMENT_VERSION = 3;
export const PLAN_DOKUMENT_VERSION = 1;

const TYP_ZU_KIND: Record<string, FurnitureKind> = {
  table_single: "einzeltisch",
  table_double: "doppeltisch",
  teacher_desk: "pult",
  board: "tafel",
  door: "tuer",
  window: "fenster",
};

const KIND_ZU_TYP: Record<FurnitureKind, string> = {
  einzeltisch: "table_single",
  doppeltisch: "table_double",
  pult: "teacher_desk",
  tafel: "board",
  tuer: "door",
  fenster: "window",
};

export type CanvasObjekt = {
  id: string;
  typ: string;
  x_cm: number;
  y_cm: number;
  breite_cm: number;
  tiefe_cm: number;
  rotation_deg: number;
};

export type CanvasSitzplatz = {
  id: string;
  objektId: string;
  lokalX_cm: number;
  lokalY_cm: number;
  bezeichnung: string;
};

export type RaumDokument = { objekte: CanvasObjekt[]; sitzplaetze: CanvasSitzplatz[] };

/** Anker der Sitzplätze: Stirnseite des Tisches, gleichmäßig über die Breite verteilt. */
export function sitzplaetzeFuer(f: Furniture): CanvasSitzplatz[] {
  const spec = FURNITURE_SPECS[f.kind];
  const n = spec.seats;
  return Array.from({ length: n }, (_, i) => ({
    id: f.seats[i] ?? seatId(f.id, i + 1),
    objektId: f.id,
    lokalX_cm: (spec.w * (i + 0.5)) / n,
    lokalY_cm: spec.h / 2,
    bezeichnung: `Platz ${i + 1}`,
  }));
}

export function zuRaumDokument(furniture: Furniture[]): RaumDokument {
  return {
    objekte: furniture.map((f) => ({
      id: f.id,
      typ: KIND_ZU_TYP[f.kind],
      x_cm: f.x,
      y_cm: f.y,
      breite_cm: FURNITURE_SPECS[f.kind].w,
      tiefe_cm: FURNITURE_SPECS[f.kind].h,
      rotation_deg: f.rotation,
    })),
    sitzplaetze: furniture.flatMap(sitzplaetzeFuer),
  };
}

export function ausRaumDokument(doc: unknown): Furniture[] {
  const d = (doc ?? {}) as Partial<RaumDokument>;
  const objekte = Array.isArray(d.objekte) ? d.objekte : [];
  const plaetze = Array.isArray(d.sitzplaetze) ? d.sitzplaetze : [];
  return objekte.map((o) => {
    const kind = TYP_ZU_KIND[o.typ] ?? "einzeltisch";
    const rot = [0, 90, 180, 270].includes(Number(o.rotation_deg))
      ? (Number(o.rotation_deg) as 0 | 90 | 180 | 270)
      : 0;
    return {
      id: o.id,
      kind,
      x: Number(o.x_cm) || 0,
      y: Number(o.y_cm) || 0,
      rotation: rot,
      seats: plaetze.filter((p) => p.objektId === o.id).map((p) => p.id),
    };
  });
}

export type PlanDokument = {
  quelle: { klasseId: string; raumId: string };
  raumGeometrie: {
    breiteCm: number;
    laengeCm: number;
    rasterCm: number;
    objekte: CanvasObjekt[];
    sitzplaetze: CanvasSitzplatz[];
  };
  zuordnungen: { sitzplatzId: string; schuelerId: string }[];
};

export function zuPlanDokument(plan: SeatingPlan): PlanDokument {
  const doc = zuRaumDokument(plan.room.furniture);
  return {
    quelle: { klasseId: plan.classId, raumId: plan.roomId },
    raumGeometrie: {
      breiteCm: plan.room.width,
      laengeCm: plan.room.height,
      rasterCm: plan.room.grid,
      objekte: doc.objekte,
      sitzplaetze: doc.sitzplaetze,
    },
    zuordnungen: Object.entries(plan.assignments).map(([sitzplatzId, schuelerId]) => ({
      sitzplatzId,
      schuelerId,
    })),
  };
}

export function ausPlanDokument(
  doc: unknown,
  raumName: string,
): {
  room: RoomGeometry;
  assignments: Record<string, string>;
} {
  const d = (doc ?? {}) as Partial<PlanDokument>;
  const g = d.raumGeometrie ?? {
    breiteCm: 800,
    laengeCm: 600,
    rasterCm: 10,
    objekte: [],
    sitzplaetze: [],
  };
  const assignments: Record<string, string> = {};
  for (const z of d.zuordnungen ?? []) assignments[z.sitzplatzId] = z.schuelerId;
  return {
    room: {
      name: raumName,
      width: Number(g.breiteCm) || 0,
      height: Number(g.laengeCm) || 0,
      grid: Number(g.rasterCm) || 10,
      furniture: ausRaumDokument({ objekte: g.objekte ?? [], sitzplaetze: g.sitzplaetze ?? [] }),
    },
    assignments,
  };
}

// ---- Zeilenformen ----

export type KlasseRow = {
  id: string;
  user_id: string;
  name: string;
  notizen: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type SchuelerRow = {
  id: string;
  user_id: string;
  klasse_id: string;
  vorname: string;
  nachname: string;
  initialen: string;
  farb_index: number;
  deleted_at: string | null;
};

export type RaumRow = {
  id: string;
  user_id: string;
  name: string;
  breite_cm: number;
  laenge_cm: number;
  raster_cm: number;
  canvas_document: RaumDokument;
  dokument_version: number;
  created_at: string;
  deleted_at: string | null;
};

export type PlanRow = {
  id: string;
  user_id: string;
  klasse_id: string;
  raum_id: string;
  name: string;
  status: PlanStatus;
  canvas_document: PlanDokument;
  revision: number;
  dokument_version: number;
  deleted_at: string | null;
  updated_at?: string;
};

export function klasseZuRow(c: SchoolClass, userId: string, deletedAt: string | null): KlasseRow {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    notizen: c.note || null,
    created_at: c.createdAt,
    deleted_at: deletedAt,
  };
}

export function schuelerZuRow(
  s: Student,
  klasseId: string,
  userId: string,
  deletedAt: string | null,
): SchuelerRow {
  return {
    id: s.id,
    user_id: userId,
    klasse_id: klasseId,
    vorname: s.firstName,
    nachname: s.lastName,
    initialen: initials(`${s.firstName} ${s.lastName}`) || s.firstName.slice(0, 2).toUpperCase(),
    farb_index: ((s.colorIndex % 8) + 8) % 8,
    deleted_at: deletedAt,
  };
}

export function raumZuRow(r: Room, userId: string, deletedAt: string | null): RaumRow {
  return {
    id: r.id,
    user_id: userId,
    name: r.name,
    breite_cm: r.width,
    laenge_cm: r.height,
    raster_cm: r.grid,
    canvas_document: zuRaumDokument(r.furniture),
    dokument_version: RAUM_DOKUMENT_VERSION,
    created_at: r.createdAt,
    deleted_at: deletedAt,
  };
}

export function planZuRow(p: SeatingPlan, userId: string, deletedAt: string | null): PlanRow {
  return {
    id: p.id,
    user_id: userId,
    klasse_id: p.classId,
    raum_id: p.roomId,
    name: p.title,
    status: p.status,
    canvas_document: zuPlanDokument(p),
    revision: 1,
    dokument_version: PLAN_DOKUMENT_VERSION,
    deleted_at: deletedAt,
  };
}

export function rowZuKlasse(
  row: KlasseRow,
  schueler: SchuelerRow[],
  colorIndex: number,
): SchoolClass {
  return {
    id: row.id,
    name: row.name,
    note: row.notizen ?? "",
    colorIndex,
    createdAt: row.created_at,
    students: schueler.map((s) => ({
      id: s.id,
      firstName: s.vorname,
      lastName: s.nachname,
      colorIndex: s.farb_index,
    })),
  };
}

export function rowZuRaum(row: RaumRow): Room {
  return {
    id: row.id,
    name: row.name,
    width: Number(row.breite_cm),
    height: Number(row.laenge_cm),
    grid: Number(row.raster_cm),
    furniture: ausRaumDokument(row.canvas_document),
    createdAt: row.created_at,
  };
}

export function rowZuPlan(row: PlanRow, raumName: string): SeatingPlan {
  const { room, assignments } = ausPlanDokument(row.canvas_document, raumName);
  return {
    id: row.id,
    title: row.name,
    classId: row.klasse_id,
    roomId: row.raum_id,
    room,
    status: row.status,
    updated: row.updated_at ?? row.deleted_at ?? new Date().toISOString(),
    assignments,
  };
}

// ---- Sitzregeln ----

export type SitzregelRow = {
  id: string;
  user_id: string;
  klasse_id: string;
  schueler_a: string;
  schueler_b: string;
  art: RuleKind;
  deleted_at: string | null;
};

export function regelZuRow(r: SeatRule, userId: string, deletedAt: string | null): SitzregelRow {
  return {
    id: r.id,
    user_id: userId,
    klasse_id: r.classId,
    schueler_a: r.a,
    schueler_b: r.b,
    art: r.kind,
    deleted_at: deletedAt,
  };
}

export function rowZuRegel(row: SitzregelRow): SeatRule {
  return {
    id: row.id,
    classId: row.klasse_id,
    a: row.schueler_a,
    b: row.schueler_b,
    kind: row.art,
  };
}
