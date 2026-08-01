import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, DoorOpen, Trash2, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { SearchField } from "@/components/ui-kit/SearchField";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { KeineTreffer } from "@/components/ui-kit/KeineTreffer";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";
import { Field, Modal, inputClass } from "@/components/ui-kit/Modal";
import { PlanThumb } from "@/components/plan/RoomPlan";
import { seatCount } from "@/data/types";
import { useStore } from "@/store/app";

export const Route = createFileRoute("/_authenticated/raeume/")({
  validateSearch: (search: Record<string, unknown>) => ({
    neu: search["neu"] === "1" ? ("1" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Räume und Grundrisse — Sitzplan" },
      {
        name: "description",
        content:
          "Raumvorlagen mit Maßen, Tischen und Sitzplätzen. Räume anlegen, zeichnen und wiederverwenden.",
      },
      { property: "og:title", content: "Räume und Grundrisse — Sitzplan" },
      { property: "og:description", content: "Raumvorlagen zeichnen und wiederverwenden." },
    ],
  }),
  component: Raeume,
});

const MASSE = { minW: 200, maxW: 2000, minH: 200, maxH: 2000 };

function Raeume() {
  const { data, dispatch } = useStore();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [q, setQ] = useState("");
  const [neu, setNeu] = useState(false);
  const [bearbeiten, setBearbeiten] = useState<string | null>(null);

  useEffect(() => {
    if (search.neu === "1") {
      setNeu(true);
      navigate({ to: "/raeume", search: {}, replace: true });
    }
  }, [search.neu, navigate]);
  const [form, setForm] = useState({ name: "", width: "800", height: "600", grid: "25" });
  const [fehler, setFehler] = useState("");
  const [loeschen, setLoeschen] = useState<string | null>(null);

  const gefiltert = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? data.rooms.filter((r) => r.name.toLowerCase().includes(t)) : data.rooms;
  }, [data.rooms, q]);

  const zuLoeschen = data.rooms.find((r) => r.id === loeschen);
  const inBearbeitung = data.rooms.find((r) => r.id === bearbeiten);

  function pruefen(name: string, width: number, height: number, grid: number, id?: string) {
    if (!name) return "Bitte einen Raumnamen angeben.";
    if (data.rooms.some((r) => r.id !== id && r.name.toLowerCase() === name.toLowerCase()))
      return "Diesen Raumnamen gibt es bereits.";
    if (!Number.isFinite(width) || width < MASSE.minW || width > MASSE.maxW)
      return `Breite zwischen ${MASSE.minW} und ${MASSE.maxW} cm.`;
    if (!Number.isFinite(height) || height < MASSE.minH || height > MASSE.maxH)
      return `Tiefe zwischen ${MASSE.minH} und ${MASSE.maxH} cm.`;
    if (![10, 20, 25, 50].includes(grid)) return "Rasterweite ungültig.";
    return "";
  }

  function speichern() {
    if (!inBearbeitung) return;
    const name = form.name.trim();
    const width = Number(form.width);
    const height = Number(form.height);
    const grid = Number(form.grid);
    const f = pruefen(name, width, height, grid, inBearbeitung.id);
    if (f) return setFehler(f);
    dispatch({ type: "room/update", id: inBearbeitung.id, name, width, height, grid });
    setBearbeiten(null);
    setFehler("");
  }

  function anlegen() {
    const name = form.name.trim();
    const width = Number(form.width);
    const height = Number(form.height);
    const grid = Number(form.grid);
    if (!name) return setFehler("Bitte einen Raumnamen angeben.");
    if (data.rooms.some((r) => r.name.toLowerCase() === name.toLowerCase()))
      return setFehler("Diesen Raumnamen gibt es bereits.");
    if (!Number.isFinite(width) || width < MASSE.minW || width > MASSE.maxW)
      return setFehler(`Breite zwischen ${MASSE.minW} und ${MASSE.maxW} cm.`);
    if (!Number.isFinite(height) || height < MASSE.minH || height > MASSE.maxH)
      return setFehler(`Tiefe zwischen ${MASSE.minH} und ${MASSE.maxH} cm.`);
    if (![10, 20, 25, 50].includes(grid)) return setFehler("Rasterweite ungültig.");
    dispatch({ type: "room/add", name, width, height, grid });
    setNeu(false);
    setForm({ name: "", width: "800", height: "600", grid: "25" });
    setFehler("");
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Sitzplan", to: "/" }, { label: "Räume" }]}
        title="Räume"
        subtitle="Ein Raum wird einmal gezeichnet und lässt sich für beliebig viele Sitzpläne verwenden."
        actions={
          <>
            {data.rooms.length > 0 && <SearchField value={q} onChange={setQ} label="Raum suchen" />}
            <Button
              variant="primary"
              onClick={() => {
                setForm({ name: "", width: "800", height: "600", grid: "25" });
                setFehler("");
                setNeu(true);
              }}
            >
              <Plus size={16} strokeWidth={1.5} />
              Raum anlegen
            </Button>
          </>
        }
      />

      <div className="px-5 py-7 md:px-8">
        {data.rooms.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="Noch kein Raum gezeichnet"
            text="Legen Sie die Maße des Klassenzimmers fest. Anschließend setzen Sie Tische, Pult, Tafel, Tür und Fenster im Editor."
            action={
              <Button variant="primary" onClick={() => setNeu(true)}>
                <Plus size={16} strokeWidth={1.5} />
                Ersten Raum anlegen
              </Button>
            }
          />
        ) : gefiltert.length === 0 ? (
          <KeineTreffer suche={q} onReset={() => setQ("")} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {gefiltert.map((r) => (
              <li
                key={r.id}
                className="relative flex items-center gap-3 rounded-[8px] border border-line bg-panel p-4 transition-colors hover:border-[color:var(--line-plan)]"
              >
                <PlanThumb room={r} width={52} height={38} />
                <Link
                  to="/raeume/$id"
                  params={{ id: r.id }}
                  className="min-w-0 flex-1 before:absolute before:inset-0 before:content-['']"
                >
                  <span className="block truncate text-[14px] font-medium">{r.name}</span>
                  <span className="num block text-[12px] text-ink-3">
                    {r.width} × {r.height} cm · {seatCount(r)} Plätze
                  </span>
                </Link>
                <Button
                  variant="quiet"
                  size="iconSm"
                  className="relative"
                  aria-label={`Raumdaten von ${r.name} bearbeiten`}
                  onClick={() => {
                    setBearbeiten(r.id);
                    setForm({
                      name: r.name,
                      width: String(r.width),
                      height: String(r.height),
                      grid: String(r.grid),
                    });
                    setFehler("");
                  }}
                >
                  <Pencil size={16} strokeWidth={1.5} />
                </Button>
                <Button
                  variant="quiet"
                  size="iconSm"
                  className="relative"
                  aria-label={`${r.name} löschen`}
                  onClick={() => setLoeschen(r.id)}
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </Button>
                <Link
                  to="/raeume/$id"
                  params={{ id: r.id }}
                  aria-label={`${r.name} öffnen`}
                  className="relative grid h-6 w-6 shrink-0 place-items-center rounded-[5px] text-ink-3 hover:text-ink"
                >
                  <ChevronRight size={16} strokeWidth={1.5} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={neu}
        title="Neuer Raum"
        description="Maße in Zentimetern. Sie lassen sich später jederzeit ändern."
        submitLabel="Raum anlegen"
        onSubmit={anlegen}
        onClose={() => {
          setNeu(false);
          setFehler("");
        }}
      >
        <Field label="Name" error={fehler}>
          <input
            className={inputClass}
            value={form.name}
            maxLength={40}
            placeholder="Raum 204"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Breite (cm)">
            <input
              className={`${inputClass} num`}
              type="number"
              value={form.width}
              onChange={(e) => setForm({ ...form, width: e.target.value })}
            />
          </Field>
          <Field label="Tiefe (cm)">
            <input
              className={`${inputClass} num`}
              type="number"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Rasterweite (cm)" hint="Objekte rasten beim Verschieben ein">
          <select
            className={inputClass}
            value={form.grid}
            onChange={(e) => setForm({ ...form, grid: e.target.value })}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </Field>
      </Modal>

      <Modal
        open={Boolean(inBearbeitung)}
        title="Raumdaten bearbeiten"
        description="Name, Maße und Rasterweite der Vorlage ändern."
        submitLabel="Änderungen speichern"
        onSubmit={speichern}
        onClose={() => {
          setBearbeiten(null);
          setFehler("");
        }}
      >
        <Field label="Name" error={fehler}>
          <input
            className={inputClass}
            value={form.name}
            maxLength={40}
            placeholder="Raum 204"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Breite (cm)">
            <input
              className={`${inputClass} num`}
              type="number"
              value={form.width}
              onChange={(e) => setForm({ ...form, width: e.target.value })}
            />
          </Field>
          <Field label="Tiefe (cm)">
            <input
              className={`${inputClass} num`}
              type="number"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Rasterweite (cm)" hint="Objekte rasten beim Verschieben ein">
          <select
            className={inputClass}
            value={form.grid}
            onChange={(e) => setForm({ ...form, grid: e.target.value })}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(zuLoeschen)}
        title={`${zuLoeschen?.name ?? ""} in den Papierkorb legen?`}
        description="Die Raumvorlage verschwindet aus der Liste, bleibt aber wiederherstellbar."
        consequence="Bereits erstellte Sitzpläne behalten ihre eigene Kopie des Grundrisses und bleiben unverändert."
        confirmLabel="In den Papierkorb"
        onConfirm={() => {
          if (loeschen) dispatch({ type: "room/delete", id: loeschen });
          setLoeschen(null);
        }}
        onCancel={() => setLoeschen(null)}
      />
    </>
  );
}
