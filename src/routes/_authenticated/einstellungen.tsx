import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, LogOut, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui-kit/Button";
import { ConfirmDialog } from "@/components/ui-kit/ConfirmDialog";
import { useStore } from "@/store/app";
import { supabase } from "@/integrations/supabase/client";
import { kontoLoeschen } from "@/lib/konto.functions";


export const Route = createFileRoute("/_authenticated/einstellungen")({
  component: Einstellungen,
  head: () => ({
    meta: [
      { title: "Einstellungen — Sitzplan" },
      { name: "description", content: "Daten exportieren oder Konto und alle Daten löschen." },
      { property: "og:title", content: "Einstellungen — Sitzplan" },
      {
        property: "og:description",
        content: "Daten exportieren oder Konto und alle Daten löschen.",
      },
    ],
  }),
});

function Einstellungen() {
  const { data } = useStore();
  const navigate = useNavigate();
  const [frage, setFrage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [abmeldend, setAbmeldend] = useState(false);

  useEffect(() => {
    let aktiv = true;
    void supabase.auth.getUser().then(({ data: u }) => {
      if (aktiv) setEmail(u.user?.email ?? "");
    });
    return () => {
      aktiv = false;
    };
  }, []);

  async function abmelden() {
    setAbmeldend(true);
    await supabase.auth.signOut();
    navigate({ to: "/signin", replace: true });
  }


  function exportieren() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sitzplan-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export erstellt.");
  }

  async function loeschen() {
    setBusy(true);
    try {
      await kontoLoeschen();
      await supabase.auth.signOut();
      navigate({ to: "/signin", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      setBusy(false);
      setFrage(false);
    }
  }

  return (
    <>
      <PageHeader crumbs={[{ label: "Konto" }]} title="Einstellungen" />
      <div className="px-5 py-6 md:px-8">
        <div className="max-w-[620px] space-y-4">
          <section className="rounded-[8px] border border-line bg-elevated p-5">
            <h2 className="text-[15px] font-semibold">Alle meine Daten exportieren</h2>
            <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-2">
              Lädt Klassen, Schülerinnen und Schüler, Räume, Sitzpläne und den Papierkorb als
              JSON-Datei herunter.
            </p>
            <Button variant="secondary" className="mt-4" onClick={exportieren}>
              <Download size={16} strokeWidth={1.5} />
              Export herunterladen
            </Button>
          </section>

          <section className="rounded-[8px] border border-[color:var(--danger-bg)] bg-elevated p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-danger">
              <TriangleAlert size={16} strokeWidth={1.5} />
              Konto und alle Daten löschen
            </h2>
            <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-2">
              Entfernt das Konto sowie sämtliche Klassen, Räume und Sitzpläne unwiderruflich.
              Ein Export sollte vorher erstellt werden.
            </p>
            <Button variant="danger" className="mt-4" onClick={() => setFrage(true)} disabled={busy}>
              Konto endgültig löschen
            </Button>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={frage}
        title="Konto und alle Daten löschen?"
        description="Alle Klassen, Schülerdaten, Räume und Sitzpläne werden dauerhaft entfernt."
        consequence="Dieser Schritt lässt sich nicht rückgängig machen."
        confirmLabel={busy ? "Wird gelöscht …" : "Endgültig löschen"}
        onConfirm={loeschen}
        onCancel={() => setFrage(false)}
      />
    </>
  );
}
