import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Undo2,
  Redo2,
  RotateCw,
  Copy,
  Trash2,
  Grid3x3,
  Pencil,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Square,
  Rows2,
  Presentation,
  PanelTop,
  DoorClosed,
  Blinds,
} from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { SaveStatus } from "@/components/ui-kit/SaveStatus";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";
import { Field, Modal, inputClass } from "@/components/ui-kit/Modal";
import { RoomPlan } from "@/components/plan/RoomPlan";
import {
  FURNITURE_SPECS,
  makeFurniture,
  newId,
  seatCount,
  type Furniture,
  type FurnitureKind,
} from "@/data/types";
import { useStore } from "@/store/app";

export const Route = createFileRoute("/_authenticated/raeume/$id")({
  head: () => ({
    meta: [
      { title: "Raum zeichnen — Sitzplan" },
      {
        name: "description",
        content:
          "Grundriss bearbeiten: Tische, Pult, Tafel, Tür und Fenster setzen, verschieben, drehen und duplizieren.",
      },
      { property: "og:title", content: "Raum zeichnen — Sitzplan" },
      { property: "og:description", content: "Grundriss mit Rasterfang und Tastatursteuerung." },
    ],
  }),
  component: RaumEditor,
});

const PALETTE: { kind: FurnitureKind; icon: typeof Square }[] = [
  { kind: "einzeltisch", icon: Square },
  { kind: "doppeltisch", icon: Rows2 },
  { kind: "pult", icon: PanelTop },
  { kind: "tafel", icon: Presentation },
  { kind: "tuer", icon: DoorClosed },
  { kind: "fenster", icon: Blinds },
];

function RaumEditor() {
  const { id } = Route.useParams();
  const { data, dispatch, saveState, retry, undo, redo, canUndo, canRedo } = useStore();
  const room = data.rooms.find((r) => r.id === id);

  const [selected, setSelected] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [form, setForm] = useState<{
    name: string;
    width: string;
    height: string;
    grid: string;
  } | null>(null);
  const [fehler, setFehler] = useState("");
  const [loeschen, setLoeschen] = useState(false);

  const furniture = useMemo(() => room?.furniture ?? [], [room]);
  const aktiv = furniture.find((f) => f.id === selected) ?? null;

  const setFurniture = useCallback(
    (next: Furniture[]) => {
      if (!room) return;
      dispatch({ type: "room/furniture", id: room.id, furniture: next });
    },
    [dispatch, room],
  );

  const patch = useCallback(
    (fid: string, p: Partial<Furniture>) => {
      setFurniture(furniture.map((f) => (f.id === fid ? { ...f, ...p } : f)));
    },
    [furniture, setFurniture],
  );

  const einfuegen = useCallback(
    (kind: FurnitureKind) => {
      if (!room) return;
      const g = room.grid || 25;
      const spec = FURNITURE_SPECS[kind];
      const x = Math.round((room.width / 2 - spec.w / 2) / g) * g;
      const y = Math.round((room.height / 2 - spec.h / 2) / g) * g;
      const f = makeFurniture(kind, Math.max(0, x), Math.max(0, y));
      setFurniture([...furniture, f]);
      setSelected(f.id);
    },
    [furniture, room, setFurniture],
  );

  const drehen = useCallback(() => {
    if (!aktiv) return;
    patch(aktiv.id, { rotation: ((aktiv.rotation + 90) % 360) as Furniture["rotation"] });
  }, [aktiv, patch]);

  const duplizieren = useCallback(() => {
    if (!aktiv || !room) return;
    const g = room.grid || 25;
    const nid = newId(aktiv.kind);
    const kopie: Furniture = {
      ...aktiv,
      id: nid,
      x: aktiv.x + g,
      y: aktiv.y + g,
      seats: aktiv.seats.map((_, i) => `${nid}-s${i + 1}`),
    };
    setFurniture([...furniture, kopie]);
    setSelected(kopie.id);
  }, [aktiv, furniture, room, setFurniture]);

  const entfernen = useCallback(() => {
    if (!aktiv) return;
    setFurniture(furniture.filter((f) => f.id !== aktiv.id));
    setSelected(null);
  }, [aktiv, furniture, setFurniture]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (!aktiv || !room) return;
      const g = e.shiftKey ? 1 : room.grid || 25;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-g, 0],
        ArrowRight: [g, 0],
        ArrowUp: [0, -g],
        ArrowDown: [0, g],
      };
      const m = moves[e.key];
      if (m) {
        e.preventDefault();
        patch(aktiv.id, { x: aktiv.x + m[0], y: aktiv.y + m[1] });
        return;
      }
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        drehen();
      } else if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplizieren();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        entfernen();
      } else if (e.key === "Escape") {
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aktiv, room, patch, drehen, duplizieren, entfernen, undo, redo]);

  if (!room) {
    return (
      <div className="px-5 py-10 md:px-8">
        <h1 className="page-title">Raum nicht gefunden</h1>
        <p className="mt-2 text-[14px] text-ink-2">
          Dieser Raum wurde gelöscht oder es liegen keine Daten in diesem Browser.
        </p>
        <Button className="mt-5" variant="secondary" asChild>
          <Link to="/raeume">Zurück zu den Räumen</Link>
        </Button>
      </div>
    );
  }

  function speichern() {
    if (!form || !room) return;
    const name = form.name.trim();
    const width = Number(form.width);
    const height = Number(form.height);
    const grid = Number(form.grid);
    if (!name) return setFehler("Bitte einen Namen angeben.");
    if (!Number.isFinite(width) || width < 200 || width > 2000)
      return setFehler("Breite zwischen 200 und 2000 cm.");
    if (!Number.isFinite(height) || height < 200 || height > 2000)
      return setFehler("Tiefe zwischen 200 und 2000 cm.");
    dispatch({ type: "room/update", id: room.id, name, width, height, grid });
    setForm(null);
    setFehler("");
  }

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Sitzplan", to: "/" },
          { label: "Räume", to: "/raeume" },
          { label: room.name },
        ]}
        title={room.name}
        subtitle={`${room.width} × ${room.height} cm · Raster ${room.grid} cm · ${seatCount(room)} Sitzplätze`}
        actions={
          <>
            <SaveStatus state={saveState} onRetry={retry} />
            <Button variant="secondary" asChild>
              <Link to="/raeume">
                <ArrowLeft size={16} strokeWidth={1.5} />
                Zurück
              </Link>
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                setForm({
                  name: room.name,
                  width: String(room.width),
                  height: String(room.height),
                  grid: String(room.grid),
                })
              }
            >
              <Pencil size={16} strokeWidth={1.5} />
              Raumdaten
            </Button>
          </>
        }
      />

      <div className="grid gap-0 lg:grid-cols-[236px_minmax(0,1fr)]">
        <aside className="border-b border-line bg-panel p-4 lg:border-b-0 lg:border-r">
          <h2 className="eyebrow">Objekte einfügen</h2>
          <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {PALETTE.map(({ kind, icon: Icon }) => (
              <Button
                key={kind}
                variant="secondary"
                size="sm"
                className="justify-start"
                onClick={() => einfuegen(kind)}
              >
                <Icon size={16} strokeWidth={1.5} />
                {FURNITURE_SPECS[kind].label}
              </Button>
            ))}
          </div>

          <hr className="my-4 border-t border-line" />
          <h2 className="eyebrow">Auswahl</h2>
          {aktiv ? (
            <>
              <p className="mt-1.5 text-[13px]">
                {FURNITURE_SPECS[aktiv.kind].label}
                <span className="num ml-2 text-ink-3">
                  {aktiv.x}/{aktiv.y}
                </span>
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <Button variant="secondary" size="sm" onClick={drehen} aria-label="Drehen (R)">
                  <RotateCw size={16} strokeWidth={1.5} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={duplizieren}
                  aria-label="Duplizieren (D)"
                >
                  <Copy size={16} strokeWidth={1.5} />
                </Button>
                <Button variant="danger" size="sm" onClick={entfernen} aria-label="Löschen (Entf)">
                  <Trash2 size={16} strokeWidth={1.5} />
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(
                  [
                    ["x", "X (cm)", aktiv.x],
                    ["y", "Y (cm)", aktiv.y],
                  ] as const
                ).map(([key, label, wert]) => (
                  <label key={key} className="block">
                    <span className="block text-[11px] text-ink-3">{label}</span>
                    <input
                      type="number"
                      step={room.grid}
                      value={wert}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v)) return;
                        if (key === "x") patch(aktiv.id, { x: Math.max(0, v) });
                        else patch(aktiv.id, { y: Math.max(0, v) });
                      }}
                      className="num mt-0.5 h-8 w-full rounded-[6px] border border-line-control bg-elevated px-2 text-[13px]"
                    />
                  </label>
                ))}
              </div>

              <p className="num mt-2 text-[12px] text-ink-3">
                Maß {FURNITURE_SPECS[aktiv.kind].w} × {FURNITURE_SPECS[aktiv.kind].h} cm ·{" "}
                {FURNITURE_SPECS[aktiv.kind].seats} Sitzplätze
              </p>

              <div className="mt-3">
                <span className="block text-[11px] text-ink-3">Drehung</span>
                <div className="mt-1 flex overflow-hidden rounded-[6px] border border-line-control">
                  {([0, 90, 180, 270] as const).map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      aria-pressed={aktiv.rotation === deg}
                      onClick={() => patch(aktiv.id, { rotation: deg })}
                      className={`num flex-1 border-r border-line-control py-1.5 text-[12px] last:border-r-0 transition-colors duration-[160ms] ease-out ${
                        aktiv.rotation === deg
                          ? "bg-action-soft text-action-soft-ink"
                          : "bg-elevated text-ink-2 hover:bg-sunken"
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-2 text-[12px] leading-[1.5] text-ink-3">
                Pfeiltasten verschieben im Raster, mit Umschalt zentimeterweise. R dreht, D
                dupliziert, Entf löscht.
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-[13px] text-ink-3">
              Kein Objekt ausgewählt. Klicken Sie ein Objekt im Grundriss an oder ziehen Sie es mit
              der Maus.
            </p>
          )}

          <hr className="my-4 border-t border-line" />
          <div className="flex flex-wrap gap-1.5">
            <Button variant="quiet" size="sm" onClick={undo} disabled={!canUndo}>
              <Undo2 size={16} strokeWidth={1.5} />
              Rückgängig
            </Button>
            <Button variant="quiet" size="sm" onClick={redo} disabled={!canRedo}>
              <Redo2 size={16} strokeWidth={1.5} />
              Wiederholen
            </Button>
            <Button
              variant="quiet"
              size="sm"
              aria-pressed={showGrid}
              onClick={() => setShowGrid((v) => !v)}
            >
              <Grid3x3 size={16} strokeWidth={1.5} />
              Raster
            </Button>
          </div>
          <Button
            className="mt-4 w-full"
            variant="danger"
            size="sm"
            onClick={() => setLoeschen(true)}
          >
            <Trash2 size={16} strokeWidth={1.5} />
            Raum löschen
          </Button>
        </aside>

        <div className="p-4 md:p-6">
          <div className="mb-3 flex items-center gap-1.5">
            <Button
              variant="quiet"
              size="iconSm"
              aria-label="Verkleinern"
              disabled={zoom <= 0.5}
              onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
            >
              <ZoomOut size={16} strokeWidth={1.5} />
            </Button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              title="Zoom zurücksetzen"
              className="num min-w-[52px] rounded-[6px] px-1.5 py-1 text-[12px] text-ink-2 transition-colors duration-[160ms] ease-out hover:bg-sunken hover:text-ink"
            >
              {Math.round(zoom * 100)} %
            </button>
            <Button
              variant="quiet"
              size="iconSm"
              aria-label="Vergrößern"
              disabled={zoom >= 2.5}
              onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.25) * 100) / 100))}
            >
              <ZoomIn size={16} strokeWidth={1.5} />
            </Button>
          </div>
          {furniture.length === 0 && (
            <p className="mb-3 rounded-[6px] border border-line bg-panel px-3 py-2 text-[13px] text-ink-2">
              Der Raum ist leer. Fügen Sie links Tische und Einbauten ein — Doppeltische bringen
              zwei Sitzplätze mit.
            </p>
          )}
          <div className="overflow-auto rounded-[8px] border border-line bg-plan">
            <div style={{ width: `${zoom * 100}%` }}>
              <RoomPlan
                room={room}
                mode="room"
                showGrid={showGrid}
                selectedId={selected}
                onSelect={setSelected}
                onMoveFurniture={(fid, x, y) => patch(fid, { x, y })}
                className="block h-auto w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(form)}
        title="Raum bearbeiten"
        submitLabel="Änderungen speichern"
        onSubmit={speichern}
        onClose={() => {
          setForm(null);
          setFehler("");
        }}
      >
        <Field label="Name" error={fehler}>
          <input
            className={inputClass}
            value={form?.name ?? ""}
            maxLength={40}
            onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Breite (cm)">
            <input
              className={`${inputClass} num`}
              type="number"
              value={form?.width ?? ""}
              onChange={(e) => setForm((f) => (f ? { ...f, width: e.target.value } : f))}
            />
          </Field>
          <Field label="Tiefe (cm)">
            <input
              className={`${inputClass} num`}
              type="number"
              value={form?.height ?? ""}
              onChange={(e) => setForm((f) => (f ? { ...f, height: e.target.value } : f))}
            />
          </Field>
        </div>
        <Field label="Rasterweite (cm)">
          <select
            className={inputClass}
            value={form?.grid ?? "25"}
            onChange={(e) => setForm((f) => (f ? { ...f, grid: e.target.value } : f))}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={loeschen}
        title={`${room.name} in den Papierkorb legen?`}
        description="Die Raumvorlage verschwindet aus der Liste, bleibt aber wiederherstellbar."
        consequence="Bereits erstellte Sitzpläne behalten ihre eigene Kopie des Grundrisses."
        confirmLabel="In den Papierkorb"
        onConfirm={() => {
          dispatch({ type: "room/delete", id: room.id });
          window.history.back();
        }}
        onCancel={() => setLoeschen(false)}
      />
    </>
  );
}
