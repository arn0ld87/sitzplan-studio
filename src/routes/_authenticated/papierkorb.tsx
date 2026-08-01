import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Trash2, Users, DoorOpen, Grid2x2 } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui-kit/EmptyState";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";
import { relativeZeit } from "@/lib/zeit";
import { useStore } from "@/store/app";

export const Route = createFileRoute("/_authenticated/papierkorb")({
  head: () => ({
    meta: [
      { title: "Papierkorb — Sitzplan" },
      {
        name: "description",
        content:
          "Gelöschte Klassen, Räume und Sitzpläne wiederherstellen oder endgültig entfernen.",
      },
      { property: "og:title", content: "Papierkorb — Sitzplan" },
      { property: "og:description", content: "Gelöschte Einträge wiederherstellen." },
    ],
  }),
  component: Papierkorb,
});

const ICONS = { klasse: Users, raum: DoorOpen, sitzplan: Grid2x2 } as const;
const LABEL = { klasse: "Klasse", raum: "Raum", sitzplan: "Sitzplan" } as const;

function Papierkorb() {
  const { data, dispatch } = useStore();
  const [purge, setPurge] = useState<string | null>(null);
  const item = data.trash.find((t) => t.id === purge);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Sitzplan", to: "/" }, { label: "Papierkorb" }]}
        title="Papierkorb"
        subtitle="Gelöschte Einträge bleiben hier, bis Sie sie wiederherstellen oder endgültig entfernen."
      />

      <div className="px-5 py-7 md:px-8">
        {data.trash.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title="Der Papierkorb ist leer"
            text="Gelöschte Klassen, Räume und Sitzpläne landen zuerst hier und lassen sich vollständig zurückholen."
          />
        ) : (
          <ul className="overflow-hidden rounded-[8px] border border-line bg-panel">
            {data.trash.map((t, i) => {
              const Icon = ICONS[t.kind];
              return (
                <li
                  key={t.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] border border-line bg-sunken text-ink-3"
                  >
                    <Icon size={16} strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{t.name}</span>
                    <span className="block truncate text-[13px] text-ink-3">
                      {LABEL[t.kind]} · gelöscht {relativeZeit(t.deletedAt)}
                    </span>
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => dispatch({ type: "trash/restore", id: t.id })}
                  >
                    <RotateCcw size={16} strokeWidth={1.5} />
                    Wiederherstellen
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setPurge(t.id)}>
                    <Trash2 size={16} strokeWidth={1.5} />
                    Endgültig löschen
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(item)}
        title={`${item?.name ?? ""} endgültig löschen?`}
        description="Dieser Schritt lässt sich nicht mehr über den Papierkorb zurücknehmen."
        consequence="Die Daten werden dauerhaft aus dem Browserspeicher entfernt."
        confirmLabel="Endgültig löschen"
        onConfirm={() => {
          if (purge) dispatch({ type: "trash/purge", id: purge });
          setPurge(null);
        }}
        onCancel={() => setPurge(null)}
      />
    </>
  );
}
