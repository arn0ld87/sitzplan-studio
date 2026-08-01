import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

export type SortRichtung = "auf" | "ab";

/** Spaltenkopf, der wirklich sortiert. */
export function SortHeader<T extends string>({
  spalte,
  label,
  aktiv,
  richtung,
  onSort,
  className,
}: {
  spalte: T;
  label: string;
  aktiv: T;
  richtung: SortRichtung;
  onSort: (spalte: T) => void;
  className?: string;
}) {
  const ist = aktiv === spalte;
  const Icon = !ist ? ChevronsUpDown : richtung === "auf" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(spalte)}
      aria-sort={ist ? (richtung === "auf" ? "ascending" : "descending") : "none"}
      className={`inline-flex items-center gap-1 text-[12px] uppercase tracking-[0.06em] transition-colors duration-[160ms] ease-out ${
        ist ? "text-ink" : "text-ink-3 hover:text-ink"
      } ${className ?? ""}`}
    >
      {label}
      <Icon size={12} strokeWidth={1.5} aria-hidden />
    </button>
  );
}
