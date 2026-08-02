import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui-kit/Button";
import { Wortmarke } from "@/components/Marke";

export const Route = createFileRoute("/signin")({
  ssr: false,
  component: SignIn,
  head: () => ({
    meta: [
      { title: "Anmelden — Sitzplan" },
      {
        name: "description",
        content: "Melden Sie sich an, um Klassen, Räume und Sitzpläne zu verwalten.",
      },
      { property: "og:title", content: "Anmelden — Sitzplan" },
      {
        property: "og:description",
        content: "Melden Sie sich an, um Klassen, Räume und Sitzpläne zu verwalten.",
      },
    ],
  }),
});

// Diese Anwendung kennt keine Selbstregistrierung: Konten legt die betreibende
// Stelle im Supabase-Dashboard an. Das Formular hier bildet das nur ab — die
// Durchsetzung liegt in der Auth-Einstellung "Allow new users to sign up",
// ohne die ein Aufruf von signUp() an der API vorbei weiterhin ginge.
function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    setHinweis(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
      if (error) throw error;
      navigate({ to: "/", replace: true });
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Der Link aus der Mail muss auf `/passwort` zeigen, nicht auf die Startseite:
   * dort steht das Formular, das die Wiederherstellungssitzung auch benutzt.
   * Die Adresse muss in Supabase unter „Redirect URLs" freigegeben sein, sonst
   * fällt der Link stillschweigend auf die Site URL zurück.
   *
   * Die Rückmeldung ist bewusst gleichlautend, ob es die Adresse gibt oder
   * nicht — sonst wird das Formular zum Verzeichnis, das verrät, wer ein Konto
   * hat.
   */
  async function zuruecksetzen() {
    if (!email) return setFehler("Bitte zuerst die E-Mail-Adresse eintragen.");
    setFehler(null);
    setBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/passwort`,
      });
    } finally {
      setBusy(false);
      setHinweis("Falls es zu dieser Adresse ein Konto gibt, ist eine E-Mail unterwegs.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[380px]">
        <Wortmarke />
        <h1 className="page-title mt-6">Anmelden</h1>
        <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-2">
          Ihre Klassen, Räume und Sitzpläne sind an Ihr Konto gebunden.
        </p>

        <form onSubmit={absenden} className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">E-Mail-Adresse</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-[6px] border border-line-control bg-elevated px-3 text-[14px] focus-visible:border-[color:var(--select)]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">Passwort</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              className="h-10 rounded-[6px] border border-line-control bg-elevated px-3 text-[14px] focus-visible:border-[color:var(--select)]"
            />
          </label>

          {fehler && (
            <p className="rounded-[6px] border border-[color:var(--danger-bg)] bg-danger-bg px-3 py-2 text-[13px] text-danger">
              {fehler}
            </p>
          )}
          {hinweis && (
            <p className="rounded-[6px] border border-[color:var(--info-bg)] bg-info-bg px-3 py-2 text-[13px] text-info">
              {hinweis}
            </p>
          )}

          <Button type="submit" disabled={busy} className="mt-1 w-full justify-center">
            {busy ? "Bitte warten …" : "Anmelden"}
          </Button>

          <button
            type="button"
            onClick={zuruecksetzen}
            disabled={busy}
            className="self-start text-[13px] text-ink-2 underline underline-offset-2 hover:text-ink disabled:opacity-60"
          >
            Passwort vergessen?
          </button>
        </form>

        <p className="mt-5 text-[12px] leading-[1.55] text-ink-3">
          Konten legt die betreibende Stelle an. Eine Registrierung ist hier nicht vorgesehen.
        </p>

        <p className="mt-3 text-[12px] leading-[1.55] text-ink-3">
          In dieser Anwendung werden personenbezogene Daten von Schülerinnen und Schülern
          verarbeitet. Für Rechtsgrundlage und Löschfristen ist die betreibende Stelle
          verantwortlich.
        </p>
      </div>
    </div>
  );
}
