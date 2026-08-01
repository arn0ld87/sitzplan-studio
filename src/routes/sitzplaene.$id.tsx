import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  Minus,
  Plus,
  Sparkle,
  TriangleAlert,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { SaveStatus, type SaveState } from "@/components/ui-kit/SaveStatus";
import { StudentChip } from "@/components/ui-kit/StudentChip";
import { RoomPlan } from "@/components/plan/RoomPlan";
import { getClass, getPlan, getRoom, seatCount, type Student } from "@/data/demo";

export const Route = createFileRoute("/sitzplaene/$id")({
  loader: ({ params }) => {
    const plan = getPlan(params.id);
    if (!plan) throw notFound();
    return { title: plan.title };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [
          { title: "Sitzplan nicht gefunden — Sitzplan" },
          { name: "robots", content: "noindex" },
        ],
      };
    return {
      meta: [
        { title: `${loaderData.title} — Sitzplan` },
        {
          name: "description",
          content: `Sitzplan „${loaderData.title}“ bearbeiten: Schüler zuweisen, Konflikte prüfen und Vorschläge übernehmen.`,
        },
        { property: "og:title", content: `${loaderData.title} — Sitzplan` },
        {
          property: "og:description",
          content: `Sitzplan „${loaderData.title}“ bearbeiten und Konflikte prüfen.`,
        },
      ],
    };
  },
  component: Sitzplaneditor,
});

function Sitzplaneditor() {
  const { id } = Route.useParams();
  const plan = getPlan(id)!;
  const room = getRoom(plan.roomId)!;
  const cls = getClass(plan.classId)!;

  const [assignments, setAssignments] = useState<Record<string, string>>(plan.assignments);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [trayOpen, setTrayOpen] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [saveState, setSaveState] = useState<SaveState>("aenderungen");
  const [vorschlagOffen, setVorschlagOffen] = useState(true);
  const [konfliktOffen, setKonfliktOffen] = useState(true);

  const studentsById = useMemo(
    () => Object.fromEntries(cls.students.map((s) => [s.id, s])) as Record<string, Student>,
    [cls],
  );

  const ohnePlatz = cls.students.filter((s) => !Object.values(assignments).includes(s.id));

  const konfliktSeats = useMemo(() => {
    if (!konfliktOffen) return [];
    const seats = room.furniture.flatMap((f) => f.seats);
    const treffer = seats.filter((seatId) => {
      const st = assignments[seatId];
      return st === `${cls.id}-s3` || st === `${cls.id}-s4`;
    });
    return treffer;
  }, [assignments, room, cls.id, konfliktOffen]);

  function handleSeat(seatId: string) {
    setSelectedSeat(seatId);
    if (selectedStudent) {
      setAssignments((a) => {
        const next = { ...a };
        for (const [k, v] of Object.entries(next)) if (v === selectedStudent) delete next[k];
        next[seatId] = selectedStudent;
        return next;
      });
      setSelectedStudent(null);
      setSaveState("aenderungen");
    } else if (assignments[seatId]) {
      setAssignments((a) => {
        const next = { ...a };
        delete next[seatId];
        return next;
      });
      setSaveState("aenderungen");
    }
  }

  const belegt = Object.keys(assignments).length;

  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col md:min-h-screen">
      <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-panel px-3">
        <Button variant="quiet" size="sm" asChild>
          <Link to="/sitzplaene">
            <ArrowLeft size={16} strokeWidth={1.5} />
            Sitzpläne
          </Link>
        </Button>
        <span aria-hidden className="h-6 w-px bg-[color:var(--line)]" />
        <div className="min-w-0">
          <h1 className="truncate text-[14px] font-semibold">{plan.title}</h1>
          <p className="num truncate text-ink-3">
            {cls.name} · {room.name} · {belegt} von {seatCount(room)} Plätzen belegt
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
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
          <Button variant="primary" size="sm" onClick={() => setSaveState("gespeichert")}>
            Speichern
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto bg-canvas p-6">
            <div className="mx-auto" style={{ maxWidth: `${(zoom / 100) * 860}px` }}>
              <RoomPlan
                room={room}
                mode="seating"
                showGrid={showGrid}
                assignments={assignments}
                studentsById={studentsById}
                conflictSeats={konfliktSeats}
                selectedSeatId={selectedSeat}
                onSeatClick={handleSeat}
                className="h-auto w-full rounded-[8px] border border-line bg-plan shadow-[var(--shadow-panel)]"
              />
            </div>
          </div>

          {/* Schülerablage */}
          <div className="shrink-0 border-t border-line bg-panel px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="eyebrow">Schülerablage</h2>
              <span className="num rounded-[3px] bg-sunken px-1.5 py-0.5 text-ink-2">
                {ohnePlatz.length} ohne Platz
              </span>
              <Button
                variant="quiet"
                size="sm"
                className="ml-auto"
                aria-expanded={trayOpen}
                onClick={() => setTrayOpen((o) => !o)}
              >
                <ChevronDown
                  size={16}
                  strokeWidth={1.5}
                  className={trayOpen ? "rotate-180 transition-transform" : "transition-transform"}
                />
                {trayOpen ? "Einklappen" : "Ausklappen"}
              </Button>
            </div>
            {trayOpen && (
              <div className="mt-2.5 flex min-h-[64px] flex-wrap items-start gap-2 rounded-[8px] border border-dashed border-line-control bg-sunken p-2.5">
                {ohnePlatz.length === 0 ? (
                  <p className="text-[13px] text-ink-2">
                    Alle Schüler sind einem Platz zugewiesen.
                  </p>
                ) : (
                  ohnePlatz.map((s) => (
                    <StudentChip
                      key={s.id}
                      name={s.name}
                      colorIndex={s.colorIndex}
                      size={40}
                      draggable
                      selected={selectedStudent === s.id}
                      onClick={() => setSelectedStudent(selectedStudent === s.id ? null : s.id)}
                    />
                  ))
                )}
              </div>
            )}
            <p className="mt-2 text-[12px] text-ink-3">
              Schüler mit <kbd>Enter</kbd> auswählen, dann einen freien Platz im Plan mit{" "}
              <kbd>Enter</kbd> belegen. Ziehen mit der Maus ist gleichwertig möglich.
            </p>
          </div>
        </div>

        {/* Rechte Spalte */}
        <aside className="hidden w-[320px] shrink-0 overflow-y-auto border-l border-line bg-panel p-4 xl:block">
          <section aria-labelledby="pruefung">
            <h2 id="pruefung" className="eyebrow">
              Prüfung
            </h2>
            {konfliktOffen ? (
              <div className="mt-2 rounded-[8px] border border-[color:#8A5A12] bg-warning-bg p-3">
                <div className="flex items-center gap-2">
                  <TriangleAlert size={16} strokeWidth={1.5} className="shrink-0 text-warning" />
                  <p className="text-[13px] font-semibold text-warning">
                    Sitzregel verletzt · 1 Konflikt
                  </p>
                </div>
                <p className="prose-measure mt-1.5 text-[13px] text-ink-2">
                  {studentsById[`${cls.id}-s3`]?.name} und {studentsById[`${cls.id}-s4`]?.name}{" "}
                  sitzen nebeneinander, obwohl die Klassenregel eine Trennung vorsieht. Die
                  betroffenen Plätze sind im Plan mit Warnring und Ausrufezeichen markiert.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="sm">
                    Plätze anzeigen
                  </Button>
                  <Button variant="quiet" size="sm" onClick={() => setKonfliktOffen(false)}>
                    Regel aussetzen
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 rounded-[8px] border border-line bg-success-bg p-3 text-[13px] text-success">
                Keine offenen Konflikte. Alle Sitzregeln der {cls.name} sind erfüllt.
              </p>
            )}
          </section>

          {vorschlagOffen && (
            <section aria-labelledby="vorschlag" className="mt-6">
              <h2 id="vorschlag" className="eyebrow flex items-center gap-1.5">
                <Sparkle size={16} strokeWidth={1.5} className="text-action" />
                Vorschlag
              </h2>
              <p className="prose-measure mt-2 text-[13px] text-ink-2">
                Zwei Tausche lösen den Konflikt, ohne die übrige Sitzordnung zu verändern.
              </p>

              <ul className="mt-3 space-y-2">
                {[
                  {
                    von: cls.students[3]!,
                    nach: cls.students[9]!,
                    grund: "Trennung erfüllt, Blickachse zur Tafel bleibt frei.",
                  },
                  {
                    von: cls.students[2]!,
                    nach: cls.students[11]!,
                    grund: "Lernpaar bleibt erhalten, Weg zur Tür wird kürzer.",
                  },
                ].map((t, i) => (
                  <li
                    key={i}
                    className="rounded-[8px] border border-line bg-elevated p-2.5 text-[13px]"
                  >
                    <div className="flex items-center gap-2">
                      <StudentChip name={t.von.name} colorIndex={t.von.colorIndex} />
                      <ArrowRight
                        size={16}
                        strokeWidth={1.5}
                        aria-label="tauscht mit"
                        className="shrink-0 text-ink-3"
                      />
                      <StudentChip name={t.nach.name} colorIndex={t.nach.colorIndex} />
                    </div>
                    <p className="mt-2 text-ink-2">{t.grund}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setKonfliktOffen(false);
                    setVorschlagOffen(false);
                    setSaveState("aenderungen");
                  }}
                >
                  Beide übernehmen
                </Button>
                <Button variant="quiet" size="sm" onClick={() => setVorschlagOffen(false)}>
                  Verwerfen
                </Button>
              </div>
              <p className="prose-measure mt-2 text-[12px] text-ink-3">
                Der Vorschlag ist reproduzierbar: gleiche Klasse, gleicher Raum und gleiche Regeln
                ergeben immer dasselbe Ergebnis. Es wird nichts ohne Bestätigung geändert.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
