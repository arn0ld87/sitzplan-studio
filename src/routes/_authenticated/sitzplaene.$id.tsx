import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Star,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { SaveStatus } from "@/components/ui-kit/SaveStatus";
import { StudentChip } from "@/components/ui-kit/StudentChip";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";
import { Field, Modal, inputClass } from "@/components/ui-kit/Modal";
import { SearchField } from "@/components/ui-kit/SearchField";
import { RoomPlan } from "@/components/plan/RoomPlan";
import {
  allSeats,
  seatCount,
  studentName,
  VORN_LABEL,
  VORN_SEITEN,
  type PlanStatus,
  type Student,
  type VornSeite,
} from "@/data/types";
import { nachbarplaetze, pruefeSitzregeln } from "@/data/sitzregeln";
import { useStore } from "@/store/app";
import { supabase } from "@/integrations/supabase/client";
import { ladeVersionen, speichereVersion, type PlanVersion } from "@/lib/versionen";
import { befundZusammenfassung, type GepruefterVorschlag } from "@/data/ki-vorschlag";
import { erzeugeSitzplanVorschlag, type KiFehler } from "@/lib/ki";

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
  const [versionen, setVersionen] = useState<PlanVersion[]>([]);
  const [versionenLaden, setVersionenLaden] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [versionFehler, setVersionFehler] = useState("");
  const [verworfen, setVerworfen] = useState<string[]>([]);
  const [kiLaeuft, setKiLaeuft] = useState(false);
  const [kiVorschau, setKiVorschau] = useState<GepruefterVorschlag | null>(null);
  const [kiFehler, setKiFehler] = useState<KiFehler | null>(null);
  const warteRef = useRef<HTMLDivElement>(null);
  const fokusVorWarten = useRef<HTMLElement | null>(null);

  const studentsById = useMemo<Record<string, Student>>(
    () => Object.fromEntries((cls?.students ?? []).map((s) => [s.id, s])),
    [cls],
  );

  const setAssignments = useCallback(
    (next: Record<string, string>) => {
      if (!plan) return;
      // Jede Änderung an der Sitzverteilung beendet eine offene KI-Vorschau —
      // auch das Übernehmen selbst, das genau hier durchläuft. Damit kann kein
      // Zustand entstehen, in dem der Plan etwas anderes zeigt als er enthält.
      setKiVorschau(null);
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

  // Der Wartedialog ist modal, enthält aber nichts Bedienbares — er hat
  // bewusst kein „Abbrechen". Ohne Zutun bliebe der Fokus deshalb hinter dem
  // Overlay auf der Schaltfläche, die den Dialog geöffnet hat: unsichtbar,
  // aber mit Enter erneut auslösbar. Also Fokus auf den Dialog, Tab dort
  // festhalten und danach dorthin zurückgeben, wo er herkam.
  useEffect(() => {
    if (!kiLaeuft) return;
    fokusVorWarten.current = document.activeElement as HTMLElement | null;
    warteRef.current?.focus();

    function fangeTab(e: KeyboardEvent) {
      if (e.key === "Tab") e.preventDefault();
    }
    document.addEventListener("keydown", fangeTab);
    return () => {
      document.removeEventListener("keydown", fangeTab);
      fokusVorWarten.current?.focus?.();
    };
  }, [kiLaeuft]);

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

  // Welche Regel verletzt ist, entscheidet `pruefeSitzregeln` in
  // `src/data/sitzregeln.ts` — dort ist die Fachlogik getestet. Diese Ansicht
  // macht aus einem Konflikt nur noch Text und eine anwendbare Umsetzung.
  const konflikte = pruefeSitzregeln(plan, data.rules);
  const freiePlaetze = allSeats(plan.room).filter((s) => !plan!.assignments[s]);

  type Vorschlag = { id: string; text: string; anwenden: () => void };
  const vorschlaege: Vorschlag[] = konflikte.map((k) => {
    const nameA = studentsById[k.a] ? studentName(studentsById[k.a]!) : "?";
    const nameB = studentsById[k.b] ? studentName(studentsById[k.b]!) : "?";
    const nachbarnVonA = nachbarplaetze(plan!.room, k.sitzA);

    // Wohin der zweite Schüler ziehen soll: bei "nicht neben" weg von A, bei
    // "muss neben" auf einen freien Platz direkt neben A. Findet sich keiner,
    // bleibt der Vorschlag ein Hinweis ohne Schaltfläche.
    const ziel =
      k.kind === "nicht_neben"
        ? freiePlaetze.find((f) => !nachbarnVonA.includes(f) && f !== k.sitzA)
        : nachbarnVonA.find((n) => !plan!.assignments[n]);

    const text =
      k.kind === "nicht_neben"
        ? ziel
          ? `${nameA} und ${nameB} sitzen nebeneinander. Vorschlag: ${nameB} auf einen freien Platz weiter weg setzen.`
          : `${nameA} und ${nameB} sitzen nebeneinander. Es ist kein passender freier Platz vorhanden.`
        : ziel
          ? `${nameA} und ${nameB} sollen nebeneinander sitzen. Vorschlag: ${nameB} auf den freien Nachbarplatz setzen.`
          : `${nameA} und ${nameB} sitzen nicht nebeneinander. Neben ${nameA} ist kein Platz frei.`;

    return {
      id: k.regelId,
      text,
      anwenden: () => {
        if (!ziel) return;
        const next = { ...plan!.assignments };
        delete next[k.sitzB];
        next[ziel] = k.b;
        setAssignments(next);
      },
    };
  });
  const offeneVorschlaege = vorschlaege.filter((v) => !verworfen.includes(v.id));

  async function versionenLaenden() {
    setVersionenLaden(true);
    setVersionFehler("");
    const { data: rows, error } = await ladeVersionen(plan!.id);
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
    const { error } = await speichereVersion(plan!.id, uid, name, plan!.assignments);
    if (error) return setVersionFehler("Der Stand konnte nicht gespeichert werden.");
    setVersionName("");
    void versionenLaenden();
  }

  function standWiederherstellen(doc: PlanVersion["canvas_document"]) {
    const z = doc?.zuordnungen;
    if (!z) return setVersionFehler("Dieser Stand enthält keine Zuordnungen.");
    setAssignments({ ...z });
    setVersionenOffen(false);
  }

  // Solange eine KI-Vorschau offen ist, zeigt die Ansicht durchgängig sie:
  // Zeichnung, Ablage und Zähler. Ein halb umgestellter Bildschirm wäre
  // schlimmer als gar keine Vorschau.
  const sichtbareZuordnung = kiVorschau?.assignments ?? plan.assignments;
  const belegteIds = new Set(Object.values(sichtbareZuordnung));
  const offen = (cls?.students ?? []).filter((s) => !belegteIds.has(s.id));
  const gefiltert = q.trim()
    ? offen.filter((s) => studentName(s).toLowerCase().includes(q.trim().toLowerCase()))
    : offen;
  const plaetze = seatCount(plan.room);

  const nameVon = (schuelerId: string) => {
    const s = studentsById[schuelerId];
    return s ? studentName(s) : "?";
  };

  const kiHinweise = kiVorschau ? befundZusammenfassung(kiVorschau.befunde) : [];
  const kiOhnePlatz = (kiVorschau?.befunde ?? [])
    .filter((b) => b.art === "nicht_zugeordnet")
    .map((b) => (b.art === "nicht_zugeordnet" ? nameVon(b.schuelerId) : ""));
  const kiRegelzeilen = (kiVorschau?.konflikte ?? []).map((k) =>
    k.kind === "nicht_neben"
      ? `Regelverstoß: ${nameVon(k.a)} und ${nameVon(k.b)} sitzen nebeneinander.`
      : `Regelverstoß: ${nameVon(k.a)} und ${nameVon(k.b)} sitzen nicht nebeneinander.`,
  );
  const kiBegruendungen = Object.entries(kiVorschau?.begruendungen ?? {}).map(
    ([schuelerId, text]) => ({ name: nameVon(schuelerId), text }),
  );

  async function kiErzeugen() {
    setKiFehler(null);
    setKiVorschau(null);
    setKiLaeuft(true);
    try {
      const ergebnis = await erzeugeSitzplanVorschlag(
        plan!.id,
        plan!,
        cls?.students ?? [],
        data.rules,
      );
      if (ergebnis.ok) setKiVorschau(ergebnis.vorschau);
      else setKiFehler(ergebnis.fehler);
    } catch (e) {
      // Ohne `finally` bliebe der Wartedialog bei einer unerwarteten Ausnahme
      // für immer stehen — und er hat kein Abbrechen. Die Ansicht wäre tot.
      setKiFehler({ code: "unerwartet", nachricht: `Unerwarteter Fehler: ${String(e)}` });
    } finally {
      setKiLaeuft(false);
    }
  }

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
        subtitle={`${cls?.name ?? "Klasse gelöscht"} · ${plan.room.name} · ${Object.keys(sichtbareZuordnung).length} von ${plaetze} Plätzen belegt`}
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
            <select
              aria-label="Wo im Raum ist vorn"
              className="h-10 rounded-[6px] border border-line-control bg-elevated px-2.5 text-[13px]"
              value={plan.room.vorn}
              onChange={(e) => {
                setKiVorschau(null);
                dispatch({
                  type: "plan/vorn",
                  id: plan.id,
                  vorn: e.target.value as VornSeite,
                });
              }}
            >
              {VORN_SEITEN.map((s) => (
                <option key={s} value={s}>
                  vorn: {VORN_LABEL[s]}
                </option>
              ))}
            </select>
            <span className="sr-only" aria-live="polite">
              {`Vorn im Raum: ${VORN_LABEL[plan.room.vorn]}`}
            </span>
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
                      merkmale={s.merkmale}
                      notiz={s.notiz}
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
              Platz tauscht die Personen. Escape hebt die Auswahl auf, ein Klick in diese Spalte
              setzt jemanden zurück in die Ablage.
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
            <Button
              className="mt-2 w-full"
              variant="secondary"
              size="sm"
              onClick={() => void kiErzeugen()}
              disabled={kiLaeuft || plaetze === 0 || (cls?.students.length ?? 0) === 0}
            >
              <Star size={16} strokeWidth={1.5} />
              Plan mit KI erzeugen
            </Button>
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
          {kiFehler && (
            <div
              role="alert"
              className="mb-3 flex flex-wrap items-center gap-3 rounded-[8px] border border-line bg-warn-bg px-3 py-2.5"
            >
              <AlertTriangle size={16} strokeWidth={1.5} className="shrink-0 text-warn" />
              <span className="min-w-0 flex-1 text-[13px]">{kiFehler.nachricht}</span>
              <Button variant="quiet" size="sm" onClick={() => setKiFehler(null)}>
                Schließen
              </Button>
            </div>
          )}

          {/* Vorschlagsbereich nach docs/designsystem.md: Terrakotta-Stern,
              Erklärung, zwei Aktionen. Kein Funkeln — das steht dort
              ausdrücklich, ein Sparkles-Icon verstieße dagegen. */}
          {kiVorschau && (
            <div className="mb-3 rounded-[8px] border border-line bg-panel p-3">
              <div className="flex flex-wrap items-center gap-3">
                <Star size={16} strokeWidth={1.5} className="shrink-0 text-[color:var(--action)]" />
                <span className="min-w-0 flex-1 text-[13px] font-medium">
                  Vorschlag der KI — noch nicht übernommen. Die Zeichnung zeigt ihn zur Ansicht.
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setAssignments(kiVorschau.assignments)}
                >
                  Übernehmen
                </Button>
                <Button variant="quiet" size="sm" onClick={() => setKiVorschau(null)}>
                  Verwerfen
                </Button>
              </div>

              {(kiHinweise.length > 0 || kiRegelzeilen.length > 0) && (
                <ul className="mt-2.5 space-y-1 border-t border-line pt-2.5 text-[12px] text-ink-2">
                  {kiHinweise.map((h) => (
                    <li key={h} className="flex gap-2">
                      <AlertTriangle
                        size={14}
                        strokeWidth={1.5}
                        className="mt-px shrink-0 text-warn"
                      />
                      <span>{h}</span>
                    </li>
                  ))}
                  {kiOhnePlatz.length > 0 && (
                    <li className="pl-[22px]">Ohne Platz: {kiOhnePlatz.join(", ")}.</li>
                  )}
                  {kiRegelzeilen.map((z) => (
                    <li key={z} className="flex gap-2">
                      <AlertTriangle
                        size={14}
                        strokeWidth={1.5}
                        className="mt-px shrink-0 text-warn"
                      />
                      <span>{z}</span>
                    </li>
                  ))}
                </ul>
              )}

              {kiBegruendungen.length > 0 && (
                <details className="mt-2.5 border-t border-line pt-2.5">
                  <summary className="cursor-pointer text-[12px] text-ink-2">
                    Begründung je Schüler ({kiBegruendungen.length})
                  </summary>
                  <ul className="mt-1.5 space-y-1 text-[12px] text-ink-2">
                    {kiBegruendungen.map((b) => (
                      <li key={b.name}>
                        <span className="font-medium text-ink">{b.name}:</span> {b.text}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

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
              assignments={sichtbareZuordnung}
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
        <Field
          label="Name des Standes"
          hint="Optional — sonst Datum und Uhrzeit"
          error={versionFehler}
        >
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

      {/* Wartedialog. Bewusst ohne Abbrechen: Der Aufruf läuft serverseitig
          weiter und kostet auch dann, wenn niemand mehr zusieht — eine
          Schaltfläche, die nur das Warten beendet, verspricht mehr als sie
          hält. Stattdessen wird die Dauer ehrlich benannt. */}
      {kiLaeuft && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(38,33,28,0.32)] p-4"
          role="alertdialog"
          aria-labelledby="ki-warte-titel"
          aria-busy="true"
        >
          <div
            ref={warteRef}
            tabIndex={-1}
            className="w-full max-w-[380px] rounded-[10px] border border-line bg-elevated p-5 text-center shadow-[var(--shadow-overlay)] focus:outline-none"
          >
            <Loader2
              size={24}
              strokeWidth={1.5}
              aria-hidden
              className="mx-auto animate-spin text-[color:var(--select)] motion-reduce:animate-none"
            />
            <h2 id="ki-warte-titel" className="mt-3 font-serif text-[18px] font-semibold">
              Die KI stellt den Plan
            </h2>
            <p className="prose-measure mt-1.5 text-[13px] text-ink-2">
              Das dauert etwa 7 bis 15 Sekunden. Der Vorschlag erscheint danach zur Ansicht und wird
              erst übernommen, wenn du es bestätigst.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
