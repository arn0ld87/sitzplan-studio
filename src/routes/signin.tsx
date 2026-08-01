import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui-kit/Button";
import { Wordmark } from "@/components/AppShell";
import { cn } from "@/lib/utils";

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

type Modus = "anmelden" | "registrieren";

function SignIn() {
  const navigate = useNavigate();
  const [modus, setModus] = useState<Modus>("anmelden");
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
      if (modus === "anmelden") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
        if (error) throw error;
        navigate({ to: "/", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: passwort,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/", replace: true });
        else setHinweis("Bestätigungslink verschickt. Bitte prüfen Sie Ihr Postfach.");
      }
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[380px]">
        <Wordmark />
        <h1 className="page-title mt-6">
          {modus === "anmelden" ? "Anmelden" : "Konto anlegen"}
        </h1>
        <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-2">
          Ihre Klassen, Räume und Sitzpläne sind an Ihr Konto gebunden.
        </p>

        <div
          role="tablist"
          aria-label="Anmelden oder registrieren"
          className="mt-6 inline-flex rounded-[6px] border border-line-control bg-sunken p-0.5"
        >
          {(["anmelden", "registrieren"] as Modus[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={modus === m}
              onClick={() => {
                setModus(m);
                setFehler(null);
                setHinweis(null);
              }}
              className={cn(
                "h-[30px] rounded-[4px] px-3 text-[13px] transition-colors duration-[160ms] ease-out",
                modus === m
                  ? "bg-elevated font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  : "text-ink-2 hover:text-ink",
              )}
            >
              {m === "anmelden" ? "Anmelden" : "Registrieren"}
            </button>
          ))}
        </div>

        <form onSubmit={absenden} className="mt-5 flex flex-col gap-3">
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
              minLength={8}
              autoComplete={modus === "anmelden" ? "current-password" : "new-password"}
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              className="h-10 rounded-[6px] border border-line-control bg-elevated px-3 text-[14px] focus-visible:border-[color:var(--select)]"
            />
            {modus === "registrieren" && (
              <span className="text-[12px] text-ink-3">Mindestens 8 Zeichen.</span>
            )}
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
            {busy ? "Bitte warten …" : modus === "anmelden" ? "Anmelden" : "Konto anlegen"}
          </Button>
        </form>

        <p className="mt-6 text-[12px] leading-[1.55] text-ink-3">
          In dieser Anwendung werden personenbezogene Daten von Schülerinnen und Schülern
          verarbeitet. Für Rechtsgrundlage und Löschfristen ist die betreibende Stelle
          verantwortlich.
        </p>
      </div>
    </div>
  );
}
