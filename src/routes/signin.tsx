import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";
import { Wordmark } from "@/components/AppShell";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Anmelden — Sitzplan" },
      {
        name: "description",
        content: "Melden Sie sich bei Sitzplan an oder legen Sie ein Konto für die Demo an.",
      },
      { property: "og:title", content: "Anmelden — Sitzplan" },
      { property: "og:description", content: "Zugang zum Lehrerwerkzeug Sitzplan." },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const [modus, setModus] = useState<"anmelden" | "registrieren">("anmelden");
  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="flex justify-center">
          <Wordmark />
        </div>

        <div className="mt-6 rounded-[10px] border border-line bg-panel p-5 shadow-[var(--shadow-panel)]">
          <h1 className="sr-only">Bei Sitzplan anmelden</h1>
          <div
            role="tablist"
            aria-label="Zugang"
            className="grid grid-cols-2 gap-1 rounded-[6px] border border-line bg-sunken p-1"
          >
            {(["anmelden", "registrieren"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={modus === m}
                onClick={() => setModus(m)}
                className={`h-8 rounded-[3px] text-[13px] capitalize transition-colors ${
                  modus === m
                    ? "bg-elevated font-semibold text-ink shadow-[var(--shadow-panel)]"
                    : "text-ink-2"
                }`}
              >
                {m === "anmelden" ? "Anmelden" : "Registrieren"}
              </button>
            ))}
          </div>

          {fehler && (
            <div
              role="alert"
              className="mt-4 flex gap-2 rounded-[6px] border border-[color:var(--danger)] bg-danger-bg px-3 py-2 text-[13px] text-danger"
            >
              <CircleAlert size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <span>{fehler}</span>
            </div>
          )}

          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setFehler(
                !mail || !pass
                  ? "Bitte füllen Sie beide Pflichtfelder aus, um fortzufahren."
                  : null,
              );
            }}
          >
            <div>
              <label htmlFor="mail" className="block text-[13px] font-medium">
                Dienstliche E-Mail <span className="text-ink-3">· Pflichtfeld</span>
              </label>
              <input
                id="mail"
                type="email"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                className="mt-1.5 h-10 w-full max-w-[320px] rounded-[6px] border border-line-control bg-elevated px-3 text-[14px]"
              />
              <p className="mt-1 text-[12px] text-ink-3">Zum Beispiel r.haldern@schule-nord.de</p>
            </div>
            <div>
              <label htmlFor="pass" className="block text-[13px] font-medium">
                Kennwort <span className="text-ink-3">· Pflichtfeld</span>
              </label>
              <input
                id="pass"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="mt-1.5 h-10 w-full max-w-[240px] rounded-[6px] border border-line-control bg-elevated px-3 text-[14px]"
              />
              <p className="mt-1 text-[12px] text-ink-3">Mindestens zehn Zeichen.</p>
            </div>
            <Button variant="primary" className="w-full" type="submit">
              {modus === "anmelden" ? "Anmelden" : "Konto anlegen"}
            </Button>
          </form>
        </div>

        <p className="prose-measure mx-auto mt-4 text-center text-[13px] text-ink-2">
          Diese Oberfläche läuft mit Fantasiedaten. Es werden keine echten Konten angelegt und keine
          Eingaben übertragen.{" "}
          <Link to="/" className="text-action-soft-ink underline underline-offset-2">
            Zur Übersicht
          </Link>
        </p>
      </div>
    </main>
  );
}
