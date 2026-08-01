import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[8px] border border-dashed border-line-control bg-panel px-6 py-12 text-center ${className ?? ""}`}
    >
      <span
        aria-hidden
        className="mx-auto grid h-11 w-11 place-items-center rounded-[8px] border border-line bg-sunken text-ink-3"
      >
        <Icon size={20} strokeWidth={1.5} />
      </span>
      <h3 className="mt-3.5 font-serif text-[19px] font-semibold">{title}</h3>
      <p className="prose-measure mx-auto mt-1.5 text-[14px] text-ink-2">{text}</p>
      {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
    </div>
  );
}
