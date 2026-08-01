import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Grid2x2, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { SearchField } from "@/components/ui-kit/SearchField";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { KeineTreffer } from "@/components/ui-kit/KeineTreffer";
import { SortHeader, type SortRichtung } from "@/components/ui-kit/SortHeader";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";
import { StatusChip } from "@/components/ui-kit/StatusChip";
import { ClassDot } from "@/components/ui-kit/ClassDot";
import { Field, Modal, inputClass } from "@/components/ui-kit/Modal";
import { relativeZeit } from "@/lib/zeit";
import { seatCount } from "@/data/types";
import { useStore } from "@/store/app";

export const Route = createFileRoute("/_authenticated/sitzplaene/")({
  validateSearch: (search: Record<string, unknown>) => ({
    neu: typeof search["neu"] === "string" ? (search["neu"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sitzpläne — Sitzplan" },
      {
        name: "description",
        content:
          "Alle Sitzpläne mit Klasse, Raum und Belegung. Neue Pläne aus Klasse und Raumvorlage erstellen.",
      },
      { property: "og:title", content: "Sitzpläne — Sitzplan" },
      { property: "og:description", content: "Sitzpläne aus Klasse und Raumvorlage erstellen." },
    ],
  }),
  component: Sitzplaene,
});

function Sitzplaene() {
  const { data, dispatch } = useStore();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [q, setQ] = useState("");
  const [neu, setNeu] = useState(false);
  const [form, setForm] = useState({ title: "", classId: "", roomId: "" });
  const [fehler, setFehler] = useState("");
  const [loeschen, setLoeschen] = useState<string | null>(null);
  const [sortSpalte, setSortSpalte] = useState<"title" | "room" | "updated">("updated");
  const [sortRichtung, setSortRichtung] = useState<SortRichtung>("ab");

  function sortieren(spalte: "title" | "room" | "updated") {
    if (spalte === sortSpalte) setSortRichtung((r) => (r === "auf" ? "ab" : "auf"));
    else {
      setSortSpalte(spalte);
      setSortRichtung(spalte === "updated" ? "ab" : "auf");
    }
  }

  const bereit = data.classes.length > 0 && data.rooms.length > 0;

  useEffect(() => {
    if (search.neu && bereit) {
      setForm((f) => ({ ...f, classId: search.neu ?? "" }));
      setNeu(true);
      navigate({ to: "/sitzplaene", search: {}, replace: true });
    }
  }, [search.neu, bereit, navigate]);

  const klassen = useMemo(
    () => Object.fromEntries(data.classes.map((c) => [c.id, c])),
    [data.classes],
  );

  const gefiltert = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return data.plans;
    return data.plans.filter(
      (p) =>
        p.title.toLowerCase().includes(t) ||
        p.room.name.toLowerCase().includes(t) ||
        (klassen[p.classId]?.name ?? "").toLowerCase().includes(t),
    );
  }, [data.plans, klassen, q]);

  const sortiert = useMemo(() => {
    const vz = sortRichtung === "auf" ? 1 : -1;
    return [...gefiltert].sort((a, b) => {
      if (sortSpalte === "title") return a.title.localeCompare(b.title, "de") * vz;
      if (sortSpalte === "room") return a.room.name.localeCompare(b.room.name, "de") * vz;
      return a.updated.localeCompare(b.updated) * vz;
    });
  }, [gefiltert, sortSpalte, sortRichtung]);

  const zuLoeschen = data.plans.find((p) => p.id === loeschen);

  function anlegen() {
    const title = form.title.trim();
    const cls = data.classes.find((c) => c.id === form.classId);
    const room = data.rooms.find((r) => r.id === form.roomId);
    if (!cls) return setFehler("Bitte eine Klasse wählen.");
    if (!room) return setFehler("Bitte einen Raum wählen.");
    if (seatCount(room) === 0)
      return setFehler("Dieser Raum hat noch keine Sitzplätze. Fügen Sie zuerst Tische ein.");
    dispatch({
      type: "plan/create",
      title: title || `${cls.name} · ${room.name}`,
      classId: cls.id,
      room,
    });
    setNeu(false);
    setForm({ title: "", classId: "", roomId: "" });
    setFehler("");
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Sitzplan", to: "/" }, { label: "Sitzpläne" }]}
        title="Sitzpläne"
        subtitle="Ein Sitzplan verbindet eine Klasse mit einem Raum und hält seine eigene Kopie des Grundrisses."
        actions={
          <>
            {data.plans.length > 0 && <SearchField value={q} onChange={setQ} label="Plan suchen" />}
            <Button variant="primary" disabled={!bereit} onClick={() => setNeu(true)}>
              <Plus size={16} strokeWidth={1.5} />
              Sitzplan erstellen
            </Button>
          </>
        }
      />

      <div className="px-5 py-7 md:px-8">
        {data.plans.length === 0 ? (
          <EmptyState
            icon={Grid2x2}
            title="Noch kein Sitzplan"
            text={
              bereit
                ? "Wählen Sie eine Klasse und einen Raum. Die Schüler verteilen Sie anschließend per Ziehen oder Tastatur auf die Plätze."
                : "Ein Sitzplan braucht mindestens eine Klasse mit Schülern und einen Raum mit Sitzplätzen."
            }
            action={
              bereit ? (
                <Button variant="primary" onClick={() => setNeu(true)}>
                  <Plus size={16} strokeWidth={1.5} />
                  Ersten Sitzplan erstellen
                </Button>
              ) : (
                <>
                  <Button variant="secondary" asChild>
                    <Link to="/klassen">Zu den Klassen</Link>
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link to="/raeume">Zu den Räumen</Link>
                  </Button>
                </>
              )
            }
          />
        ) : sortiert.length === 0 ? (
          <KeineTreffer suche={q} onReset={() => setQ("")} />
        ) : (
          <ul className="overflow-hidden rounded-[8px] border border-line bg-panel">
            <li className="flex items-center gap-3 border-b border-line bg-sunken px-4 py-2">
              <span className="w-7 shrink-0" />
              <span className="min-w-0 flex-1">
                <SortHeader
                  spalte="title"
                  label="Bezeichnung"
                  aktiv={sortSpalte}
                  richtung={sortRichtung}
                  onSort={sortieren}
                />
              </span>
              <SortHeader
                spalte="room"
                label="Raum"
                aktiv={sortSpalte}
                richtung={sortRichtung}
                onSort={sortieren}
                className="hidden sm:inline-flex"
              />
              <SortHeader
                spalte="updated"
                label="Geändert"
                aktiv={sortSpalte}
                richtung={sortRichtung}
                onSort={sortieren}
              />
              <span className="w-[72px] shrink-0" />
            </li>
            {sortiert.map((p, i) => {
              const cls = klassen[p.classId];
              const belegt = Object.keys(p.assignments).length;
              return (
                <li
                  key={p.id}
                  className={`group relative flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-[160ms] ease-out hover:bg-sunken ${i > 0 ? "border-t border-line" : ""}`}
                >
                  {cls && <ClassDot name={cls.name} colorIndex={cls.colorIndex} size={28} />}
                  <Link
                    to="/sitzplaene/$id"
                    params={{ id: p.id }}
                    className="min-w-0 flex-1 before:absolute before:inset-0 before:content-['']"
                  >
                    <span className="block truncate text-[14px] font-medium">{p.title}</span>
                    <span className="block truncate text-[13px] text-ink-3">
                      {p.room.name} · geändert {relativeZeit(p.updated)}
                    </span>
                  </Link>
                  <span className="num shrink-0 text-[13px] text-ink-2">
                    {belegt}/{seatCount(p.room)} Plätze
                  </span>
                  <StatusChip status={p.status} />
                  <Button
                    variant="quiet"
                    size="iconSm"
                    aria-label={`${p.title} löschen`}
                    className="relative"
                    onClick={() => setLoeschen(p.id)}
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </Button>
                  <Link
                    to="/sitzplaene/$id"
                    params={{ id: p.id }}
                    aria-label={`${p.title} öffnen`}
                    className="relative text-ink-3 hover:text-ink"
                  >
                    <ChevronRight size={16} strokeWidth={1.5} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={neu}
        title="Neuer Sitzplan"
        description="Der Grundriss wird als Kopie übernommen. Spätere Änderungen an der Raumvorlage wirken sich nicht aus."
        submitLabel="Sitzplan erstellen"
        onSubmit={anlegen}
        onClose={() => {
          setNeu(false);
          setFehler("");
        }}
      >
        <Field label="Klasse" error={fehler}>
          <select
            className={inputClass}
            value={form.classId}
            onChange={(e) => setForm({ ...form, classId: e.target.value })}
          >
            <option value="">Bitte wählen</option>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.students.length} Schüler)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Raum">
          <select
            className={inputClass}
            value={form.roomId}
            onChange={(e) => setForm({ ...form, roomId: e.target.value })}
          >
            <option value="">Bitte wählen</option>
            {data.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({seatCount(r)} Plätze)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bezeichnung" hint="Optional — sonst aus Klasse und Raum gebildet">
          <input
            className={inputClass}
            value={form.title}
            maxLength={60}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Deutsch, 1. Halbjahr"
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(zuLoeschen)}
        title={`${zuLoeschen?.title ?? ""} in den Papierkorb legen?`}
        description="Der Sitzplan verschwindet aus der Liste, bleibt aber wiederherstellbar."
        consequence="Klasse und Raumvorlage bleiben unverändert erhalten."
        confirmLabel="In den Papierkorb"
        onConfirm={() => {
          if (loeschen) dispatch({ type: "plan/delete", id: loeschen });
          setLoeschen(null);
        }}
        onCancel={() => setLoeschen(null)}
      />
    </>
  );
}
