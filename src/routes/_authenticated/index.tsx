import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, DoorOpen, Grid2x2, Plus, ArrowRight, Info, Check } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/ui-kit/StatusChip";
import { ClassDot } from "@/components/ui-kit/ClassDot";
import { relativeZeit } from "@/lib/zeit";
import { seatCount } from "@/data/types";
import { useStore } from "@/store/app";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Sitzplan — Klassen, Räume und Sitzpläne für Lehrkräfte" },
      {
        name: "description",
        content:
          "Sitzplan bündelt Klassenlisten, Raumgrundrisse und Sitzordnungen in einer ruhigen Oberfläche. Alle Daten bleiben lokal im Browser.",
      },
      { property: "og:title", content: "Sitzplan — Klassen, Räume und Sitzpläne" },
      {
        property: "og:description",
        content: "Klassen verwalten, Räume zeichnen, Sitzpläne erstellen.",
      },
    ],
  }),
  component: Uebersicht,
});

function Schritt({
  nummer,
  titel,
  text,
  cta,
  to,
  erledigt,
  gesperrt,
  grund,
}: {
  nummer: number;
  titel: string;
  text: string;
  cta: string;
  to: string;
  erledigt: boolean;
  gesperrt: boolean;
  grund?: string;
}) {
  return (
    <li className="flex gap-4 rounded-[8px] border border-line bg-panel p-5">
      <span
        aria-hidden
        className={`num grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[13px] ${
          erledigt
            ? "border-[color:var(--action)] bg-action-soft text-action-soft-ink"
            : gesperrt
              ? "border-line bg-sunken text-ink-disabled"
              : "border-line-control bg-elevated text-ink"
        }`}
      >
        {erledigt ? <Check size={16} strokeWidth={2} /> : nummer}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className={`text-[15px] font-semibold ${gesperrt ? "text-ink-3" : ""}`}>{titel}</h3>
        <p className="prose-measure mt-1 text-[14px] text-ink-2">{text}</p>
        {gesperrt && grund && <p className="mt-1 text-[13px] text-ink-3">{grund}</p>}
        <div className="mt-3">
          {gesperrt ? (
            <Button variant="secondary" size="sm" disabled>
              {cta}
            </Button>
          ) : (
            <Button variant={erledigt ? "secondary" : "primary"} size="sm" asChild>
              <Link to={to}>
                {cta}
                <ArrowRight size={16} strokeWidth={1.5} />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

function Uebersicht() {
  const { data } = useStore();
  const hatKlassen = data.classes.length > 0;
  const hatRaeume = data.rooms.length > 0;
  const hatPlaene = data.plans.length > 0;
  const leer = !hatKlassen && !hatRaeume && !hatPlaene;

  const bereiteKlassen = data.classes.filter((c) => c.students.length > 0);
  const bereiteRaeume = data.rooms.filter((r) => seatCount(r) > 0);
  const kannPlan = bereiteKlassen.length > 0 && bereiteRaeume.length > 0;

  const ohnePlan = data.classes.filter((c) => !data.plans.some((p) => p.classId === c.id));
  const letzte = [...data.plans]
    .sort((a, b) => b.updated.localeCompare(a.updated))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Sitzplan" }]}
        title="Übersicht"
        subtitle="Klassen, Räume und Sitzpläne an einer Stelle. Der Weg führt immer von der Klasse über den Raum zum Sitzplan."
        actions={
          !leer && (
            <Button variant="primary" asChild>
              <Link to="/sitzplaene">
                <Plus size={16} strokeWidth={1.5} />
                Sitzplan erstellen
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-8 px-5 py-7 md:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-8">
          <section aria-labelledby="start">
            <h2 id="start" className="section-title">
              {leer ? "In drei Schritten zum ersten Sitzplan" : "Nächste Schritte"}
            </h2>
            <ol className="mt-3 space-y-2.5">
              <Schritt
                nummer={1}
                titel="Klasse anlegen"
                text="Name der Klasse und die Schülerinnen und Schüler. Farben und Initialen vergibt die Anwendung."
                cta={hatKlassen ? "Klassen öffnen" : "Klasse anlegen"}
                to="/klassen"
                erledigt={bereiteKlassen.length > 0}
                gesperrt={false}
              />
              <Schritt
                nummer={2}
                titel="Raum zeichnen"
                text="Maße festlegen, dann Tische, Pult, Tafel, Tür und Fenster im Raster setzen."
                cta={hatRaeume ? "Räume öffnen" : "Raum anlegen"}
                to="/raeume"
                erledigt={bereiteRaeume.length > 0}
                gesperrt={!hatKlassen}
                grund="Erst eine Klasse anlegen."
              />
              <Schritt
                nummer={3}
                titel="Sitzplan erstellen"
                text="Klasse und Raum verbinden, danach die Schüler auf die Plätze ziehen."
                cta={hatPlaene ? "Sitzpläne öffnen" : "Sitzplan erstellen"}
                to="/sitzplaene"
                erledigt={hatPlaene}
                gesperrt={!kannPlan}
                grund={
                  bereiteKlassen.length === 0
                    ? "Erst eine Klasse mit Schülern anlegen."
                    : "Erst einen Raum mit Sitzplätzen zeichnen."
                }
              />
            </ol>
          </section>

          {hatPlaene && (
            <section aria-labelledby="zuletzt">
              <h2 id="zuletzt" className="section-title">
                Zuletzt bearbeitet
              </h2>
              <ul className="mt-3 overflow-hidden rounded-[8px] border border-line bg-panel">
                {letzte.map((p, i) => {
                  const cls = data.classes.find((c) => c.id === p.classId);
                  return (
                    <li
                      key={p.id}
                      className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}
                    >
                      {cls && <ClassDot name={cls.name} colorIndex={cls.colorIndex} size={28} />}
                      <Link to="/sitzplaene/$id" params={{ id: p.id }} className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{p.title}</span>
                        <span className="block truncate text-[13px] text-ink-3">
                          {p.room.name} · {relativeZeit(p.updated)}
                        </span>
                      </Link>
                      <span className="num shrink-0 text-[13px] text-ink-2">
                        {Object.keys(p.assignments).length}/{seatCount(p.room)}
                      </span>
                      <StatusChip status={p.status} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {ohnePlan.length > 0 && (
            <section aria-labelledby="ohne-plan">
              <h2 id="ohne-plan" className="section-title">
                Klassen ohne aktuellen Sitzplan
              </h2>
              <ul className="mt-3 overflow-hidden rounded-[8px] border border-line bg-panel">
                {ohnePlan.map((c, i) => (
                  <li
                    key={c.id}
                    className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <ClassDot name={c.name} colorIndex={c.colorIndex} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{c.name}</span>
                      <span className="block truncate text-[13px] text-ink-3">
                        {c.students.length === 0
                          ? "Noch keine Schüler eingetragen"
                          : `${c.students.length} Schüler`}
                      </span>
                    </span>
                    {c.students.length === 0 || bereiteRaeume.length === 0 ? (
                      <Button variant="secondary" size="sm" asChild>
                        <Link
                          to={c.students.length === 0 ? "/klassen/$id" : "/raeume"}
                          {...(c.students.length === 0 ? { params: { id: c.id } } : {})}
                        >
                          {c.students.length === 0 ? "Schüler eintragen" : "Raum zeichnen"}
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" asChild>
                        <Link to="/sitzplaene" search={{ neu: c.id }}>
                          Sitzplan erstellen
                        </Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[8px] border border-line bg-panel p-4">
            <h2 className="eyebrow">Bestand</h2>
            <dl className="mt-2 space-y-2 text-[14px]">
              {[
                { icon: Users, label: "Klassen", wert: data.classes.length, to: "/klassen" },
                { icon: DoorOpen, label: "Räume", wert: data.rooms.length, to: "/raeume" },
                { icon: Grid2x2, label: "Sitzpläne", wert: data.plans.length, to: "/sitzplaene" },
              ].map(({ icon: Icon, label, wert, to }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <Icon size={16} strokeWidth={1.5} className="text-ink-3" />
                  <dt className="min-w-0 flex-1">
                    <Link to={to} className="underline-offset-2 hover:underline">
                      {label}
                    </Link>
                  </dt>
                  <dd className="num text-ink-2">{String(wert).padStart(2, "0")}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-[8px] border border-line bg-info-bg p-4">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-info">
              <Info size={16} strokeWidth={1.5} aria-hidden />
              Datenstand
            </h2>
            <p className="prose-measure mt-1.5 text-[13px] leading-[1.6] text-ink-2">
              Alle Klassen, Räume und Sitzpläne liegen ausschließlich lokal in diesem Browser. Es
              gibt kein Nutzerkonto und keine Übertragung an einen Server. Wird der Browserspeicher
              geleert oder ein anderes Gerät verwendet, beginnt die Anwendung wieder leer.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
