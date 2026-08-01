import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { SearchField } from "@/components/ui-kit/SearchField";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";
import { ClassDot } from "@/components/ui-kit/ClassDot";
import { classes } from "@/data/demo";

export const Route = createFileRoute("/klassen/")({
  head: () => ({
    meta: [
      { title: "Klassen verwalten — Sitzplan" },
      {
        name: "description",
        content:
          "Alle Klassen mit Schülerzahl, Sitzregeln und zugehörigen Sitzplänen in einer kompakten Tabelle.",
      },
      { property: "og:title", content: "Klassen verwalten — Sitzplan" },
      {
        property: "og:description",
        content: "Alle Klassen mit Schülerzahl, Sitzregeln und Sitzplänen in einer Tabelle.",
      },
    ],
  }),
  component: Klassen,
});

function Klassen() {
  const [q, setQ] = useState("");
  const [loeschen, setLoeschen] = useState<string | null>(null);
  const gefiltert = classes.filter((c) =>
    (c.name + c.note).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Sitzplan", to: "/" }, { label: "Klassen" }]}
        title="Klassen"
        subtitle="Klassenlisten, Sitzregeln und die daraus erzeugten Sitzpläne. Änderungen wirken sich erst nach dem Speichern auf bestehende Pläne aus."
        actions={
          <>
            <SearchField value={q} onChange={setQ} label="Klassen suchen" />
            <Button variant="primary">
              <Plus size={16} strokeWidth={1.5} />
              Neue Klasse
            </Button>
          </>
        }
      />

      <div className="px-5 py-7 md:px-8">
        {gefiltert.length === 0 ? (
          <LeerZustand />
        ) : (
          <div className="overflow-hidden rounded-[8px] border border-line bg-panel shadow-[var(--shadow-panel)]">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Übersicht aller Klassen</caption>
              <thead>
                <tr className="bg-sunken">
                  {["Klasse", "Schüler", "Sitzregeln", "Sitzpläne", "Aktionen"].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={`eyebrow border-b border-line px-4 py-2.5 ${
                        i === 0 ? "" : "text-right"
                      } ${i > 1 ? "hidden sm:table-cell" : ""}`}
                    >
                      {i === 4 ? <span className="sr-only">Aktionen</span> : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gefiltert.map((c, i) => (
                  <tr
                    key={c.id}
                    className="group reveal border-b border-line last:border-0 hover:bg-elevated"
                    style={{ "--i": i } as never}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to="/klassen/$id"
                        params={{ id: c.id }}
                        className="flex min-w-0 items-center gap-2.5"
                      >
                        <ClassDot name={c.name} colorIndex={c.colorIndex} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium">{c.name}</span>
                          <span className="block truncate text-[13px] text-ink-2">{c.note}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="num px-4 py-3 text-right text-ink-2">{c.students.length}</td>
                    <td className="num hidden px-4 py-3 text-right text-ink-2 sm:table-cell">
                      {c.rules.length}
                    </td>
                    <td className="num hidden px-4 py-3 text-right text-ink-2 sm:table-cell">
                      {c.planIds.length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <Button variant="quiet" size="iconSm" aria-label={`${c.name} bearbeiten`}>
                          <Pencil size={16} strokeWidth={1.5} />
                        </Button>
                        <Button
                          variant="quiet"
                          size="iconSm"
                          aria-label={`${c.name} löschen`}
                          className="text-danger hover:bg-danger-bg"
                          onClick={() => setLoeschen(c.id)}
                        >
                          <Trash2 size={16} strokeWidth={1.5} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={loeschen !== null}
        title="Klasse löschen?"
        description={`„${classes.find((c) => c.id === loeschen)?.name ?? ""}“ wird aus der Liste entfernt. Bestehende Sitzpläne dieser Klasse verlieren ihre Zuordnung und werden als Entwurf abgelegt.`}
        consequence="Die Klasse liegt 30 Tage im Papierkorb und kann bis dahin vollständig wiederhergestellt werden."
        onCancel={() => setLoeschen(null)}
        onConfirm={() => setLoeschen(null)}
      />
    </>
  );
}

function LeerZustand() {
  return (
    <div className="mx-auto max-w-[460px] py-10 text-center">
      <svg width="132" height="96" viewBox="0 0 132 96" aria-hidden className="mx-auto">
        <rect
          x="6"
          y="10"
          width="120"
          height="76"
          rx="6"
          fill="var(--panel)"
          stroke="var(--line-strong)"
        />
        <line x1="6" y1="28" x2="126" y2="28" stroke="var(--line-strong)" />
        <circle cx="30" cy="52" r="9" fill="none" stroke="var(--line-control)" strokeWidth="1.5" />
        <circle cx="60" cy="52" r="9" fill="none" stroke="var(--line-control)" strokeWidth="1.5" />
        <circle
          cx="90"
          cy="52"
          r="9"
          fill="none"
          stroke="var(--action)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <line x1="22" y1="72" x2="110" y2="72" stroke="var(--line-control)" strokeDasharray="4 4" />
      </svg>
      <h2 className="section-title mt-5">Noch keine Klasse angelegt</h2>
      <p className="prose-measure mx-auto mt-1.5 text-[14px] text-ink-2">
        Eine Klasse besteht aus einer Namensliste und optionalen Sitzregeln. Aus ihr lassen sich
        beliebig viele Sitzpläne für verschiedene Räume erzeugen.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button variant="primary">
          <Plus size={16} strokeWidth={1.5} />
          Erste Klasse anlegen
        </Button>
        <Button variant="secondary">
          <Upload size={16} strokeWidth={1.5} />
          CSV importieren
        </Button>
      </div>
    </div>
  );
}
