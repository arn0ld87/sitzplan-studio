import { useEffect, useState } from "react";
import { X, ShieldAlert } from "lucide-react";

const KEY = "sitzplan.datenschutz.hinweis";

/** Einmaliger Hinweisstreifen unter dem Seitenkopf. */
export function DatenschutzHinweis() {
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    setSichtbar(localStorage.getItem(KEY) !== "gelesen");
  }, []);

  if (!sichtbar) return null;

  return (
    <div className="border-b border-line bg-info-bg">
      <div className="flex items-start gap-2.5 px-5 py-3 md:px-8">
        <ShieldAlert size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-info" />
        <p className="flex-1 text-[13px] leading-[1.55] text-ink-2">
          Hier werden personenbezogene Daten von Schülerinnen und Schülern verarbeitet. Für
          Rechtsgrundlage, Zweckbindung und Löschfristen ist die betreibende Stelle verantwortlich.
        </p>
        <button
          type="button"
          aria-label="Hinweis schließen"
          onClick={() => {
            localStorage.setItem(KEY, "gelesen");
            setSichtbar(false);
          }}
          className="-m-1 shrink-0 rounded-[4px] p-1 text-ink-3 transition-colors duration-[160ms] ease-out hover:text-ink"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
