import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { SearchField } from "@/components/ui-kit/SearchField";
import { PlanThumb } from "@/components/plan/RoomPlan";
import { classes, plans, rooms, getClass, getRoom, seatCount } from "@/data/demo";
import { ClassDot } from "@/components/ui-kit/ClassDot";
import { StatusChip } from "@/components/ui-kit/StatusChip";
import { relativeZeit } from "@/lib/zeit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Übersicht — Sitzplan" },
      {
        name: "description",
        content:
          "Zuletzt bearbeitete Sitzpläne, Raumvorlagen und Klassen auf einen Blick — das Lehrerwerkzeug Sitzplan.",
      },
      { property: "og:title", content: "Übersicht — Sitzplan" },
      {
        property: "og:description",
        content: "Zuletzt bearbeitete Sitzpläne, Raumvorlagen und Klassen auf einen Blick.",
      },
    ],
  }),
  component: Uebersicht,
});

const OHNE_PLAN = [
  { id: "6d", meta: "zuletzt geplant im Juni" },
  { id: "8a", meta: "zuletzt geplant im Juni" },
  { id: "10b", meta: "noch nie geplant" },
];


function Uebersicht() {
  const [q, setQ] = useState("");
  const heute = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const liste = plans.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <header className="border-b border-line bg-panel px-5 py-5 md:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="page-title truncate">Guten Morgen</h1>
            <p className="num mt-1 text-ink-3">{heute}</p>
          </div>
          <div className="flex items-center gap-2">
            <SearchField value={q} onChange={setQ} label="Sitzpläne suchen" />
            <Button variant="primary">
              <Plus size={16} strokeWidth={1.5} />
              Neuer Sitzplan
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-8 px-5 py-7 md:px-8 lg:grid-cols-[minmax(0,1fr)_312px]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="zuletzt" className="reveal">
            <h2 id="zuletzt" className="section-title">
              Zuletzt bearbeitet
            </h2>
            <ul className="mt-3 divide-y divide-[color:var(--line)] overflow-hidden rounded-[8px] border border-line bg-panel shadow-[var(--shadow-panel)]">
              {liste.map((p) => {
                const room = getRoom(p.roomId)!;
                const cls = getClass(p.classId)!;
                const belegt = Object.keys(p.assignments).length;
                return (
                  <li key={p.id}>
                    <Link
                      to="/sitzplaene/$id"
                      params={{ id: p.id }}
                      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-3 transition-colors hover:bg-elevated"
                    >
                      <PlanThumb room={room} width={44} height={32} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium">{p.title}</span>
                        <span className="block truncate text-[13px] text-ink-2">
                          {cls.name} · {room.name} · {belegt} von {seatCount(room)} Plätzen belegt
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <StatusChip status={p.status} className="hidden sm:inline-flex" />
                        <span className="num hidden text-right text-ink-3 md:inline">
                          {relativeZeit(p.updated)}
                        </span>

                        <ArrowUpRight
                          size={16}
                          strokeWidth={1.5}
                          aria-hidden
                          className="text-ink-3 opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
              {liste.length === 0 && (
                <li className="px-4 py-6 text-[13px] text-ink-2">
                  Kein Sitzplan passt zu „{q}“.
                </li>
              )}
            </ul>
          </section>

          <section aria-labelledby="vorlagen" className="reveal" style={{ "--i": 1 } as never}>
            <h2 id="vorlagen" className="section-title">
              Raumvorlagen
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {rooms.map((r) => (
                <Link
                  key={r.id}
                  to="/raeume/$id"
                  params={{ id: r.id }}
                  className="rounded-[8px] border border-line bg-panel p-3 shadow-[var(--shadow-panel)] transition-[transform,border-color] duration-[180ms] ease-out hover:-translate-y-px hover:border-[color:var(--line-control)]"
                >
                  <PlanThumb room={r} width={200} height={92} />
                  <span className="mt-2.5 block text-[14px] font-medium">{r.name}</span>
                  <span className="num block text-ink-3">
                    {r.width} × {r.height} cm · {seatCount(r)} Plätze
                  </span>
                </Link>
              ))}
              <button
                type="button"
                className="grid min-h-[150px] place-items-center rounded-[8px] border border-dashed border-line-control bg-transparent p-3 text-[13px] text-ink-2 transition-colors hover:border-[color:var(--action)] hover:text-action-soft-ink"
              >
                <span className="flex flex-col items-center gap-1.5">
                  <Plus size={16} strokeWidth={1.5} />
                  Raumvorlage anlegen
                </span>
              </button>
            </div>
          </section>

          <section aria-labelledby="ohne-plan" className="reveal" style={{ "--i": 2 } as never}>
            <h2 id="ohne-plan" className="section-title">
              Klassen ohne aktuellen Sitzplan
            </h2>
            <ul className="mt-3 divide-y divide-[color:var(--line)] overflow-hidden rounded-[8px] border border-line bg-panel shadow-[var(--shadow-panel)]">
              {OHNE_PLAN.map((e) => {
                const c = getClass(e.id);
                if (!c) return null;
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-elevated"
                  >
                    <ClassDot name={c.name} colorIndex={c.colorIndex} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{c.name}</span>
                      <span className="block truncate text-[13px] text-ink-2">
                        {c.students.length} Schüler · {e.meta}
                      </span>
                    </span>
                    <button
                      type="button"
                      style={{ height: 34, borderColor: "#D2C5AF", background: "#FCFAF6" }}
                      className="shrink-0 rounded-[8px] border px-3 text-[13px] font-medium transition-colors hover:border-[color:var(--action)]"
                    >
                      Sitzplan erstellen
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>


        <aside className="space-y-6 reveal" style={{ "--i": 2 } as never}>
          <section aria-labelledby="klassen-kurz">
            <h2 id="klassen-kurz" className="eyebrow">
              Klassen
            </h2>
            <ul className="mt-2 divide-y divide-[color:var(--line)] overflow-hidden rounded-[8px] border border-line bg-panel">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/klassen/$id"
                    params={{ id: c.id }}
                    className="flex h-[40px] items-center gap-2.5 px-3 hover:bg-elevated"
                  >
                    <ClassDot name={c.name} colorIndex={c.colorIndex} />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{c.name}</span>
                    <span className="num text-ink-3">{c.students.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="datenstand"
            className="rounded-[8px] border border-line bg-info-bg p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="datenstand" className="text-[13px] font-semibold text-info">
                Datenstand
              </h2>
              <span className="rounded-[3px] border border-[color:var(--info)] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-info">
                Testbetrieb
              </span>
            </div>
            <p className="prose-measure mt-1.5 text-[13px] text-info">
              Diese Ansicht läuft mit Fantasiedaten. Namen, Klassen und Räume sind erfunden,
              Änderungen werden nicht dauerhaft gespeichert.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
