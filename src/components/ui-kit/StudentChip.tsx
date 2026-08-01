import { cn } from "@/lib/utils";
import { initials, studentColor } from "@/data/demo";

export function StudentChip({
  name,
  colorIndex,
  selected,
  size = 34,
  onClick,
  draggable,
  onDragStart,
}: {
  name: string;
  colorIndex: number;
  selected?: boolean;
  size?: 34 | 40;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const dot = size === 40 ? 26 : 22;
  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      aria-pressed={selected}
      style={{ height: size }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-elevated pl-1 pr-3 text-[13px] transition-[border-color,box-shadow] duration-[180ms] ease-out",
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
    </button>
  );
}
