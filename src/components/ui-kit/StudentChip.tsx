import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, merkmalLabel, studentColor } from "@/data/types";

export function StudentChip({
  name,
  colorIndex,
  selected,
  size = 34,
  onClick,
  draggable,
  onDragStart,
  onPointerDown,
  title,
  merkmale,
  notiz,
}: {
  name: string;
  colorIndex: number;
  selected?: boolean;
  size?: 34 | 40;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  title?: string;
  /**
   * Merkmale des Schülers. **Pflicht, obwohl oft leer**: als optionale Prop
   * wurde sie an der einzigen Aufrufstelle schlicht vergessen, und die
   * Hinweismarke erschien nirgends. Wer einen Chip zeichnet, hat den Schüler.
   */
  merkmale: string[];
  /** Wie {@link merkmale} — eine gefüllte Notiz zählt als Hinweis. */
  notiz: string;
}) {
  const dot = size === 40 ? 26 : 22;
  // Der Chip steht auch auf einem Sitzplatz und darf dort nicht wachsen. Statt
  // der Merkmale selbst trägt er nur eine Marke; die Klartexte stehen im
  // Tooltip und ausgeschrieben in der Schülerliste.
  const hinweise = [...merkmale.map(merkmalLabel), ...(notiz.trim() ? [notiz.trim()] : [])];
  const beschriftung = title ?? (hinweise.length ? `${name} — ${hinweise.join(" · ")}` : name);
  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onPointerDown={onPointerDown}
      aria-pressed={selected}
      title={beschriftung}
      aria-label={beschriftung}
      style={{ height: size }}
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border bg-elevated pl-1 pr-3 text-[13px] transition-[border-color,box-shadow] duration-[180ms] ease-out",
        selected
          ? "border-[color:var(--select)] shadow-[0_0_0_3px_var(--select-soft)]"
          : "border-line-control hover:border-[color:var(--line-plan)]",
      )}
    >
      <span
        aria-hidden
        style={{ width: dot, height: dot, background: studentColor(colorIndex), color: "#15110D" }}
        className="grid shrink-0 place-items-center rounded-full text-[11px] font-semibold"
      >
        {initials(name)}
      </span>
      <span className="truncate">{name}</span>
      {hinweise.length > 0 && (
        <Info size={12} strokeWidth={1.75} color="#6A6157" className="shrink-0" aria-hidden />
      )}
    </button>
  );
}
