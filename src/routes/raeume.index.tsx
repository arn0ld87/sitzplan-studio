import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { PlanThumb } from "@/components/plan/RoomPlan";
import { rooms, seatCount } from "@/data/demo";

export const Route = createFileRoute("/raeume/")({
  head: () => ({
    meta: [
      { title: "Räume — Sitzplan" },
      {
        name: "description",
        content: "Raumvorlagen mit Grundriss, Maßen und Sitzplatzanzahl — zeichnen und anpassen.",
      },
      { property: "og:title", content: "Räume — Sitzplan" },
      {
        property: "og:description",
        content: "Raumvorlagen mit Grundriss, Maßen und Sitzplatzanzahl.",
      },
    ],
  }),
  component: Raeume,
});

function Raeume() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Sitzplan", to: "/" }, { label: "Räume" }]}
        title="Räume"
        subtitle="Grundrisse mit Möbeln und Sitzplätzen. Ein Raum kann für beliebig viele Sitzpläne genutzt werden."
        actions={
          <Button variant="primary">
            <Plus size={16} strokeWidth={1.5} />
            Neuer Raum
          </Button>
        }
      />
      <div className="grid gap-3 px-5 py-7 sm:grid-cols-2 md:px-8 xl:grid-cols-3">
        {rooms.map((r, i) => (
          <Link
            key={r.id}
            to="/raeume/$id"
            params={{ id: r.id }}
            className="reveal rounded-[8px] border border-line bg-panel p-3 shadow-[var(--shadow-panel)] transition-[transform,border-color] duration-[180ms] ease-out hover:-translate-y-px hover:border-[color:var(--line-control)]"
            style={{ "--i": i } as never}
          >
            <PlanThumb room={r} width={400} height={180} />
            <span className="mt-2.5 block text-[14px] font-medium">{r.name}</span>
            <span className="num block text-ink-3">
              {r.width} × {r.height} cm · Raster {r.grid} cm · {seatCount(r)} Plätze
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
