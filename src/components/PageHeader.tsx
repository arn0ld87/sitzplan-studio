import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  crumbs,
  title,
  subtitle,
  actions,
}: {
  crumbs?: { label: string; to?: string }[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-line bg-panel px-5 py-5 md:px-8">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Brotkrumen" className="mb-2 flex items-center gap-1 text-[12px]">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={16} strokeWidth={1.5} className="text-ink-3" />}
              {c.to ? (
                <Link to={c.to} className="text-ink-2 underline-offset-2 hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className="text-ink-3">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      {/* Unter `sm` stehen Aktionen unter dem Titel statt daneben. Nebeneinander
          drückten Suchfeld und Primäraktion die Titelspalte auf Wortbreite
          zusammen und machten die Seite waagerecht scrollbar. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="page-title truncate">{title}</h1>
          {subtitle && <p className="prose-measure mt-1 text-[14px] text-ink-2">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>
        )}
      </div>
    </header>
  );
}
