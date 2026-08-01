import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  LayoutGrid,
  Users,
  DoorOpen,
  Grid2x2,
  Trash2,
  Settings,
  LogOut,
  UserRound,
  ChevronsUpDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { DatenschutzHinweis } from "@/components/DatenschutzHinweis";
// Die Marke lebt in einer eigenen Datei, damit die Anmeldeseite sie nicht
// über die AppShell beziehen muss.
import { Wortmarke } from "@/components/Marke";
import { useStore } from "@/store/app";

type NavItem = { to: string; label: string; icon: LucideIcon; count?: number };


function useActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[38px] items-center gap-2.5 rounded-[6px] px-2.5 text-[13px] transition-colors duration-[160ms] ease-out",
        active
          ? "bg-action-soft font-semibold text-action-soft-ink shadow-[inset_3px_0_0_var(--action)]"
          : "text-ink-2 hover:bg-sunken hover:text-ink",
      )}
    >
      <Icon size={16} strokeWidth={1.5} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.count !== undefined && item.count > 0 && (
        <span className="num text-ink-3">{String(item.count).padStart(2, "0")}</span>
      )}
    </Link>
  );
}

function LadeSkelett() {
  return (
    <div className="px-5 py-6 md:px-8" aria-busy="true" aria-label="Daten werden geladen">
      <div className="h-3 w-24 animate-pulse rounded-[4px] bg-sunken" />
      <div className="mt-3 h-7 w-64 animate-pulse rounded-[6px] bg-sunken" />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-[8px] border border-line bg-sunken" />
        ))}
      </div>
    </div>
  );
}

/** Nutzerblock mit Menü: Konto öffnen oder abmelden. */
function NutzerBlock({
  email,
  abmeldend,
  onAbmelden,
}: {
  email: string;
  abmeldend: boolean;
  onAbmelden: () => void;
}) {
  const [offen, setOffen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!offen) return;
    function ausserhalb(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOffen(false);
    }
    function taste(e: KeyboardEvent) {
      if (e.key === "Escape") setOffen(false);
    }
    document.addEventListener("mousedown", ausserhalb);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("mousedown", ausserhalb);
      document.removeEventListener("keydown", taste);
    };
  }, [offen]);

  return (
    <div ref={box} className="relative border-t border-line px-2.5 py-2.5">
      {offen && (
        <div
          role="menu"
          aria-label="Konto"
          className="absolute bottom-[calc(100%-4px)] left-2.5 right-2.5 z-50 overflow-hidden rounded-[8px] border border-line bg-elevated py-1 shadow-[var(--shadow-overlay)]"
        >
          <Link
            to="/einstellungen"
            role="menuitem"
            onClick={() => setOffen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink-2 transition-colors duration-[160ms] ease-out hover:bg-sunken hover:text-ink"
          >
            <UserRound size={14} strokeWidth={1.5} />
            Konto und Einstellungen
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onAbmelden}
            disabled={abmeldend}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink-2 transition-colors duration-[160ms] ease-out hover:bg-sunken hover:text-ink disabled:opacity-60"
          >
            <LogOut size={14} strokeWidth={1.5} />
            {abmeldend ? "Wird abgemeldet …" : "Abmelden"}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={offen}
        title={email}
        className="flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left transition-colors duration-[160ms] ease-out hover:bg-sunken"
      >
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-action-soft text-[12px] font-semibold uppercase text-action-soft-ink"
        >
          {email.slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium">{email}</span>
          <span className="block text-[11px] text-ink-3">Konto</span>
        </span>
        <ChevronsUpDown size={14} strokeWidth={1.5} className="shrink-0 text-ink-3" />
      </button>
    </div>
  );
}

export function AppShell({ children, email }: { children: React.ReactNode; email: string }) {
  const isActive = useActive();
  const { data, hydrated } = useStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [abmeldend, setAbmeldend] = useState(false);

  async function abmelden() {
    setAbmeldend(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/signin", replace: true });
  }

  const MAIN: NavItem[] = [
    { to: "/", label: "Übersicht", icon: LayoutGrid },
    { to: "/klassen", label: "Klassen", icon: Users, count: data.classes.length },
    { to: "/raeume", label: "Räume", icon: DoorOpen, count: data.rooms.length },
    { to: "/sitzplaene", label: "Sitzpläne", icon: Grid2x2, count: data.plans.length },
  ];
  const SECONDARY: NavItem[] = [
    { to: "/papierkorb", label: "Papierkorb", icon: Trash2, count: data.trash.length },
    { to: "/einstellungen", label: "Einstellungen", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-[6px] focus:bg-elevated focus:px-3 focus:py-2"
      >
        Zum Inhalt springen
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-[236px] flex-col border-r border-line bg-panel md:flex">
        <div className="flex h-[56px] items-center px-4">
          <Wortmarke />
        </div>
        <nav aria-label="Hauptbereiche" className="flex flex-1 flex-col gap-0.5 px-2.5 pt-2">
          {MAIN.map((i) => (
            <NavRow key={i.to} item={i} active={isActive(i.to)} />
          ))}
          <hr className="my-2.5 border-t border-line" />
          {SECONDARY.map((i) => (
            <NavRow key={i.to} item={i} active={isActive(i.to)} />
          ))}
        </nav>
        <NutzerBlock email={email} abmeldend={abmeldend} onAbmelden={abmelden} />
      </aside>


      <div className="md:pl-[236px]">
        <main id="inhalt" className="pb-[52px] md:pb-0">
          <DatenschutzHinweis />
          {hydrated ? children : <LadeSkelett />}
        </main>
      </div>

      <nav
        aria-label="Hauptbereiche"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[52px] border-t border-line bg-panel md:hidden"
      >
        {MAIN.map((i) => {
          const Icon = i.icon;
          const active = isActive(i.to);
          return (
            <Link
              key={i.to}
              to={i.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
                active ? "font-semibold text-action-soft-ink" : "text-ink-2",
              )}
            >
              <Icon size={16} strokeWidth={1.5} />
              {i.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
