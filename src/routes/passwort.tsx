import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wortmarke } from "@/components/Marke";
import { PasswortFormular } from "@/components/PasswortFormular";

export const Route = createFileRoute("/passwort")({
  ssr: false,
  component: PasswortSetzen,
  head: () => ({
    meta: [
      { title: "Passwort setzen — Sitzplan" },
      { name: "description", content: "Ein neues Passwort für Ihr Konto festlegen." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/**
 * Ziel eines Wiederherstellungslinks.
 *
 * Supabase hängt das Zugriffstoken als Fragment an die URL; der Client liest es
 * beim Laden aus und legt daraus eine Sitzung an. Diese Sitzung ist eine
 * vollwertige Anmeldung — nur deshalb darf `updateUser` hier ohne das alte
 * Passwort ändern.
 *
 * Weil das Fragment erst im Browser ausgewertet wird, kennt die Seite den
 * Zustand nicht sofort: Es gibt ein kurzes Fenster ohne Sitzung, das noch kein
 * Fehler ist. Darum drei Zustände statt zwei — `pruefe` verhindert, dass eine
 * gültige Wiederherstellung als abgelaufener Link angezeigt wird.
 */
type Lage = "pruefe" | "bereit" | "ohne-sitzung";

function PasswortSetzen() {
  const navigate = useNavigate();
  const [lage, setLage] = useState<Lage>("pruefe");

  useEffect(() => {
    let aktiv = true;

    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (aktiv && session) setLage("bereit");
    });

    void supabase.auth.getSession().then(({ data: s }) => {
      if (!aktiv) return;
      setLage(s.session ? "bereit" : "ohne-sitzung");
    });

    return () => {
      aktiv = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[380px]">
        <Wortmarke />
        <h1 className="page-title mt-6">Neues Passwort</h1>

        {lage === "pruefe" && (
          <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-2">Einen Moment …</p>
        )}

        {lage === "bereit" && (
          <>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-2">
              Legen Sie ein neues Passwort fest. Danach sind Sie angemeldet.
            </p>
            <PasswortFormular
              submitLabel="Passwort speichern"
              onErfolg={() => navigate({ to: "/", replace: true })}
            />
          </>
        )}

        {lage === "ohne-sitzung" && (
          <>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-2">
              Dieser Link ist abgelaufen oder wurde bereits benutzt. Fordern Sie auf der
              Anmeldeseite einen neuen an.
            </p>
            <Link
              to="/signin"
              className="mt-4 inline-block text-[13px] underline underline-offset-2"
            >
              Zur Anmeldung
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
