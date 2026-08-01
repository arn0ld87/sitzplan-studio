import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Pencil, Plus, Users, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { ClassDot } from "@/components/ui-kit/ClassDot";
import { StudentChip } from "@/components/ui-kit/StudentChip";
import { PlanThumb } from "@/components/plan/RoomPlan";
import { getClass, getRoom, plans, seatCount } from "@/data/demo";

export const Route = createFileRoute("/klassen/$id")({
  loader: ({ params }) => {
    const cls = getClass(params.id);
    if (!cls) throw notFound();
    return { name: cls.name, note: cls.note };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [{ title: "Klasse nicht gefunden — Sitzplan" }, { name: "robots", content: "noindex" }],
      };
    return {
      meta: [
        { title: `${loaderData.name} — Sitzplan` },
        {
          name: "description",
          content: `Schülerliste, Sitzregeln und Sitzpläne der ${loaderData.name} (${loaderData.note}).`,
        },
        { property: "og:title", content: `${loaderData.name} — Sitzplan` },
        {
          property: "og:description",
          content: `Schülerliste, Sitzregeln und Sitzpläne der ${loaderData.name}.`,
        },
      ],
    };
  },
  component: Klasse,
});

const TABS = ["Schüler", "Sitzregeln", "Sitzpläne"] as const;

function Klasse() {
  const { id } = Route.useParams();
  const cls = getClass(id)!;
  const [tab, setTab] = useState<(typeof TABS)[number]>("Schüler");
  const clsPlans = plans.filter((p) => p.classId === cls.id);

  return (
    <>
      <header className="border-b border-line bg-panel px-5 py-5 md:px-8">
        <nav aria-label="Brotkrumen" className="mb-2 text-[12px]">
          <Link to="/klassen" className="text-ink-2 underline-offset-2 hover:underline">
            Klassen
          </Link>
          <span className="px-1 text-ink-3">/</span>
          <span className="text-ink-3">{cls.name}</span>
        </nav>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <ClassDot name={cls.name} colorIndex={cls.colorIndex} size={38} />
            <div className="min-w-0">
              <h1 className="page-title truncate">{cls.name}</h1>
              <p className="text-[13px] text-ink-2">
                {cls.note} · <span className="num">{cls.students.length}</span> Schüler ·{" "}
                <span className="num">{cls.rules.length}</span> Sitzregeln
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary">
              <Pencil size={16} strokeWidth={1.5} />
              Bearbeiten
            </Button>
            <Button variant="primary">
              <Plus size={16} strokeWidth={1.5} />
              Sitzplan erstellen
            </Button>
          </div>
        </div>

        <div role="tablist" aria-label="Klassenbereiche" className="-mb-5 mt-5 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-10 border-b-2 px-3 text-[13px] transition-colors ${
                tab === t
                  ? "border-[color:var(--action)] font-semibold text-ink"
                  : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 py-7 md:px-8">
        {tab === "Schüler" && (
          <section aria-label="Schülerliste">
            <p className="eyebrow">{cls.students.length} Personen</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {cls.students.map((s, i) => (
                <span key={s.id} className="reveal" style={{ "--i": i % 8 } as never}>
                  <StudentChip name={s.name} colorIndex={s.colorIndex} />
                </span>
              ))}
            </div>
          </section>
        )}

        {tab === "Sitzregeln" && (
          <section aria-label="Sitzregeln" className="max-w-[620px]">
            {cls.rules.length === 0 ? (
              <p className="prose-measure text-[14px] text-ink-2">
                Für diese Klasse sind keine Sitzregeln hinterlegt. Regeln prüfen einen Sitzplan
                automatisch und melden Konflikte, ändern aber nie selbstständig eine Zuordnung.
              </p>
            ) : (
              <ul className="divide-y divide-[color:var(--line)] overflow-hidden rounded-[8px] border border-line bg-panel">
                {cls.rules.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="rounded-[3px] bg-sunken px-2 py-0.5 text-[12px] text-ink-2">
                      {r.kind}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px]">{r.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "Sitzpläne" && (
          <section aria-label="Sitzpläne der Klasse">
            {clsPlans.length === 0 ? (
              <p className="prose-measure text-[14px] text-ink-2">
                Noch kein Sitzplan für diese Klasse. Wählen Sie einen Raum und verteilen Sie die
                Schüler.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {clsPlans.map((p) => {
                  const room = getRoom(p.roomId)!;
                  return (
                    <li key={p.id}>
                      <Link
                        to="/sitzplaene/$id"
                        params={{ id: p.id }}
                        className="flex items-center gap-3 rounded-[8px] border border-line bg-panel p-3 hover:border-[color:var(--line-control)]"
                      >
                        <PlanThumb room={room} width={56} height={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">{p.title}</span>
                          <span className="num block text-ink-3">
                            {room.name} · {seatCount(room)} Plätze
                          </span>
                        </span>
                        <ArrowUpRight size={16} strokeWidth={1.5} className="text-ink-3" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}

export function KlasseNichtGefunden() {
  return (
    <div className="p-8">
      <Users size={16} strokeWidth={1.5} />
    </div>
  );
}
