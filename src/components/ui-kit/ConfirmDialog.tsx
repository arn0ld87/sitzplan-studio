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
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(38,33,28,0.32)] p-4"
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        aria-describedby="cd-desc"
        className="w-full max-w-[440px] rounded-[10px] border border-line bg-elevated p-5 shadow-[var(--shadow-overlay)]"
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
