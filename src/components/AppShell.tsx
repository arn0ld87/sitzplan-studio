import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  LayoutGrid,
  Users,
  DoorOpen,
  Grid2x2,
  Trash2,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { DatenschutzHinweis } from "@/components/DatenschutzHinweis";
import { useStore } from "@/store/app";

type NavItem = { to: string; label: string; icon: LucideIcon; count?: number };

export function Wordmark({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-action font-serif text-[16px] font-semibold text-white"
      >
        S
      </span>
      {!compact && <span className="text-[15px] font-semibold tracking-[-0.01em]">Sitzplan</span>}
    </span>
  );
}

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

export function AppShell({ children, email }: { children: React.ReactNode; email: string }) {
  const isActive = useActive();
  const { data } = useStore();
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
          <Wordmark />
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
        <div className="border-t border-line px-3.5 py-3">
          <p className="truncate text-[12px] font-medium" title={email}>
            {email}
          </p>
          <button
            type="button"
            onClick={abmelden}
            disabled={abmeldend}
            className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-ink-2 transition-colors duration-[160ms] ease-out hover:text-ink disabled:opacity-60"
          >
            <LogOut size={12} strokeWidth={1.5} />
            {abmeldend ? "Wird abgemeldet …" : "Abmelden"}
          </button>
        </div>
      </aside>


      <div className="md:pl-[236px]">
        <main id="inhalt" className="pb-[52px] md:pb-0">
          <DatenschutzHinweis />
          {children}
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
