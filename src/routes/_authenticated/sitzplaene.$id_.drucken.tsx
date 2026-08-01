import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui-kit/Button";
import { RoomPlan } from "@/components/plan/RoomPlan";
import { merkmalLabel, seatCount, studentName, type Student } from "@/data/types";
import { useStore } from "@/store/app";

export const Route = createFileRoute("/_authenticated/sitzplaene/$id_/drucken")({
  head: () => ({
    meta: [
      { title: "Sitzplan drucken — Sitzplan" },
      {
        name: "description",
        content: "Druckansicht eines Sitzplans mit Grundriss und Namensliste der Klasse.",
      },
      { property: "og:title", content: "Sitzplan drucken — Sitzplan" },
      { property: "og:description", content: "Druckfertige Ansicht eines Sitzplans." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Drucken,
});

function Drucken() {
  const { id } = Route.useParams();
  const { data } = useStore();
  const plan = data.plans.find((p) => p.id === id);
  const cls = plan ? data.classes.find((c) => c.id === plan.classId) : undefined;

  // Beide bewusst aus. Ein ausgedruckter Sitzplan liegt im Klassenraum, wandert
  // in die Vertretungsmappe und bleibt am Kopierer liegen — Merkmale und
  // Notizen stehen nur darauf, wenn jemand es ausdrücklich will. Der
  // automatische Erstdruck weiter unten erzeugt damit immer das sparsame Blatt.
  const [mitMerkmalen, setMitMerkmalen] = useState(false);
  const [mitNotizen, setMitNotizen] = useState(false);

  useEffect(() => {
    if (!plan) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [plan]);

  if (!plan) {
    return (
      <div className="px-5 py-10 md:px-8">
        <h1 className="page-title">Sitzplan nicht gefunden</h1>
        <Button className="mt-5" variant="secondary" asChild>
          <Link to="/sitzplaene">Zurück zu den Sitzplänen</Link>
        </Button>
      </div>
    );
  }

  const studentsById: Record<string, Student> = Object.fromEntries(
    (cls?.students ?? []).map((s) => [s.id, s]),
  );
  const belegt = Object.entries(plan.assignments);

  return (
    <div className="mx-auto max-w-[900px] px-5 py-7 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="secondary" asChild>
          <Link to="/sitzplaene/$id" params={{ id: plan.id }}>
            Zurück zum Editor
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={mitMerkmalen}
              onChange={(e) => setMitMerkmalen(e.target.checked)}
            />
            Besonderheiten mitdrucken
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={mitNotizen}
              onChange={(e) => setMitNotizen(e.target.checked)}
            />
            Notizen mitdrucken
          </label>
          <Button variant="primary" onClick={() => window.print()}>
            Drucken
          </Button>
        </div>
      </div>

      {(mitMerkmalen || mitNotizen) && (
        <p className="mt-3 rounded-[6px] border border-line bg-[color:var(--warning-bg)] px-3 py-2 text-[12.5px] text-[color:var(--warning)] print:hidden">
          Dieses Blatt enthält dann personenbezogene Angaben zu Minderjährigen. Nicht im Klassenraum
          liegen lassen.
        </p>
      )}

      <header className="mt-6">
        <h1 className="page-title">{plan.title}</h1>
        <p className="mt-1 text-[14px] text-ink-2">
          {cls?.name ?? "Klasse gelöscht"} · {plan.room.name} · {belegt.length} von{" "}
          {seatCount(plan.room)} Plätzen belegt
        </p>
      </header>

      <div className="mt-5 overflow-hidden rounded-[8px] border border-line bg-plan">
        <RoomPlan
          room={plan.room}
          mode="seating"
          showGrid={false}
          assignments={plan.assignments}
          studentsById={studentsById}
          className="block h-auto w-full"
        />
      </div>

      <section className="mt-6">
        <h2 className="section-title">Namensliste</h2>
        <ol className="num mt-2 columns-2 gap-8 text-[13px] leading-[1.9]">
          {belegt
            .map(([seatId, sid]) => ({ seatId, s: studentsById[sid] }))
            .filter((e) => e.s)
            .sort((a, b) => studentName(a.s!).localeCompare(studentName(b.s!), "de"))
            .map((e) => {
              const merkmale = mitMerkmalen ? e.s!.merkmale.map(merkmalLabel) : [];
              const notiz = mitNotizen ? e.s!.notiz.trim() : "";
              return (
                <li key={e.seatId} className="break-inside-avoid">
                  {studentName(e.s!)}
                  {merkmale.length > 0 && (
                    <span className="text-ink-2"> — {merkmale.join(", ")}</span>
                  )}
                  {notiz && <span className="text-ink-2"> — {notiz}</span>}
                </li>
              );
            })}
        </ol>
      </section>
    </div>
  );
}
