import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { PageHeader } from "@/components/PageHeader";
import { SaveStatus, SAVE_STATES } from "@/components/ui-kit/SaveStatus";

export const Route = createFileRoute("/einstellungen")({
  head: () => ({
    meta: [
      { title: "Einstellungen — Sitzplan" },
      {
        name: "description",
        content:
          "Speicherverhalten, Darstellung und Zustände der Oberfläche für das Lehrerwerkzeug Sitzplan.",
      },
      { property: "og:title", content: "Einstellungen — Sitzplan" },
      { property: "og:description", content: "Speicherverhalten und Darstellung anpassen." },
    ],
  }),
  component: Einstellungen,
});

function Einstellungen() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Sitzplan", to: "/" }, { label: "Einstellungen" }]}
        title="Einstellungen"
        subtitle="Speicherverhalten und Darstellung. Alle Zustände der Oberfläche sind hier zur Kontrolle abgebildet."
      />
      <div className="grid gap-8 px-5 py-7 md:px-8 lg:grid-cols-2">
        <section aria-labelledby="zustaende">
          <h2 id="zustaende" className="section-title">
            Speicherstatus
          </h2>
          <p className="prose-measure mt-1 text-[14px] text-ink-2">
            Jeder Zustand hat Symbol und Text, alle sind gleich hoch und sitzen an derselben
            Position — die Toolbar springt nie.
          </p>
          <div className="mt-3 flex flex-col items-start gap-2">
            {SAVE_STATES.map((s) => (
              <SaveStatus key={s} state={s} />
            ))}
          </div>
        </section>

        <div className="space-y-8">
          <section aria-labelledby="laden">
            <h2 id="laden" className="section-title">
              Ladezustand
            </h2>
            <div className="mt-3 space-y-2 rounded-[8px] border border-line bg-panel p-4">
              {[70, 45, 88, 32, 60].map((w, i) => (
                <div key={i} className="skeleton h-3.5" style={{ width: `${w}%` }} />
              ))}
            </div>
          </section>

          <section aria-labelledby="fehler">
            <h2 id="fehler" className="section-title">
              Fehlerzustand
            </h2>
            <div className="mt-3 rounded-[8px] border border-[color:var(--danger)] bg-danger-bg p-4">
              <p className="text-[14px] font-medium text-danger">
                Der Serverstand konnte nicht geladen werden
              </p>
              <p className="prose-measure mt-1 text-[13px] text-ink-2">
                Ihr lokaler Entwurf von 07:38 Uhr ist vollständig erhalten und wurde nicht
                überschrieben.
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" size="sm">
                  <RefreshCw size={16} strokeWidth={1.5} />
                  Erneut versuchen
                </Button>
                <Button variant="quiet" size="sm">
                  <FileText size={16} strokeWidth={1.5} />
                  Entwurf ansehen
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
