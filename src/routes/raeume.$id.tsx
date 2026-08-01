import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Minus,
  Plus,
  RotateCw,
  Copy,
  Trash2,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { SaveStatus, type SaveState } from "@/components/ui-kit/SaveStatus";
import { RoomPlan, FurnitureShape } from "@/components/plan/RoomPlan";
import {
  FURNITURE_SPECS,
  getRoom,
  seatCount,
  type Furniture,
  type FurnitureKind,
} from "@/data/demo";

export const Route = createFileRoute("/raeume/$id")({
  loader: ({ params }) => {
    const room = getRoom(params.id);
    if (!room) throw notFound();
    return { name: room.name, width: room.width, height: room.height };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [{ title: "Raum nicht gefunden — Sitzplan" }, { name: "robots", content: "noindex" }],
      };
    return {
      meta: [
        { title: `${loaderData.name} bearbeiten — Sitzplan` },
        {
          name: "description",
          content: `Grundriss von ${loaderData.name} (${loaderData.width} × ${loaderData.height} cm) mit Möbeln und Sitzplätzen bearbeiten.`,
        },
        { property: "og:title", content: `${loaderData.name} bearbeiten — Sitzplan` },
        {
          property: "og:description",
          content: `Grundriss von ${loaderData.name} mit Möbeln und Sitzplätzen bearbeiten.`,
        },
      ],
    };
  },
  component: Raumeditor,
});

const PALETTE: FurnitureKind[] = [
  "einzeltisch",
  "doppeltisch",
  "pult",
  "tafel",
  "tuer",
  "fenster",
];

function Raumeditor() {
  const { id } = Route.useParams();
  const base = getRoom(id)!;
  const [furniture, setFurniture] = useState<Furniture[]>(base.furniture);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [past, setPast] = useState<Furniture[][]>([]);
  const [future, setFuture] = useState<Furniture[][]>([]);
  const [saveState, setSaveState] = useState<SaveState>("gespeichert");

  const room = useMemo(() => ({ ...base, furniture }), [base, furniture]);
  const selected = furniture.find((f) => f.id === selectedId) ?? null;

  function commit(next: Furniture[]) {
    setPast((p) => [...p, furniture]);
    setFuture([]);
    setFurniture(next);
    setSaveState("aenderungen");
  }

  function undo() {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1]!;
      setFuture((f) => [furniture, ...f]);
      setFurniture(prev);
      return p.slice(0, -1);
    });
  }
  function redo() {
    setFuture((f) => {
      if (f.length === 0) return f;
      setPast((p) => [...p, furniture]);
      setFurniture(f[0]!);
      return f.slice(1);
    });
  }

  function update(patch: Partial<Furniture>) {
    if (!selected) return;
    commit(furniture.map((f) => (f.id === selected.id ? { ...f, ...patch } : f)));
  }

  function addFurniture(kind: FurnitureKind) {
    const n = `${kind}-${Date.now()}`;
    const spec = FURNITURE_SPECS[kind];
    const nf: Furniture = {
      id: n,
      kind,
      x: 100,
      y: 150,
      rotation: 0,
      seats:
        spec.seats === 2 ? [`${n}-a`, `${n}-b`] : spec.seats === 1 ? [`${n}-a`] : [],
    };
    commit([...furniture, nf]);
    setSelectedId(n);
  }

  function duplicate() {
    if (!selected) return;
    const n = `${selected.kind}-${Date.now()}`;
    commit([
      ...furniture,
      { ...selected, id: n, x: selected.x + 25, y: selected.y + 25, seats: selected.seats.map((s) => `${n}-${s.slice(-1)}`) },
    ]);
    setSelectedId(n);
  }

  function remove() {
    if (!selected) return;
    commit(furniture.filter((f) => f.id !== selected.id));
    setSelectedId(null);
  }

  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col md:min-h-screen">
      {/* 1 — Toolbar */}
      <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-panel px-3">
        <Button variant="quiet" size="sm" asChild>
          <Link to="/raeume">
            <ArrowLeft size={16} strokeWidth={1.5} />
            Räume
          </Link>
        </Button>
        <span aria-hidden className="h-6 w-px bg-[color:var(--line)]" />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{room.name}</p>
          <p className="num truncate text-ink-3">
            {room.width} × {room.height} cm · Raster {room.grid} cm · {seatCount(room)} Plätze
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="quiet"
              size="iconSm"
              aria-label="Rückgängig"
              onClick={undo}
              disabled={past.length === 0}
            >
              <Undo2 size={16} strokeWidth={1.5} />
            </Button>
            <Button
              variant="quiet"
              size="iconSm"
              aria-label="Wiederherstellen"
              onClick={redo}
              disabled={future.length === 0}
            >
              <Redo2 size={16} strokeWidth={1.5} />
            </Button>
          </div>
          <label className="hidden items-center gap-1.5 text-[13px] text-ink-2 lg:flex">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="h-4 w-4 accent-[color:var(--select)]"
            />
            Raster
          </label>
          <div className="hidden items-center rounded-[6px] border border-line-control bg-elevated sm:flex">
            <Button
              variant="quiet"
              size="iconSm"
              aria-label="Verkleinern"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
            >
              <Minus size={16} strokeWidth={1.5} />
            </Button>
            <span className="num w-12 text-center text-ink-2">{zoom} %</span>
            <Button
              variant="quiet"
              size="iconSm"
              aria-label="Vergrößern"
              onClick={() => setZoom((z) => Math.min(160, z + 10))}
            >
              <Plus size={16} strokeWidth={1.5} />
            </Button>
          </div>
          <SaveStatus state={saveState} className="hidden md:inline-flex" />
          <Button variant="secondary" size="sm" onClick={() => setSaveState("gespeichert")}>
            Raumdaten
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* 2 — Palette */}
        <aside className="hidden w-[212px] shrink-0 overflow-y-auto border-r border-line bg-panel p-3 lg:block">
          <h2 className="eyebrow">Möbel einfügen</h2>
          <ul className="mt-2 space-y-1">
            {PALETTE.map((kind) => {
              const spec = FURNITURE_SPECS[kind];
              return (
                <li key={kind}>
                  <button
                    type="button"
                    onClick={() => addFurniture(kind)}
                    className="flex w-full items-center gap-2.5 rounded-[6px] border border-transparent p-1.5 text-left transition-colors hover:border-[color:var(--line)] hover:bg-elevated"
                  >
                    <svg
                      width="52"
                      height="30"
                      viewBox={`-4 -4 ${spec.w + 8} ${spec.h + 8}`}
                      aria-hidden
                      className="shrink-0"
                    >
                      <FurnitureShape kind={kind} />
                    </svg>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px]">{spec.label}</span>
                      <span className="num block text-ink-3">
                        {spec.w} × {spec.h}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* 3 — Plan */}
        <div className="relative min-w-0 flex-1 overflow-auto bg-canvas p-6">
          <div className="mx-auto" style={{ maxWidth: `${(zoom / 100) * 860}px` }}>
            <RoomPlan
              room={room}
              mode="room"
              showGrid={showGrid}
              selectedId={selectedId}
              onSelect={setSelectedId}
              className="h-auto w-full rounded-[8px] border border-line bg-plan shadow-[var(--shadow-panel)]"
            />
          </div>

          {selected && (
            <div className="pointer-events-none sticky bottom-0 flex justify-center pt-6">
              <div className="pointer-events-auto flex items-center gap-1 rounded-[8px] border border-line bg-elevated p-1.5 shadow-[var(--shadow-overlay)]">
                <span className="px-2 text-[13px] font-medium">
                  {FURNITURE_SPECS[selected.kind].label}
                </span>
                <span aria-hidden className="h-5 w-px bg-[color:var(--line)]" />
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() =>
                    update({ rotation: (((selected.rotation + 90) % 360) as 0 | 90 | 180 | 270) })
                  }
                >
                  <RotateCw size={16} strokeWidth={1.5} />
                  Drehen <kbd>R</kbd>
                </Button>
                <Button variant="quiet" size="sm" onClick={duplicate}>
                  <Copy size={16} strokeWidth={1.5} />
                  Duplizieren <kbd>D</kbd>
                </Button>
                <Button
                  variant="quiet"
                  size="sm"
                  className="text-danger hover:bg-danger-bg"
                  onClick={remove}
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                  Löschen
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 4 — Inspector */}
        <aside className="hidden w-[296px] shrink-0 overflow-y-auto border-l border-line bg-panel p-4 xl:block">
          {!selected ? (
            <>
              <h2 className="eyebrow">Inspector</h2>
              <p className="prose-measure mt-2 text-[13px] text-ink-2">
                Kein Objekt ausgewählt. Klicken Sie ein Möbelstück im Plan an, um Position, Drehung
                und Sitzplätze zu bearbeiten.
              </p>
              <Tastatur />
            </>
          ) : (
            <>
              <h2 className="eyebrow">Objekt</h2>
              <div className="mt-2 flex items-center gap-3 rounded-[6px] border border-line bg-elevated p-2.5">
                <svg
                  width="56"
                  height="34"
                  viewBox={`-4 -4 ${FURNITURE_SPECS[selected.kind].w + 8} ${FURNITURE_SPECS[selected.kind].h + 8}`}
                  aria-hidden
                >
                  <FurnitureShape kind={selected.kind} />
                </svg>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">
                    {FURNITURE_SPECS[selected.kind].label}
                  </p>
                  <p className="num text-ink-3">{selected.id}</p>
                </div>
              </div>

              <h3 className="eyebrow mt-5">Position</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["x", "y"] as const).map((axis) => (
                  <label key={axis} className="block">
                    <span className="text-[12px] text-ink-2">{axis.toUpperCase()} in cm</span>
                    <input
                      type="number"
                      step={room.grid}
                      value={selected[axis]}
                      onChange={(e) => update({ [axis]: Number(e.target.value) })}
                      className="num mt-1 h-10 w-full rounded-[6px] border border-line-control bg-elevated px-2.5"
                    />
                  </label>
                ))}
              </div>

              <h3 className="eyebrow mt-5">Maße</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["w", "h"] as const).map((k) => (
                  <label key={k} className="block">
                    <span className="text-[12px] text-ink-2">
                      {k === "w" ? "Breite" : "Tiefe"} in cm
                    </span>
                    <input
                      readOnly
                      disabled
                      value={FURNITURE_SPECS[selected.kind][k]}
                      className="num mt-1 h-10 w-full rounded-[6px] border border-line bg-sunken px-2.5 text-ink-2"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[12px] text-ink-3">
                Maße sind je Möbeltyp festgelegt und nicht editierbar.
              </p>

              <h3 className="eyebrow mt-5">Drehung</h3>
              <div
                role="group"
                aria-label="Drehung in Grad"
                className="mt-2 grid grid-cols-4 gap-1 rounded-[6px] border border-line bg-sunken p-1"
              >
                {([0, 90, 180, 270] as const).map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    aria-pressed={selected.rotation === deg}
                    onClick={() => update({ rotation: deg })}
                    className={`num h-8 rounded-[3px] transition-colors ${
                      selected.rotation === deg
                        ? "bg-elevated font-semibold text-ink shadow-[var(--shadow-panel)]"
                        : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>

              <h3 className="eyebrow mt-5">Sitzplätze</h3>
              {selected.seats.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-2">Dieses Objekt hat keine Sitzplätze.</p>
              ) : (
                <ul className="mt-2 divide-y divide-[color:var(--line)] rounded-[6px] border border-line bg-elevated">
                  {selected.seats.map((s, i) => (
                    <li key={s} className="flex items-center gap-2 px-2.5 py-2 text-[13px]">
                      <Table2 size={16} strokeWidth={1.5} className="text-ink-3" />
                      Platz {i + 1}
                      <span className="num ml-auto text-ink-3">{s}</span>
                    </li>
                  ))}
                </ul>
              )}

              <Tastatur />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Tastatur() {
  return (
    <div className="mt-6 border-t border-line pt-4">
      <h3 className="eyebrow">Tastatur</h3>
      <ul className="mt-2 space-y-1.5 text-[13px] text-ink-2">
        <li>
          <kbd>Tab</kbd> Objekt wechseln
        </li>
        <li>
          <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> um ein Raster verschieben
        </li>
        <li>
          <kbd>R</kbd> drehen · <kbd>D</kbd> duplizieren
        </li>
        <li>
          <kbd>Entf</kbd> löschen · <kbd>Esc</kbd> Auswahl aufheben
        </li>
      </ul>
    </div>
  );
}
