import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Suchfeld mit Entprellung: die Eingabe erscheint sofort, die Filterung folgt
 * nach kurzer Pause. Das Kreuz setzt die Suche zurück.
 */
export function SearchField({
  label = "Suchen",
  value,
  onChange,
  width = 200,
  delay = 200,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  width?: number;
  delay?: number;
}) {
  const [roh, setRoh] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const letzter = useRef(value);

  // Zurücksetzen von außen (z. B. „Suche zurücksetzen“) übernehmen
  useEffect(() => {
    if (value !== letzter.current) {
      letzter.current = value;
      setRoh(value);
    }
  }, [value]);

  useEffect(() => {
    if (roh === letzter.current) return;
    const t = setTimeout(() => {
      letzter.current = roh;
      onChange(roh);
    }, delay);
    return () => clearTimeout(t);
  }, [roh, delay, onChange]);

  return (
    <div className="relative" style={{ width }}>
      <Search
        size={16}
        strokeWidth={1.5}
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
      />
      <input
        ref={inputRef}
        type="text"
        aria-label={label}
        placeholder={label}
        value={roh}
        onChange={(e) => setRoh(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && roh) {
            e.preventDefault();
            setRoh("");
          }
        }}
        className="h-10 w-full rounded-[6px] border border-line-control bg-elevated pl-8 pr-8 text-[13px] placeholder:text-ink-3"
      />
      {roh && (
        <button
          type="button"
          aria-label="Suche zurücksetzen"
          onClick={() => {
            setRoh("");
            letzter.current = "";
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[5px] text-ink-3 transition-colors duration-[160ms] ease-out hover:bg-sunken hover:text-ink"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
