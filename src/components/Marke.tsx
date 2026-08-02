import { cn } from "@/lib/utils";

/**
 * Bildmarke: ein Raumgrundriss in S-Form mit drei Tischpaaren.
 *
 * Die Geometrie ist identisch mit `public/logo-bildmarke.svg` aus dem
 * Logo-Paket — die Marke wird hier nur inline geführt, damit sie die Farbe aus
 * dem Designsystem zieht und ein Themenwechsel sie mitnimmt. Wer die Datei
 * ändert, ändert diese Pfade mit, sonst laufen Favicon und Oberfläche
 * auseinander.
 */
export function Bildmarke({ size = 28, className }: { size?: number; className?: string }) {
  const farbe = "var(--action, #a8501f)";
  // Drei Tischpaare: y ist die Oberkante des Tischs, der Stuhl sitzt 9 darüber.
  const reihen = [52, 104, 196];
  const spalten = [72, 126];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      role="img"
      aria-label="Sitzplan Studio"
      className={cn("shrink-0", className)}
    >
      <g fill="none" stroke={farbe} strokeWidth="16" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M216 20H40v92l40 40h96" />
        <path d="M40 188v48h176v-96" />
      </g>
      <g fill={farbe}>
        {reihen.map((y) =>
          spalten.map((x) => (
            <g key={`${x}-${y}`}>
              <rect x={x} y={y} width="30" height="24" rx="2" />
              <rect x={x + 6} y={y - 9} width="18" height="5" rx="1" />
            </g>
          )),
        )}
      </g>
    </svg>
  );
}

/**
 * Bildmarke mit Namenszug. `compact` blendet den Namen aus — für die
 * eingeklappte Seitenleiste, in der nur das Zeichen Platz hat.
 *
 * Der Namenszug steht in der Serifenschrift des Designsystems und setzt
 * „Studio" wie im Logo etwas kleiner, statt es farblich abzusetzen.
 */
export function Wortmarke({
  compact,
  className,
  size = 28,
}: {
  compact?: boolean;
  className?: string;
  size?: number;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Bildmarke size={size} />
      {!compact && (
        <span className="font-serif font-semibold leading-none tracking-[-0.02em] text-ink">
          <span style={{ fontSize: Math.round(size * 0.61) }}>Sitzplan </span>
          <span style={{ fontSize: Math.round(size * 0.5) }}>Studio</span>
        </span>
      )}
    </span>
  );
}

/**
 * Urhebernachweis. Steht in der Seitenleiste, auf der Anmeldeseite, in den
 * Einstellungen und auf dem Ausdruck — überall dort, wo jemand wissen will,
 * woher diese Anwendung kommt.
 */
export function Urheber({
  className,
  variant = "kurz",
}: {
  className?: string;
  variant?: "kurz" | "lang";
}) {
  return (
    <p className={cn("text-[11px] leading-[1.5] text-ink-3", className)}>
      {variant === "lang" ? "Entwickelt von " : "Von "}
      <a
        href="https://alexle135.de"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-ink-2 underline underline-offset-2 transition-colors duration-[160ms] ease-out hover:text-ink"
      >
        Alexander Schneider
      </a>
      {variant === "lang" ? (
        <>
          {" — "}
          <a
            href="https://alexle135.de"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors duration-[160ms] ease-out hover:text-ink"
          >
            alexle135.de
          </a>
        </>
      ) : null}
    </p>
  );
}
