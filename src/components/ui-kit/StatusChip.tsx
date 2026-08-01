import { Check, PencilLine, Archive } from "lucide-react";

const MAP = {
  aktiv: { label: "Aktiv", Icon: Check, color: "#33573C", bg: "#E5EDE3" },
  entwurf: { label: "Entwurf", Icon: PencilLine, color: "#7A5010", bg: "#F7EDD8" },
  archiv: { label: "Archiviert", Icon: Archive, color: "#6A6157", bg: "#F3EDE3" },
} as const;

export type StatusKey = keyof typeof MAP;

export function StatusChip({ status, className }: { status: string; className?: string }) {
  const s = MAP[(status as StatusKey) in MAP ? (status as StatusKey) : "archiv"];
  const { Icon } = s;
  return (
    <span
      style={{ height: 24, borderRadius: 4, padding: "0 9px", gap: 6, color: s.color, background: s.bg }}
      className={`inline-flex items-center text-[11.5px] font-medium leading-none ${className ?? ""}`}
    >
      <Icon size={12} strokeWidth={1.75} aria-hidden />
      {s.label}
    </span>
  );
}
