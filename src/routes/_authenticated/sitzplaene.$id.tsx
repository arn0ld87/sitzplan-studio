import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Undo2, Redo2, Trash2, Shuffle, Eraser, Pencil } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { SaveStatus } from "@/components/ui-kit/SaveStatus";
import { StudentChip } from "@/components/ui-kit/StudentChip";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";
import { Field, Modal, inputClass } from "@/components/ui-kit/Modal";
import { SearchField } from "@/components/ui-kit/SearchField";
import { RoomPlan } from "@/components/plan/RoomPlan";
import { allSeats, seatCount, studentName, type PlanStatus, type Student } from "@/data/types";
import { useStore } from "@/store/app";

export const Route = createFileRoute("/_authenticated/sitzplaene/$id")({
  head: () => ({
    meta: [
      { title: "Sitzplan bearbeiten — Sitzplan" },
      {
        name: "description",
        content:
          "Schüler per Ziehen oder Tastatur auf Plätze verteilen, tauschen und den Plan als aktiv markieren.",
      },
      { property: "og:title", content: "Sitzplan bearbeiten — Sitzplan" },
      { property: "og:description", content: "Schüler auf Plätze verteilen und tauschen." },
    ],
  }),
  component: SitzplanEditor,
});

const STATUS: { value: PlanStatus; label: string }[] = [
  { value: "entwurf", label: "Entwurf" },
  { value: "aktiv", label: "Aktiv" },
  { value: "archiv", label: "Archiviert" },
];

function SitzplanEditor() {
  const { id } = Route.useParams();
  const { data, dispatch, saveState, retry, undo, redo, canUndo, canRedo } = useStore();
  const plan = data.plans.find((p) => p.id === id);
  const cls = plan ? data.classes.find((c) => c.id === plan.classId) : undefined;

  const [carry, setCarry] = useState<{ studentId: string; from: string | null } | null>(null);
  const [q, setQ] = useState("");
  const [loeschen, setLoeschen] = useState(false);
  const [leeren, setLeeren] = useState(false);
  const [form, setForm] = useState<{ title: string } | null>(null);

  const studentsById = useMemo<Record<string, Student>>(
    () => Object.fromEntries((cls?.students ?? []).map((s) => [s.id, s])),
    [cls],
  );

  const setAssignments = useCallback(
    (next: Record<string, string>) => {
      if (!plan) return;
      dispatch({ type: "plan/assignments", id: plan.id, assignments: next });
    },
    [dispatch, plan],
  );

  const place = useCallback(
    (seatId: string, studentId: string, from: string | null) => {
      if (!plan) return;
      const next = { ...plan.assignments };
      const besetztVon = next[seatId];
      if (from) delete next[from];
      // Platz war belegt: tauschen statt überschreiben
      if (besetztVon && besetztVon !== studentId) {
        if (from) next[from] = besetztVon;
      }
      next[seatId] = studentId;
      setAssignments(next);
    },
    [plan, setAssignments],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "Escape") {
        setCarry(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  if (!plan) {
    return (
      <div className="px-5 py-10 md:px-8">
        <h1 className="page-title">Sitzplan nicht gefunden</h1>
        <p className="mt-2 text-[14px] text-ink-2">
          Dieser Plan wurde gelöscht oder es liegen keine Daten in diesem Browser.
        </p>
        <Button className="mt-5" variant="secondary" asChild>
          <Link to="/sitzplaene">Zurück zu den Sitzplänen</Link>
        </Button>
      </div>
    );
  }

  const belegteIds = new Set(Object.values(plan.assignments));
  const offen = (cls?.students ?? []).filter((s) => !belegteIds.has(s.id));
  const gefiltert = q.trim()
    ? offen.filter((s) => studentName(s).toLowerCase().includes(q.trim().toLowerCase()))
    : offen;
  const plaetze = seatCount(plan.room);

  function seatDown(seatId: string) {
    const besetztVon = plan!.assignments[seatId];
    if (carry) {
      place(seatId, carry.studentId, carry.from);
      setCarry(null);
      return;
    }
    if (besetztVon) setCarry({ studentId: besetztVon, from: seatId });
  }

  function seatUp(seatId: string) {
    if (!carry) return;
    if (carry.from === seatId) return; // reiner Klick: Auswahl behalten
    place(seatId, carry.studentId, carry.from);
    setCarry(null);
  }

  function zurueckInDieAblage() {
    if (!carry) return;
    if (carry.from) {
      const next = { ...plan!.assignments };
      delete next[carry.from];
      setAssignments(next);
    }
    setCarry(null);
  }

  function automatisch() {
    const frei = allSeats(plan!.room).filter((s) => !plan!.assignments[s]);
    const next = { ...plan!.assignments };
    offen.forEach((s, i) => {
      const seat = frei[i];
      if (seat) next[seat] = s.id;
    });
    setAssignments(next);
  }

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Sitzplan", to: "/" },
          { label: "Sitzpläne", to: "/sitzplaene" },
          { label: plan.title },
        ]}
        title={plan.title}
        subtitle={`${cls?.name ?? "Klasse gelöscht"} · ${plan.room.name} · ${Object.keys(plan.assignments).length} von ${plaetze} Plätzen belegt`}
        actions={
          <>
            <SaveStatus state={saveState} onRetry={retry} />
            <select
              aria-label="Status des Sitzplans"
              className="h-10 rounded-[6px] border border-line-control bg-elevated px-2.5 text-[13px]"
              value={plan.status}
              onChange={(e) =>
                dispatch({
                  type: "plan/update",
                  id: plan.id,
                  patch: { status: e.target.value as PlanStatus },
                })
              }
            >
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => setForm({ title: plan.title })}>
              <Pencil size={16} strokeWidth={1.5} />
              Umbenennen
            </Button>
          </>
        }
      />

      <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside
          className="border-b border-line bg-panel p-4 lg:border-b-0 lg:border-r"
          onPointerUp={zurueckInDieAblage}
          onDragOver={(e) => e.preventDefault()}
          onDrop={zurueckInDieAblage}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="eyebrow">Noch ohne Platz</h2>
            <span className="num text-[12px] text-ink-3">
              {String(offen.length).padStart(2, "0")}
            </span>
          </div>

          {!cls ? (
            <p className="mt-2 text-[13px] text-ink-2">
              Die zugehörige Klasse liegt im Papierkorb. Stellen Sie sie wieder her, um Schüler zu
              verteilen.
            </p>
          ) : cls.students.length === 0 ? (
            <p className="mt-2 text-[13px] text-ink-2">
              Die Klasse {cls.name} hat noch keine Schüler.
            </p>
          ) : (
            <>
              {offen.length > 4 && (
                <div className="mt-2">
                  <SearchField value={q} onChange={setQ} label="Name suchen" width={228} />
                </div>
              )}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {gefiltert.map((s) => (
                  <StudentChip
                    key={s.id}
                    name={studentName(s)}
                    colorIndex={s.colorIndex}
                    selected={carry?.studentId === s.id}
                    draggable
                    onDragStart={() => setCarry({ studentId: s.id, from: null })}
                    onPointerDown={() => setCarry({ studentId: s.id, from: null })}
                    onClick={() => setCarry({ studentId: s.id, from: null })}
                  />
                ))}
                {gefiltert.length === 0 && (
                  <p className="text-[13px] text-ink-3">
                    {offen.length === 0 ? "Alle Schüler sitzen." : `Kein Name passt zu „${q}“.`}
                  </p>
                )}
              </div>
            </>
          )}

          <p className="mt-3 text-[12px] leading-[1.5] text-ink-3">
            Schüler auf einen Platz ziehen oder anklicken und dann den Platz wählen. Ein belegter
            Platz tauscht die Personen. Escape hebt die Auswahl auf, ein Klick in diese Spalte setzt
            jemanden zurück in die Ablage.
          </p>

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
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={automatisch}
              disabled={offen.length === 0 || plaetze === 0}
            >
              <Shuffle size={16} strokeWidth={1.5} />
              Restliche verteilen
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLeeren(true)}
              disabled={Object.keys(plan.assignments).length === 0}
            >
              <Eraser size={16} strokeWidth={1.5} />
              Plan leeren
            </Button>
          </div>
          <Button
            className="mt-4 w-full"
            variant="danger"
            size="sm"
            onClick={() => setLoeschen(true)}
          >
            <Trash2 size={16} strokeWidth={1.5} />
            Sitzplan löschen
          </Button>
        </aside>

        <div className="p-4 md:p-6">
          {plaetze === 0 && (
            <p className="mb-3 rounded-[6px] border border-line bg-panel px-3 py-2 text-[13px] text-ink-2">
              Dieser Grundriss enthält keine Sitzplätze.
            </p>
          )}
          <div className="overflow-hidden rounded-[8px] border border-line bg-plan">
            <RoomPlan
              room={plan.room}
              mode="seating"
              showGrid={false}
              assignments={plan.assignments}
              studentsById={studentsById}
              carriedStudentId={carry?.studentId ?? null}
              onSeatDown={seatDown}
              onSeatUp={seatUp}
              onSeatDropStudent={(seatId) => {
                if (!carry) return;
                place(seatId, carry.studentId, carry.from);
                setCarry(null);
              }}
              className="block h-auto w-full"
            />
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(form)}
        title="Sitzplan umbenennen"
        submitLabel="Speichern"
        onSubmit={() => {
          const t = form?.title.trim();
          if (!t) return;
          dispatch({ type: "plan/update", id: plan.id, patch: { title: t } });
          setForm(null);
        }}
        onClose={() => setForm(null)}
      >
        <Field label="Bezeichnung">
          <input
            className={inputClass}
            value={form?.title ?? ""}
            maxLength={60}
            onChange={(e) => setForm((f) => (f ? { title: e.target.value } : f))}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={leeren}
        title="Alle Plätze freigeben?"
        description="Sämtliche Zuweisungen dieses Sitzplans werden aufgehoben."
        consequence="Rückgängig machen stellt die Belegung wieder her."
        confirmLabel="Plan leeren"
        onConfirm={() => {
          setAssignments({});
          setLeeren(false);
        }}
        onCancel={() => setLeeren(false)}
      />

      <ConfirmDialog
        open={loeschen}
        title={`${plan.title} in den Papierkorb legen?`}
        description="Der Sitzplan verschwindet aus der Liste, bleibt aber wiederherstellbar."
        consequence="Klasse und Raumvorlage bleiben unverändert erhalten."
        confirmLabel="In den Papierkorb"
        onConfirm={() => {
          dispatch({ type: "plan/delete", id: plan.id });
          window.history.back();
        }}
        onCancel={() => setLoeschen(false)}
      />
    </>
  );
}
