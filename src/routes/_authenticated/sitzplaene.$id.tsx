import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Undo2,
  Redo2,
  Trash2,
  Shuffle,
  Eraser,
  Pencil,
  ArrowLeft,
  Printer,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
  Undo,
} from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

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
  const [ablageOffen, setAblageOffen] = useState(true);
  const [versionenOffen, setVersionenOffen] = useState(false);
  const [versionen, setVersionen] = useState<
    { id: string; name: string; created_at: string; canvas_document: unknown }[]
  >([]);
  const [versionenLaden, setVersionenLaden] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [versionFehler, setVersionFehler] = useState("");
  const [verworfen, setVerworfen] = useState<string[]>([]);

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

  const regeln = data.rules.filter((r) => r.classId === plan.classId);
  const platzVonSchueler: Record<string, string> = {};
  for (const [seat, sid] of Object.entries(plan.assignments)) platzVonSchueler[sid] = seat;
  const nachbarn = (seatId: string) => {
    const moebel = plan!.room.furniture.find((f) => f.seats.includes(seatId));
    return moebel ? moebel.seats.filter((x) => x !== seatId) : [];
  };
  const freiePlaetze = allSeats(plan.room).filter((s) => !plan!.assignments[s]);

  type Vorschlag = { id: string; text: string; anwenden: () => void };
  const vorschlaege: Vorschlag[] = [];
  for (const r of regeln) {
    const sa = platzVonSchueler[r.a];
    const sb = platzVonSchueler[r.b];
    if (!sa || !sb) continue;
    const benachbart = nachbarn(sa).includes(sb);
    const nameA = studentsById[r.a] ? studentName(studentsById[r.a]!) : "?";
    const nameB = studentsById[r.b] ? studentName(studentsById[r.b]!) : "?";
    if (r.kind === "nicht_neben" && benachbart) {
      const ziel = freiePlaetze.find((f) => !nachbarn(sa).includes(f) && f !== sa);
      vorschlaege.push({
        id: r.id,
        text: ziel
          ? `${nameA} und ${nameB} sitzen nebeneinander. Vorschlag: ${nameB} auf einen freien Platz weiter weg setzen.`
          : `${nameA} und ${nameB} sitzen nebeneinander. Es ist kein passender freier Platz vorhanden.`,
        anwenden: () => {
          if (!ziel) return;
          const next = { ...plan!.assignments };
          delete next[sb];
          next[ziel] = r.b;
          setAssignments(next);
        },
      });
    }
    if (r.kind === "muss_neben" && !benachbart) {
      const ziel = nachbarn(sa).find((n) => !plan!.assignments[n]);
      vorschlaege.push({
        id: r.id,
        text: ziel
          ? `${nameA} und ${nameB} sollen nebeneinander sitzen. Vorschlag: ${nameB} auf den freien Nachbarplatz setzen.`
          : `${nameA} und ${nameB} sitzen nicht nebeneinander. Neben ${nameA} ist kein Platz frei.`,
        anwenden: () => {
          if (!ziel) return;
          const next = { ...plan!.assignments };
          delete next[sb];
          next[ziel] = r.b;
          setAssignments(next);
        },
      });
    }
  }
  const offeneVorschlaege = vorschlaege.filter((v) => !verworfen.includes(v.id));

  async function versionenLaenden() {
    setVersionenLaden(true);
    setVersionFehler("");
    const { data: rows, error } = await supabase
      .from("sitzplan_versionen")
      .select("id, name, created_at, canvas_document")
      .eq("sitzplan_id", plan!.id)
      .order("created_at", { ascending: false });
    if (error) setVersionFehler("Die Stände konnten nicht geladen werden.");
    else setVersionen(rows ?? []);
    setVersionenLaden(false);
  }

  async function standSpeichern() {
    const name = versionName.trim() || new Date().toLocaleString("de-DE");
    setVersionFehler("");
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess.user?.id;
    if (!uid) return setVersionFehler("Keine gültige Sitzung.");
    const { error } = await supabase.from("sitzplan_versionen").insert({
      sitzplan_id: plan!.id,
      user_id: uid,
      name,
      canvas_document: { zuordnungen: plan!.assignments } as never,
    });
    if (error) return setVersionFehler("Der Stand konnte nicht gespeichert werden.");
    setVersionName("");
    void versionenLaenden();
  }

  function standWiederherstellen(doc: unknown) {
    const z = (doc as { zuordnungen?: Record<string, string> } | null)?.zuordnungen;
    if (!z) return setVersionFehler("Dieser Stand enthält keine Zuordnungen.");
    setAssignments({ ...z });
    setVersionenOffen(false);
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
            <Button variant="secondary" asChild>
              <Link to="/sitzplaene">
                <ArrowLeft size={16} strokeWidth={1.5} />
                Zurück
              </Link>
            </Button>
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
            <Button
              variant="secondary"
              onClick={() => {
                setVersionenOffen(true);
                void versionenLaenden();
              }}
            >
              <History size={16} strokeWidth={1.5} />
              Versionen
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/sitzplaene/$id/drucken" params={{ id: plan.id }}>
                <Printer size={16} strokeWidth={1.5} />
                Drucken
              </Link>
            </Button>
          </>
        }
      />

      <div
        className={`grid gap-0 ${ablageOffen ? "lg:grid-cols-[260px_minmax(0,1fr)]" : "lg:grid-cols-[52px_minmax(0,1fr)]"}`}
      >
        {!ablageOffen ? (
          <aside className="border-b border-line bg-panel p-2 lg:border-b-0 lg:border-r">
            <Button
              variant="quiet"
              size="iconSm"
              aria-label="Ablage einblenden"
              onClick={() => setAblageOffen(true)}
            >
              <PanelLeftOpen size={16} strokeWidth={1.5} />
            </Button>
          </aside>
        ) : (
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
            <Button
              variant="quiet"
              size="iconSm"
              aria-label="Ablage ausblenden"
              onClick={() => setAblageOffen(false)}
            >
              <PanelLeftClose size={16} strokeWidth={1.5} />
            </Button>
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
            className="mt-2 w-full"
            variant="secondary"
            size="sm"
            disabled={!carry || !carry.from}
            onClick={zurueckInDieAblage}
          >
            <Undo size={16} strokeWidth={1.5} />
            Zurück in die Ablage
          </Button>
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
        )}

        <div className="p-4 md:p-6">
          {offeneVorschlaege.length > 0 && (
            <ul className="mb-3 space-y-2">
              {offeneVorschlaege.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center gap-3 rounded-[8px] border border-line bg-warn-bg px-3 py-2.5"
                >
                  <AlertTriangle size={16} strokeWidth={1.5} className="shrink-0 text-warn" />
                  <span className="min-w-0 flex-1 text-[13px]">{v.text}</span>
                  <Button variant="secondary" size="sm" onClick={v.anwenden}>
                    Vorschlag übernehmen
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setVerworfen((x) => [...x, v.id])}
                  >
                    Verwerfen
                  </Button>
                </li>
              ))}
            </ul>
          )}
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

      <Modal
        open={versionenOffen}
        title="Versionen"
        description="Benannte Stände dieses Sitzplans. Ein Stand hält die Belegung fest und lässt sich jederzeit wiederherstellen."
        submitLabel="Stand speichern"
        onSubmit={() => void standSpeichern()}
        onClose={() => {
          setVersionenOffen(false);
          setVersionFehler("");
        }}
      >
        <Field label="Name des Standes" hint="Optional — sonst Datum und Uhrzeit" error={versionFehler}>
          <input
            className={inputClass}
            value={versionName}
            maxLength={60}
            placeholder="Vor der Umsetzung"
            onChange={(e) => setVersionName(e.target.value)}
          />
        </Field>
        <div>
          <p className="eyebrow">Gespeicherte Stände</p>
          {versionenLaden ? (
            <div className="mt-2 space-y-1.5">
              {[0, 1].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-[6px] bg-sunken" />
              ))}
            </div>
          ) : versionen.length === 0 ? (
            <p className="mt-1.5 text-[13px] text-ink-3">Noch kein Stand gespeichert.</p>
          ) : (
            <ul className="mt-1.5 overflow-hidden rounded-[6px] border border-line">
              {versionen.map((v, i) => (
                <li
                  key={v.id}
                  className={`flex items-center gap-2 px-3 py-2 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{v.name}</span>
                    <span className="num block text-[12px] text-ink-3">
                      {new Date(v.created_at).toLocaleString("de-DE")}
                    </span>
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => standWiederherstellen(v.canvas_document)}
                  >
                    Wiederherstellen
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
