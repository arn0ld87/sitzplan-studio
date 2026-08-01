import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  newId,
  type Furniture,
  type Room,
  type RoomGeometry,
  type SchoolClass,
  type SeatRule,
  type RuleKind,
  type SeatingPlan,
  type PlanStatus,
  type Student,
  type TrashItem,
} from "@/data/types";
import {
  klasseZuRow,
  planZuRow,
  raumZuRow,
  schuelerZuRow,
  regelZuRow,
  type SitzregelRow,
  type KlasseRow,
  type PlanRow,
  type RaumRow,
  type SchuelerRow,
} from "@/data/mapping";
import { STORE_VERSION, emptyData, zeilenZuAppData, type AppData } from "@/data/laden";
import { supabase } from "@/integrations/supabase/client";
import type { SaveState } from "@/components/ui-kit/SaveStatus";

const HISTORY_LIMIT = 40;

// Form und Filterregeln liegen in `@/data/laden` — dort ohne React und Supabase
// prüfbar. Hier weiterhin exportiert, damit die bisherigen Importpfade gelten.
export { STORE_VERSION, emptyData, type AppData };

export type Action =
  | { type: "hydrate"; data: AppData }
  | { type: "class/add"; name: string; note: string }
  | { type: "class/update"; id: string; name: string; note: string }
  | { type: "class/delete"; id: string }
  | {
      type: "student/add";
      classId: string;
      firstName: string;
      lastName: string;
      merkmale: string[];
      notiz: string;
    }
  | {
      type: "student/update";
      classId: string;
      id: string;
      firstName: string;
      lastName: string;
      merkmale: string[];
      notiz: string;
    }
  | { type: "student/remove"; classId: string; id: string }
  | { type: "room/add"; name: string; width: number; height: number; grid: number }
  | { type: "room/update"; id: string; name: string; width: number; height: number; grid: number }
  | { type: "room/furniture"; id: string; furniture: Furniture[] }
  | { type: "room/delete"; id: string }
  | { type: "plan/create"; title: string; classId: string; room: Room }
  | { type: "plan/update"; id: string; patch: Partial<Pick<SeatingPlan, "title" | "status">> }
  | { type: "plan/assignments"; id: string; assignments: Record<string, string> }
  | { type: "plan/delete"; id: string }
  | { type: "rule/add"; classId: string; a: string; b: string; kind: RuleKind }
  | { type: "rule/remove"; id: string }
  | { type: "trash/restore"; id: string }
  | { type: "trash/purge"; id: string };

const now = () => new Date().toISOString();

function trashPush(state: AppData, item: Omit<TrashItem, "id" | "deletedAt">): TrashItem[] {
  return [{ ...item, id: item.payload.id, deletedAt: now() }, ...state.trash];
}

function touchPlan(p: SeatingPlan): SeatingPlan {
  return { ...p, updated: now() };
}

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case "hydrate":
      return action.data;

    case "class/add": {
      const cls: SchoolClass = {
        id: newId(),
        name: action.name,
        note: action.note,
        colorIndex: state.classes.length % 8,
        students: [],
        createdAt: now(),
      };
      return { ...state, classes: [...state.classes, cls] };
    }
    case "class/update":
      return {
        ...state,
        classes: state.classes.map((c) =>
          c.id === action.id ? { ...c, name: action.name, note: action.note } : c,
        ),
      };
    case "class/delete": {
      const cls = state.classes.find((c) => c.id === action.id);
      if (!cls) return state;
      const betroffen = state.plans.filter((p) => p.classId === cls.id);
      let trash = trashPush(state, { kind: "klasse", name: cls.name, payload: cls });
      for (const p of betroffen) {
        trash = [
          { id: p.id, kind: "sitzplan", name: p.title, deletedAt: now(), payload: p },
          ...trash,
        ];
      }
      return {
        ...state,
        classes: state.classes.filter((c) => c.id !== cls.id),
        plans: state.plans.filter((p) => p.classId !== cls.id),
        rules: state.rules.filter((r) => r.classId !== cls.id),
        trash,
      };
    }

    case "student/add": {
      return {
        ...state,
        classes: state.classes.map((c) => {
          if (c.id !== action.classId) return c;
          const s: Student = {
            id: newId(),
            firstName: action.firstName,
            lastName: action.lastName,
            colorIndex: c.students.length % 8,
            merkmale: action.merkmale,
            notiz: action.notiz,
          };
          return { ...c, students: [...c.students, s] };
        }),
      };
    }
    case "student/update":
      return {
        ...state,
        classes: state.classes.map((c) =>
          c.id === action.classId
            ? {
                ...c,
                students: c.students.map((s) =>
                  s.id === action.id
                    ? {
                        ...s,
                        firstName: action.firstName,
                        lastName: action.lastName,
                        merkmale: action.merkmale,
                        notiz: action.notiz,
                      }
                    : s,
                ),
              }
            : c,
        ),
      };
    case "student/remove":
      return {
        ...state,
        rules: state.rules.filter((r) => r.a !== action.id && r.b !== action.id),
        classes: state.classes.map((c) =>
          c.id === action.classId
            ? { ...c, students: c.students.filter((s) => s.id !== action.id) }
            : c,
        ),
        plans: state.plans.map((p) => {
          if (p.classId !== action.classId) return p;
          const next = Object.fromEntries(
            Object.entries(p.assignments).filter(([, v]) => v !== action.id),
          );
          return Object.keys(next).length === Object.keys(p.assignments).length
            ? p
            : touchPlan({ ...p, assignments: next });
        }),
      };

    case "room/add": {
      const room: Room = {
        id: newId(),
        name: action.name,
        width: action.width,
        height: action.height,
        grid: action.grid,
        furniture: [],
        createdAt: now(),
      };
      return { ...state, rooms: [...state.rooms, room] };
    }
    case "room/update":
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.id
            ? {
                ...r,
                name: action.name,
                width: action.width,
                height: action.height,
                grid: action.grid,
              }
            : r,
        ),
      };
    case "room/furniture":
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.id ? { ...r, furniture: action.furniture } : r,
        ),
      };
    case "room/delete": {
      const room = state.rooms.find((r) => r.id === action.id);
      if (!room) return state;
      return {
        ...state,
        rooms: state.rooms.filter((r) => r.id !== room.id),
        trash: trashPush(state, { kind: "raum", name: room.name, payload: room }),
      };
    }

    case "plan/create": {
      const geometry: RoomGeometry = {
        name: action.room.name,
        width: action.room.width,
        height: action.room.height,
        grid: action.room.grid,
        furniture: action.room.furniture.map((f) => ({ ...f, seats: [...f.seats] })),
      };
      const plan: SeatingPlan = {
        id: newId(),
        title: action.title,
        classId: action.classId,
        roomId: action.room.id,
        room: geometry,
        status: "entwurf",
        updated: now(),
        assignments: {},
      };
      return { ...state, plans: [plan, ...state.plans] };
    }
    case "plan/update":
      return {
        ...state,
        plans: state.plans.map((p) =>
          p.id === action.id ? touchPlan({ ...p, ...action.patch }) : p,
        ),
      };
    case "plan/assignments":
      return {
        ...state,
        plans: state.plans.map((p) =>
          p.id === action.id ? touchPlan({ ...p, assignments: action.assignments }) : p,
        ),
      };
    case "plan/delete": {
      const plan = state.plans.find((p) => p.id === action.id);
      if (!plan) return state;
      return {
        ...state,
        plans: state.plans.filter((p) => p.id !== plan.id),
        trash: trashPush(state, { kind: "sitzplan", name: plan.title, payload: plan }),
      };
    }

    case "rule/add": {
      const regel: SeatRule = {
        id: newId(),
        classId: action.classId,
        a: action.a,
        b: action.b,
        kind: action.kind,
      };
      return { ...state, rules: [...state.rules, regel] };
    }
    case "rule/remove":
      return { ...state, rules: state.rules.filter((r) => r.id !== action.id) };

    case "trash/restore": {
      const item = state.trash.find((t) => t.id === action.id);
      if (!item) return state;
      const trash = state.trash.filter((t) => t.id !== item.id);
      if (item.kind === "klasse")
        return { ...state, trash, classes: [...state.classes, item.payload as SchoolClass] };
      if (item.kind === "raum")
        return { ...state, trash, rooms: [...state.rooms, item.payload as Room] };
      return { ...state, trash, plans: [item.payload as SeatingPlan, ...state.plans] };
    }
    case "trash/purge": {
      const item = state.trash.find((t) => t.id === action.id);
      if (!item) return state;
      // Abhängige Sitzpläne verschwinden mit — die Datenbank räumt gleich mit auf.
      const haengtDran = (t: TrashItem) => {
        if (t.id === item.id) return true;
        if (t.kind !== "sitzplan") return false;
        const p = t.payload as SeatingPlan;
        return item.kind === "klasse" ? p.classId === item.id : p.roomId === item.id;
      };
      return {
        ...state,
        trash: state.trash.filter((t) => !haengtDran(t)),
        plans: state.plans.filter((p) =>
          item.kind === "klasse" ? p.classId !== item.id : p.roomId !== item.id,
        ),
      };
    }

    default:
      return state;
  }
}

// ---------- Serverabgleich ----------

type Rows = {
  klassen: Record<string, KlasseRow>;
  schueler: Record<string, SchuelerRow>;
  raeume: Record<string, RaumRow>;
  sitzplaene: Record<string, PlanRow>;
  sitzregeln: Record<string, SitzregelRow>;
};

const leereRows = (): Rows => ({
  klassen: {},
  schueler: {},
  raeume: {},
  sitzplaene: {},
  sitzregeln: {},
});

function buildRows(data: AppData, userId: string): Rows {
  const rows = leereRows();
  const klasse = (c: SchoolClass, del: string | null) => {
    rows.klassen[c.id] = klasseZuRow(c, userId, del);
    for (const s of c.students) rows.schueler[s.id] = schuelerZuRow(s, c.id, userId, del);
  };
  for (const c of data.classes) klasse(c, null);
  for (const r of data.rules) rows.sitzregeln[r.id] = regelZuRow(r, userId, null);
  for (const r of data.rooms) rows.raeume[r.id] = raumZuRow(r, userId, null);
  for (const p of data.plans) rows.sitzplaene[p.id] = planZuRow(p, userId, null);
  for (const t of data.trash) {
    if (t.kind === "klasse") klasse(t.payload as SchoolClass, t.deletedAt);
    else if (t.kind === "raum")
      rows.raeume[t.payload.id] = raumZuRow(t.payload as Room, userId, t.deletedAt);
    else rows.sitzplaene[t.payload.id] = planZuRow(t.payload as SeatingPlan, userId, t.deletedAt);
  }
  return rows;
}

const TABELLEN = ["klassen", "raeume", "schueler", "sitzregeln", "sitzplaene"] as const;

async function pushRows(prev: Rows, next: Rows) {
  for (const t of TABELLEN) {
    const geaendert = Object.values(next[t]).filter(
      (row) => JSON.stringify(prev[t][row.id]) !== JSON.stringify(row),
    );
    if (geaendert.length === 0) continue;
    const { error } = await supabase.from(t).upsert(geaendert as never[]);
    if (error) throw new Error(`${t}: ${error.message}`);
  }
  for (const t of [...TABELLEN].reverse()) {
    const weg = Object.keys(prev[t]).filter((id) => !next[t][id]);
    if (weg.length === 0) continue;
    const { error } = await supabase.from(t).delete().in("id", weg);
    if (error) throw new Error(`${t}: ${error.message}`);
  }
}

async function ladeDaten(): Promise<AppData> {
  const [k, s, r, p, rg] = await Promise.all([
    supabase.from("klassen").select("*").order("created_at", { ascending: true }),
    supabase.from("schueler").select("*").order("created_at", { ascending: true }),
    supabase.from("raeume").select("*").order("created_at", { ascending: true }),
    supabase.from("sitzplaene").select("*").order("created_at", { ascending: false }),
    supabase.from("sitzregeln").select("*").order("created_at", { ascending: true }),
  ]);
  const fehler = k.error || s.error || r.error || p.error || rg.error;
  if (fehler) throw new Error(fehler.message);

  return zeilenZuAppData({
    klassen: (k.data ?? []) as unknown as KlasseRow[],
    schueler: (s.data ?? []) as unknown as SchuelerRow[],
    raeume: (r.data ?? []) as unknown as RaumRow[],
    plaene: (p.data ?? []) as unknown as PlanRow[],
    regeln: (rg.data ?? []) as unknown as SitzregelRow[],
  });
}

type Ctx = {
  data: AppData;
  hydrated: boolean;
  saveState: SaveState;
  online: boolean;
  dispatch: (a: Action) => void;
  retry: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [data, rawDispatch] = useReducer(reducer, emptyData);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("gespeichert");
  const [online, setOnline] = useState(true);
  const past = useRef<AppData[]>([]);
  const future = useRef<AppData[]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const current = useRef(data);
  current.current = data;

  // Letzter vom Server bestätigter Stand — Grundlage für Rücksprung bei Fehlern.
  const bestaetigt = useRef<AppData>(emptyData);
  const serverRows = useRef<Rows>(leereRows());
  const laeuft = useRef(false);
  const [dirtyTick, setDirtyTick] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const an = () => setOnline(true);
    const aus = () => setOnline(false);
    window.addEventListener("online", an);
    window.addEventListener("offline", aus);
    return () => {
      window.removeEventListener("online", an);
      window.removeEventListener("offline", aus);
    };
  }, []);

  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      try {
        const geladen = await ladeDaten();
        if (abgebrochen) return;
        bestaetigt.current = geladen;
        serverRows.current = buildRows(geladen, userId);
        rawDispatch({ type: "hydrate", data: geladen });
      } catch (e) {
        if (!abgebrochen) {
          console.error(e);
          toast.error("Daten konnten nicht geladen werden.");
          setSaveState("ungespeichert");
        }
      } finally {
        if (!abgebrochen) setHydrated(true);
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, [userId]);

  const dispatch = useCallback((a: Action) => {
    if (a.type !== "hydrate") {
      if (!navigator.onLine) {
        setSaveState("offline");
        toast.error("Offline — Änderungen werden nicht gespeichert.");
        return;
      }
      past.current = [...past.current, current.current].slice(-HISTORY_LIMIT);
      future.current = [];
      setHistoryTick((t) => t + 1);
      setSaveState("aenderungen");
      setDirtyTick((t) => t + 1);
    }
    rawDispatch(a);
  }, []);

  const undo = useCallback(() => {
    const prev = past.current[past.current.length - 1];
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [current.current, ...future.current].slice(0, HISTORY_LIMIT);
    setHistoryTick((t) => t + 1);
    setSaveState("aenderungen");
    setDirtyTick((t) => t + 1);
    rawDispatch({ type: "hydrate", data: prev });
  }, []);

  const redo = useCallback(() => {
    const next = future.current[0];
    if (!next) return;
    future.current = future.current.slice(1);
    past.current = [...past.current, current.current].slice(-HISTORY_LIMIT);
    setHistoryTick((t) => t + 1);
    setSaveState("aenderungen");
    setDirtyTick((t) => t + 1);
    rawDispatch({ type: "hydrate", data: next });
  }, []);

  const retry = useCallback(() => setDirtyTick((t) => t + 1), []);

  // Schreibt den aktuellen Stand zum Server. Optimistisch: die Oberfläche zeigt
  // die Änderung längst; bei einem Fehler springt sie auf den bestätigten Stand.
  useEffect(() => {
    if (!hydrated || dirtyTick === 0 || laeuft.current) return;
    if (!navigator.onLine) {
      setSaveState("offline");
      return;
    }
    const t = setTimeout(async () => {
      const ziel = current.current;
      const vorher = serverRows.current;
      const nachher = buildRows(ziel, userId);
      laeuft.current = true;
      setSaveState("speichert");
      try {
        await pushRows(vorher, nachher);
        serverRows.current = nachher;
        bestaetigt.current = ziel;
        setSaveState(current.current === ziel ? "gespeichert" : "aenderungen");
      } catch (e) {
        console.error(e);
        rawDispatch({ type: "hydrate", data: bestaetigt.current });
        past.current = [];
        future.current = [];
        setSaveState("ungespeichert");
        toast.error(
          "Speichern fehlgeschlagen — der letzte bestätigte Stand ist wiederhergestellt.",
          {
            action: { label: "Erneut versuchen", onClick: () => setDirtyTick((x) => x + 1) },
          },
        );
      } finally {
        laeuft.current = false;
        if (current.current !== ziel) setDirtyTick((x) => x + 1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [dirtyTick, hydrated, userId]);

  const value = useMemo<Ctx>(
    () => ({
      data,
      hydrated,
      saveState: !online ? "offline" : saveState,
      online,
      dispatch,
      retry,
      undo,
      redo,
      canUndo: past.current.length > 0,
      canRedo: future.current.length > 0,
    }),
    // canUndo/canRedo lesen aus past/future (Refs). React sieht deren
    // Mutation nicht, historyTick erzwingt daher die Neuberechnung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, hydrated, saveState, online, dispatch, retry, undo, redo, historyTick],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore muss innerhalb von StoreProvider verwendet werden");
  return ctx;
}

export function usePlanStatus(): PlanStatus[] {
  return ["entwurf", "aktiv", "archiv"];
}
