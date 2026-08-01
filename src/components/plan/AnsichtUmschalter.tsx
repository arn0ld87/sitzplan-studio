// Umschalter zwischen dem 2D-Grundriss und der räumlichen Ansicht.
//
// Gebaut wie die Drehungs-Segmentleiste im Raumeditor. Der aktive Zustand ist
// zusätzlich zur Farbe an einem Haken und an `aria-pressed` erkennbar.

import { Check } from "lucide-react";

export type Ansicht = "2d" | "3d";

const SEGMENTE: { wert: Ansicht; label: string; beschreibung: string }[] = [
  { wert: "2d", label: "2D", beschreibung: "Grundriss bearbeiten" },
  { wert: "3d", label: "3D", beschreibung: "Raum räumlich ansehen" },
];

/** Segmentleiste zum Umschalten zwischen 2D-Grundriss und 3D-Ansicht des Raums. */
export function AnsichtUmschalter({
  wert,
  onChange,
}: {
  wert: Ansicht;
  onChange: (wert: Ansicht) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Darstellung des Raums"
      className="flex overflow-hidden rounded-[6px] border border-line-control"
    >
      {SEGMENTE.map((segment) => {
        const aktiv = wert === segment.wert;
        return (
          <button
            key={segment.wert}
            type="button"
            aria-pressed={aktiv}
            title={segment.beschreibung}
            onClick={() => onChange(segment.wert)}
            className={`num flex items-center gap-1 border-r border-line-control px-2.5 py-1.5 text-[12px] leading-none transition-colors duration-[160ms] ease-out last:border-r-0 ${
              aktiv
                ? "bg-action-soft font-medium text-action-soft-ink"
                : "bg-elevated text-ink-2 hover:bg-sunken hover:text-ink"
            }`}
          >
            {aktiv && <Check size={13} strokeWidth={2} aria-hidden />}
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
