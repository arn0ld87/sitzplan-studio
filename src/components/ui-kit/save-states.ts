/**
 * Speicherzustände der Anwendung.
 *
 * Bewusst in einer eigenen Datei: Komponentenmodule sollen ausschließlich
 * Komponenten exportieren, sonst verliert Fast Refresh im Dev-Server den
 * Zustand bei jeder Änderung.
 */
export type SaveState =
  "gespeichert" | "aenderungen" | "speichert" | "offline" | "konflikt" | "ungespeichert";

export const SAVE_STATES: SaveState[] = [
  "gespeichert",
  "aenderungen",
  "speichert",
  "offline",
  "konflikt",
  "ungespeichert",
];
