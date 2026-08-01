import { useId, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { MERKMALE, merkmalLabel } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * Auswahl der Merkmale eines Schülers.
 *
 * Der Katalog aus {@link MERKMALE} ist eine Vorschlagsliste, keine Schranke:
 * Was fehlt, wird unten frei eingetippt und landet im selben Feld. Bereits
 * anderswo vergebene freie Werte erscheinen als Vorschlag, damit aus „ADHS"
 * nicht mit der Zeit „ADS", „adhs" und „AD(H)S" werden.
 *
 * Zwei Vorgaben aus `AGENTS.md` prägen die Gestalt: Der gewählte Zustand trägt
 * ein Häkchen und nicht nur eine andere Farbe, und jede Klickfläche misst
 * mindestens 40 px — auch die zum Entfernen, die sonst als Icon-Größe
 * durchgerutscht wäre.
 *
 * Gehört in einen `FieldGroup`, **nicht** in ein `Field`: Dessen `<label>`
 * würde einen Klick auf die Feldüberschrift an den ersten Umschalter
 * weiterreichen und damit ungefragt ein Merkmal setzen.
 */
export function MerkmalWahl({
  werte,
  onChange,
  vorschlaege = [],
}: {
  werte: string[];
  onChange: (werte: string[]) => void;
  /** Freie Merkmale, die der Nutzer schon einmal vergeben hat. */
  vorschlaege?: string[];
}) {
  const [eingabe, setEingabe] = useState("");
  const listeId = useId();

  const katalog = MERKMALE.map((m) => m.id) as readonly string[];
  const frei = werte.filter((w) => !katalog.includes(w));

  function umschalten(id: string) {
    onChange(werte.includes(id) ? werte.filter((w) => w !== id) : [...werte, id]);
  }

  function hinzufuegen() {
    const neu = eingabe.trim();
    if (!neu || werte.includes(neu)) return setEingabe("");
    onChange([...werte, neu]);
    setEingabe("");
  }

  // Doppelte fliegen raus, Bereits-Gewähltes auch — sonst schlägt das Feld vor,
  // was schon dasteht.
  const offeneVorschlaege = [...new Set(vorschlaege)].filter(
    (v) => !werte.includes(v) && !katalog.includes(v),
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        {MERKMALE.map((m) => {
          const an = werte.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={an}
              onClick={() => umschalten(m.id)}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-[6px] border px-3 text-[12px] transition-[border-color,box-shadow] duration-[180ms] ease-out",
                an
                  ? "border-[color:var(--select)] bg-[color:var(--select-soft)] text-[color:var(--select)]"
                  : "border-line-control bg-elevated hover:border-[color:var(--line-plan)]",
              )}
            >
              {/* Formmerkmal neben der Farbe: Der Haken belegt auch im
                  ungewählten Zustand Platz, damit die Beschriftung beim
                  Umschalten nicht springt. */}
              <span aria-hidden className="grid w-[14px] shrink-0 place-items-center">
                {an && <Check size={14} strokeWidth={2} />}
              </span>
              {m.label}
            </button>
          );
        })}
      </div>

      {frei.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {frei.map((w) => (
            <li key={w}>
              <span
                style={{ background: "#F3EDE3", color: "#6A6157" }}
                className="inline-flex h-10 items-center gap-1 rounded-[6px] py-0 pl-3 pr-1 text-[12px]"
              >
                {merkmalLabel(w)}
                <button
                  type="button"
                  aria-label={`${w} entfernen`}
                  onClick={() => onChange(werte.filter((x) => x !== w))}
                  className="grid h-9 w-9 place-items-center rounded-[6px] hover:bg-sunken"
                >
                  <X size={14} strokeWidth={1.75} aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          className="h-10 min-w-0 flex-1 rounded-[6px] border border-line-control bg-elevated px-3 text-[13px]"
          placeholder="Eigenes Merkmal …"
          aria-label="Eigenes Merkmal hinzufügen"
          list={offeneVorschlaege.length ? listeId : undefined}
          value={eingabe}
          maxLength={40}
          onChange={(e) => setEingabe(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            // Sonst schickt Enter das umgebende Formular ab und legt den
            // Schüler an, während der Nutzer noch ein Merkmal tippt.
            e.preventDefault();
            hinzufuegen();
          }}
        />
        {offeneVorschlaege.length > 0 && (
          <datalist id={listeId}>
            {offeneVorschlaege.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        )}
        <button
          type="button"
          onClick={hinzufuegen}
          disabled={!eingabe.trim()}
          aria-label="Merkmal hinzufügen"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[6px] border border-line-control bg-elevated hover:border-[color:var(--line-plan)] disabled:opacity-40"
        >
          <Plus size={16} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
