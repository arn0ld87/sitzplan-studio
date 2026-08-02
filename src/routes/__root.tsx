import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useNavigate,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Fehler 404</p>
        <h1 className="page-title mt-2">Seite nicht gefunden</h1>
        <p className="mt-2 text-[14px] text-ink-2">
          Diese Ansicht existiert nicht oder wurde verschoben.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex h-10 items-center justify-center rounded-[6px] bg-action px-3.5 text-[13px] font-medium text-white"
          >
            Zur Übersicht
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md">
        <p className="eyebrow">Ansicht nicht geladen</p>
        <h1 className="page-title mt-2">Die Daten konnten nicht geladen werden</h1>
        <p className="mt-2 text-[14px] text-ink-2">
          Bitte versuchen Sie es erneut. Gespeicherte Daten sind davon nicht betroffen.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-10 items-center rounded-[6px] bg-action px-3.5 text-[13px] font-medium text-white"
          >
            Erneut versuchen
          </button>
          <a
            href="/"
            className="inline-flex h-10 items-center rounded-[6px] border border-line-control bg-elevated px-3.5 text-[13px] font-medium"
          >
            Zur Übersicht
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sitzplan Studio — Klassen, Räume und Sitzpläne" },
      {
        name: "description",
        content:
          "Sitzplan Studio ist das Werkzeug für Lehrkräfte: Klassen verwalten, Räume zeichnen und Sitzpläne erstellen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,600&display=swap",
      },
      // Moderne Browser bevorzugen die scharfe SVG-Marke, ältere fallen
      // auf die .ico zurück.
      { rel: "icon", href: "/logo.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/logo.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Führt einen Wiederherstellungslink zum Passwortformular.
 *
 * Wird der Link im Supabase-Dashboard ausgelöst, zeigt er auf die Site URL —
 * also auf die Startseite, wo es nichts zu setzen gibt. Der Client legt aus dem
 * Fragment aber eine Sitzung an und meldet dabei `PASSWORD_RECOVERY`. Auf dieses
 * Ereignis hin gehört der Betreffende auf `/passwort`, sonst landet er
 * angemeldet in der Anwendung und das eigentliche Anliegen bleibt liegen.
 *
 * Der Listener sitzt in der Wurzel, weil das Ereignis auf jeder Seite eintreffen
 * kann — je nachdem, worauf der Link zeigt.
 */
function useWiederherstellung() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((ereignis) => {
      if (ereignis === "PASSWORD_RECOVERY") void navigate({ to: "/passwort", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useWiederherstellung();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
