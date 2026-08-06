import type { Furniture } from "@/data/types";

/** Wählt genau das erste Lehrerpult eines Raums für die persönliche Figur. */
export function lehrerinnenPultId(moebel: readonly Furniture[]): string | null {
  return moebel.find((stueck) => stueck.kind === "pult")?.id ?? null;
}
