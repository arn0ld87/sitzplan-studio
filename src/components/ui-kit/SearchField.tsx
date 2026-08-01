import { Search } from "lucide-react";

export function SearchField({
  label = "Suchen",
  value,
  onChange,
  width = 200,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  width?: number;
}) {
  return (
    <div className="relative" style={{ width }}>
      <Search
        size={16}
        strokeWidth={1.5}
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
      />
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-[6px] border border-line-control bg-elevated pl-8 pr-3 text-[13px] placeholder:text-ink-3"
      />
    </div>
  );
}
