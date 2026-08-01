import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { PlanThumb } from "@/components/plan/RoomPlan";
import { plans, getRoom, getClass, seatCount } from "@/data/demo";

export const Route = createFileRoute("/sitzplaene/")({
  head: () => ({
    meta: [
      { title: "Sitzpläne — Sitzplan" },
      {
        name: "description",
        content: "Alle Sitzpläne mit Klasse, Raum, Belegung und Bearbeitungsstand.",
      },
      { property: "og:title", content: "Sitzpläne — Sitzplan" },
      {
        property: "og:description",
        content: "Alle Sitzpläne mit Klasse, Raum, Belegung und Bearbeitungsstand.",
      },
    ],
  }),
  component: Sitzplaene,
});

function Sitzplaene() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Sitzplan", to: "/" }, { label: "Sitzpläne" }]}
        title="Sitzpläne"
        subtitle="Jeder Sitzplan verbindet eine Klasse mit einem Raum. Konflikte werden geprüft, aber nie automatisch geändert."
        actions={
          <Button variant="primary">
            <Plus size={16} strokeWidth={1.5} />
            Neuer Sitzplan
          </Button>
        }
      />
      <div className="px-5 py-7 md:px-8">
        <ul className="divide-y divide-[color:var(--line)] overflow-hidden rounded-[8px] border border-line bg-panel shadow-[var(--shadow-panel)]">
          {plans.map((p, i) => {
            const room = getRoom(p.roomId)!;
            const cls = getClass(p.classId)!;
            return (
              <li key={p.id} className="reveal" style={{ "--i": i } as never}>
                <Link
                  to="/sitzplaene/$id"
                  params={{ id: p.id }}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-3 hover:bg-elevated"
                >
                  <PlanThumb room={room} width={44} height={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium">{p.title}</span>
                    <span className="block truncate text-[13px] text-ink-2">
                      {cls.name} · {room.name} · {Object.keys(p.assignments).length} von{" "}
                      {seatCount(room)} Plätzen belegt
                    </span>
                  </span>
                  <span className="num text-ink-3">{p.updated}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
