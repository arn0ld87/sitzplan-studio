import { merkmalLabel } from "@/data/types";

/**
 * Ein Merkmal eines Schülers als kleine Auszeichnung.
 *
 * Neutral gehalten — dieselbe Farbpaarung wie „Archiviert" im `StatusChip`.
 * Merkmale sind Information, kein Status, keine Warnung und keine Auswahl;
 * sie dürfen den Blick nicht von der Sitzverteilung wegziehen.
 *
 * Unbekannte Schlüssel erscheinen wörtlich, damit frei eingegebene Merkmale
 * nicht stillschweigend verschwinden.
 */
export function MerkmalBadge({ merkmal, className }: { merkmal: string; className?: string }) {
  return (
    <span
      style={{
        height: 20,
        borderRadius: 4,
        padding: "0 7px",
        color: "#6A6157",
        background: "#F3EDE3",
      }}
      className={`inline-flex max-w-full items-center truncate text-[11px] leading-none ${className ?? ""}`}
    >
      {merkmalLabel(merkmal)}
    </span>
  );
}

/**
 * Alle Merkmale eines Schülers nebeneinander. Rendert nichts, wenn es keine
 * gibt — damit in Listen kein leerer Streifen Platz frisst.
 */
export function MerkmalBadges({ merkmale, className }: { merkmale: string[]; className?: string }) {
  if (merkmale.length === 0) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className ?? ""}`}>
      {merkmale.map((m) => (
        <MerkmalBadge key={m} merkmal={m} />
      ))}
    </span>
  );
}
