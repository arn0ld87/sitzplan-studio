import { SearchX } from "lucide-react";
import { Button } from "./Button";

/** Leerzustand einer gefilterten Liste samt Rücksetzen der Suche. */
export function KeineTreffer({ suche, onReset }: { suche: string; onReset: () => void }) {
  return (
    <div className="rounded-[8px] border border-dashed border-line-control bg-panel px-5 py-10 text-center">
      <SearchX size={20} strokeWidth={1.5} aria-hidden className="mx-auto text-ink-3" />
      <p className="mt-2 text-[14px] font-medium">Keine Treffer für „{suche}“</p>
      <p className="prose-measure mx-auto mt-1 text-[13px] text-ink-2">
        Prüfen Sie die Schreibweise oder setzen Sie die Suche zurück.
      </p>
      <Button className="mt-4" variant="secondary" size="sm" onClick={onReset}>
        Suche zurücksetzen
      </Button>
    </div>
  );
}
