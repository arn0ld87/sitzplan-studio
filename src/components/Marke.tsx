import { cn } from "@/lib/utils";

/**
 * Bildmarke: ein Sitzplatz-Raster mit einem belegten Platz in der Mitte.
 *
 * Die Marke zeigt, was die Anwendung tut — sie ist kein Buchstabe, der
 * beliebig austauschbar wäre. Die Farben kommen aus dem Designsystem,
 * damit ein Themenwechsel die Marke mitnimmt.
 */
export function Bildmarke({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Sitzplan Studio"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="7" fill="var(--action, #a8501f)" />
      <g fill="var(--canvas, #f1ebe0)">
        {[6, 13.5, 21].map((y) =>
          [6, 13.5, 21].map((x) => {
            const belegt = x === 13.5 && y === 13.5;
            return (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width="5"
                height="5"
                rx="1.5"
                opacity={belegt ? 1 : 0.5}
              />
            );
          }),
        )}
      </g>
    </svg>
  );
}

/**
 * Bildmarke mit Namenszug. `compact` blendet den Namen aus — für die
 * eingeklappte Seitenleiste, in der nur das Zeichen Platz hat.
 */
export function Wortmarke({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Bildmarke />
      {!compact && (
        <span className="text-[15px] font-semibold leading-none tracking-[-0.01em]">
          Sitzplan <span className="text-ink-2">Studio</span>
        </span>
      )}
    </span>
  );
}
