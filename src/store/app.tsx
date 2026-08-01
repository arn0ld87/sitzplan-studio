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
import {
  newId,
  type Furniture,
  type Room,
  type RoomGeometry,
  type SchoolClass,
  type SeatingPlan,
  type PlanStatus,
  type Student,
  type TrashItem,
} from "@/data/types";
import type { SaveState } from "@/components/ui-kit/SaveStatus";

export const STORE_VERSION = 1;
const STORAGE_KEY = "sitzplan.state";
const HISTORY_LIMIT = 40;

export type AppData = {
  version: number;
  classes: SchoolClass[];
  rooms: Room[];
  plans: SeatingPlan[];
  trash: TrashItem[];
};

export const emptyData: AppData = {
  version: STORE_VERSION,
  classes: [],
  rooms: [],
  plans: [],
  trash: [],
};

export type Action =
  | { type: "hydrate"; data: AppData }
  | { type: "class/add"; name: string; note: string }
  | { type: "class/update"; id: string; name: string; note: string }
  | { type: "class/delete"; id: string }
  | { type: "student/add"; classId: string; firstName: string; lastName: string }
  | { type: "student/update"; classId: string; id: string; firstName: string; lastName: string }
  | { type: "student/remove"; classId: string; id: string }
  | { type: "room/add"; name: string; width: number; height: number; grid: number }
  | { type: "room/update"; id: string; name: string; width: number; height: number; grid: number }
  | { type: "room/furniture"; id: string; furniture: Furniture[] }
  | { type: "room/delete"; id: string }
  | { type: "plan/create"; title: string; classId: string; room: Room }
  | { type: "plan/update"; id: string; patch: Partial<Pick<SeatingPlan, "title" | "status">> }
  | { type: "plan/assignments"; id: string; assignments: Record<string, string> }
  | { type: "plan/delete"; id: string }
  | { type: "trash/restore"; id: string }
  | { type: "trash/purge"; id: string };

const now = () => new Date().toISOString();

function trashPush(state: AppData, item: Omit<TrashItem, "id" | "deletedAt">): TrashItem[] {
  return [{ ...item, id: newId("trash"), deletedAt: now() }, ...state.trash];
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
        id: newId("k"),
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
          { id: newId("trash"), kind: "sitzplan", name: p.title, deletedAt: now(), payload: p },
          ...trash,
        ];
      }
      return {
        ...state,
        classes: state.classes.filter((c) => c.id !== cls.id),
        plans: state.plans.filter((p) => p.classId !== cls.id),
        trash,
      };
    }

    case "student/add": {
      return {
        ...state,
        classes: state.classes.map((c) => {
          if (c.id !== action.classId) return c;
          const s: Student = {
            id: newId("s"),
            firstName: action.firstName,
            lastName: action.lastName,
            colorIndex: c.students.length % 8,
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
                    ? { ...s, firstName: action.firstName, lastName: action.lastName }
                    : s,
                ),
              }
            : c,
        ),
      };
    case "student/remove":
      return {
        ...state,
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
        id: newId("r"),
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
        id: newId("p"),
        title: action.title,
        classId: action.classId,
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
        plans: state.plans.map((p) => (p.id === action.id ? touchPlan({ ...p, ...action.patch }) : p)),
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
    case "trash/purge":
      return { ...state, trash: state.trash.filter((t) => t.id !== action.id) };

    default:
      return state;
  }
}

function load(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== STORE_VERSION) return null; // Formatwechsel: sauber neu starten
    return {
      version: STORE_VERSION,
      classes: Array.isArray(parsed.classes) ? parsed.classes : [],
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      trash: Array.isArray(parsed.trash) ? parsed.trash : [],
    };
  } catch {
    return null;
  }
}

type Ctx = {
  data: AppData;
  hydrated: boolean;
  saveState: SaveState;
  dispatch: (a: Action) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, rawDispatch] = useReducer(reducer, emptyData);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("gespeichert");
  const past = useRef<AppData[]>([]);
  const future = useRef<AppData[]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const current = useRef(data);
  current.current = data;

  useEffect(() => {
    const loaded = load();
    if (loaded) rawDispatch({ type: "hydrate", data: loaded });
    setHydrated(true);
  }, []);

  const dispatch = useCallback((a: Action) => {
    if (a.type !== "hydrate") {
      past.current = [...past.current, current.current].slice(-HISTORY_LIMIT);
      future.current = [];
      setHistoryTick((t) => t + 1);
    }
    rawDispatch(a);
  }, []);

  const undo = useCallback(() => {
    const prev = past.current[past.current.length - 1];
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [current.current, ...future.current].slice(0, HISTORY_LIMIT);
    setHistoryTick((t) => t + 1);
    rawDispatch({ type: "hydrate", data: prev });
  }, []);

  const redo = useCallback(() => {
    const next = future.current[0];
    if (!next) return;
    future.current = future.current.slice(1);
    past.current = [...past.current, current.current].slice(-HISTORY_LIMIT);
    setHistoryTick((t) => t + 1);
    rawDispatch({ type: "hydrate", data: next });
  }, []);

  // Persistenz: sofort schreiben, Status als Verlauf zeigen
  const first = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      setSaveState("ungespeichert");
      return;
    }
    setSaveState("aenderungen");
    const t1 = setTimeout(() => setSaveState("speichert"), 220);
    const t2 = setTimeout(() => setSaveState("gespeichert"), 560);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [data, hydrated]);

  const value = useMemo<Ctx>(
    () => ({
      data,
      hydrated,
      saveState,
      dispatch,
      undo,
      redo,
      canUndo: past.current.length > 0,
      canRedo: future.current.length > 0,
    }),
    // historyTick hält canUndo/canRedo aktuell
    [data, hydrated, saveState, dispatch, undo, redo, historyTick],
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
