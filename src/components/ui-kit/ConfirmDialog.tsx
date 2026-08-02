import { useEffect, useRef } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  title,
  description,
  consequence,
  confirmLabel = "Löschen",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  consequence: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  // Wie in `Modal.tsx`: `onCancel` ist bei jedem Aufrufer eine Inline-Funktion.
  // In den Abhängigkeiten unten würde sie den Effekt nach jedem Rendern neu
  // ausführen und den Fokus zurück auf die erste Schaltfläche setzen. Hier fällt
  // das mangels Eingabefeldern kaum auf — falsch ist es trotzdem, und ein
  // späteres Feld im Dialog machte daraus denselben Fehler.
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    ref.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancelRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>("button, [href], input");
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
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(38,33,28,0.32)] p-4"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        aria-describedby="cd-desc"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[440px] overflow-y-auto overscroll-contain rounded-[10px] border border-line bg-elevated p-5 shadow-[var(--shadow-overlay)]"
      >
        <div className="flex gap-3">
          <span
            aria-hidden
            className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-danger-bg text-danger"
          >
            <TriangleAlert size={16} strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <h2 id="cd-title" className="font-serif text-[20px] font-semibold leading-7">
              {title}
            </h2>
            <p id="cd-desc" className="prose-measure mt-1.5 text-[14px] text-ink-2">
              {description}
            </p>
            <p className="mt-2 rounded-[6px] border border-line bg-sunken px-3 py-2 text-[13px] text-ink-2">
              {consequence}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button ref={ref} variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
