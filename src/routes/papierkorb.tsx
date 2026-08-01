import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/papierkorb")({
  head: () => ({
    meta: [
      { title: "Papierkorb — Sitzplan" },
      {
        name: "description",
        content: "Gelöschte Klassen, Räume und Sitzpläne mit Wiederherstellungsfrist von 30 Tagen.",
      },
      { property: "og:title", content: "Papierkorb — Sitzplan" },
      { property: "og:description", content: "Gelöschte Einträge mit 30 Tagen Wiederherstellung." },
    ],
  }),
  component: Papierkorb,
});

const ITEMS = [
  { id: "t1", name: "Klasse 8a — alte Liste", art: "Klasse", rest: "noch 22 Tage" },
  { id: "t2", name: "Stuhlkreis — Probelauf", art: "Sitzplan", rest: "noch 6 Tage" },
];

function Papierkorb() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Sitzplan", to: "/" }, { label: "Papierkorb" }]}
        title="Papierkorb"
        subtitle="Gelöschte Einträge bleiben 30 Tage erhalten und lassen sich bis zum Ablauf der Frist vollständig wiederherstellen."
      />
      <div className="px-5 py-7 md:px-8">
        <ul className="divide-y divide-[color:var(--line)] overflow-hidden rounded-[8px] border border-line bg-panel">
          {ITEMS.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-3">
              <span className="rounded-[3px] bg-sunken px-2 py-0.5 text-[12px] text-ink-2">
                {i.art}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px]">{i.name}</span>
              <span className="num text-ink-3">{i.rest}</span>
              <Button variant="secondary" size="sm">
                <RotateCcw size={16} strokeWidth={1.5} />
                Wiederherstellen
              </Button>
              <Button variant="quiet" size="iconSm" aria-label={`${i.name} endgültig löschen`} className="text-danger hover:bg-danger-bg">
                <Trash2 size={16} strokeWidth={1.5} />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
