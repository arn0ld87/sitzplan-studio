import {
  Check,
  Clock,
  Loader2,
  CloudOff,
  TriangleAlert,
  CircleX,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveState =
  "gespeichert" | "aenderungen" | "speichert" | "offline" | "konflikt" | "ungespeichert";

const MAP: Record<SaveState, { text: string; icon: LucideIcon; cls: string; spin?: boolean }> = {
  gespeichert: {
    text: "Gespeichert",
    icon: Check,
    cls: "text-success bg-success-bg border-[color:var(--success-bg)]",
  },
  aenderungen: {
    text: "Änderungen — speichert in Kürze",
    icon: Clock,
    cls: "text-warning bg-warning-bg border-[color:var(--warning-bg)]",
  },
  speichert: {
    text: "Speichert …",
    icon: Loader2,
    cls: "text-ink-2 bg-sunken border-line",
    spin: true,
  },
  offline: {
    text: "Offline — Änderungen gesperrt",
    icon: CloudOff,
    cls: "text-info bg-info-bg border-[color:var(--info-bg)]",
  },
  konflikt: {
    text: "Konflikt mit Serverstand",
    icon: TriangleAlert,
    cls: "text-warning bg-warning-bg border-[color:var(--warning-bg)]",
  },
  ungespeichert: {
    text: "Nicht gespeichert",
    icon: CircleX,
    cls: "text-danger bg-danger-bg border-[color:var(--danger-bg)]",
  },
};

export function SaveStatus({
  state,
  className,
  onRetry,
}: {
  state: SaveState;
  className?: string;
  onRetry?: () => void;
}) {
  const cfg = MAP[state];
  const Icon = cfg.icon;
  const chip = (
    <div
      aria-live="polite"
      className={cn(
        "inline-flex h-[30px] shrink-0 items-center gap-2 rounded-[6px] border px-2.5 text-[12px] font-medium",
        cfg.cls,
        className,
      )}
    >
      <Icon size={16} strokeWidth={1.5} className={cfg.spin ? "animate-spin" : undefined} />
      <span>{cfg.text}</span>
    </div>
  );

  if (state !== "ungespeichert" || !onRetry) return chip;
  return (
    <span className="inline-flex items-center gap-2">
      {chip}
      <button
        type="button"
        onClick={onRetry}
        className="text-[12px] font-medium text-action underline underline-offset-2"
      >
        Erneut versuchen
      </button>
    </span>
  );
}

export const SAVE_STATES: SaveState[] = [
  "gespeichert",
  "aenderungen",
  "speichert",
  "offline",
  "konflikt",
  "ungespeichert",
];
