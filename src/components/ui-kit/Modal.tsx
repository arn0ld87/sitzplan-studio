import { useEffect, useId, useRef } from "react";
import { Button } from "./Button";

/** Modaler Dialog mit Formular: Escape schließt, Fokus wird gefangen und zurückgegeben. */
export function Modal({
  open,
  title,
  description,
  submitLabel = "Speichern",
  onSubmit,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  submitLabel?: string;
  onSubmit: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // `onClose` ist bei allen Aufrufern eine Inline-Funktion und damit bei jedem
  // Rendern eine neue Identität. Stünde sie in den Abhängigkeiten des
  // Fokus-Effekts, liefe dieser nach jedem Tastendruck erneut und setzte den
  // Fokus zurück auf das erste Feld — man käme über einen Buchstaben je Feld
  // nicht hinaus. Deshalb liegt sie in einer Ref, die kein Rendern auslöst.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Erster Effekt: Fokus. Hängt ausschließlich am Öffnen und Schließen.
  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    }, 0);
    return () => {
      clearTimeout(t);
      returnTo.current?.focus?.();
    };
  }, [open]);

  // Zweiter Effekt: Tastatur. Getrennt, weil er anders als der Fokus-Effekt
  // gefahrlos wiederholt angehängt werden darf.
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
        "button, input, select, textarea, [href]",
      );
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(38,33,28,0.32)] p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] rounded-[10px] border border-line bg-elevated p-5 shadow-[var(--shadow-overlay)]"
      >
        <h2 id={titleId} className="font-serif text-[20px] font-semibold leading-7">
          {title}
        </h2>
        {description && (
          <p className="prose-measure mt-1.5 text-[14px] text-ink-2">{description}</p>
        )}
        <form
          className="mt-4 space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {children}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" variant="primary">
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium">{label}</span>
      {hint && <span className="mt-0.5 block text-[12px] text-ink-3">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
      {error && <span className="mt-1 block text-[12px] text-danger">{error}</span>}
    </label>
  );
}

/**
 * Wie {@link Field}, aber **ohne** umschließendes `<label>`.
 *
 * Ein `<label>` aktiviert beim Klick auf seine Beschriftung das erste
 * labelable Element darin — und dazu zählen auch `<button>`. Für ein Feld mit
 * mehreren Bedienelementen (Umschalter, Eingabe, Knopf) hieße das: ein Klick
 * auf die Feldüberschrift schaltet stillschweigend den ersten Umschalter um.
 *
 * Deshalb hier eine Gruppe mit `aria-labelledby`: gleiche Optik, gleiche
 * Vorlesereihenfolge, aber ohne die Klickübertragung.
 */
export function FieldGroup({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={`${id}-label`} className="block">
      <span id={`${id}-label`} className="block text-[13px] font-medium">
        {label}
      </span>
      {hint && <span className="mt-0.5 block text-[12px] text-ink-3">{hint}</span>}
      <div className="mt-1.5 block">{children}</div>
      {error && <span className="mt-1 block text-[12px] text-danger">{error}</span>}
    </div>
  );
}

export const inputClass =
  "h-10 w-full rounded-[6px] border border-line-control bg-elevated px-3 text-[13px] placeholder:text-ink-3";
