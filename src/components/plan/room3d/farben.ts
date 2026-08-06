// Farben der 3D-Szene. Three.js kann keine CSS-Variablen lesen, deshalb werden
// die Tokens aus `src/styles.css` einmal beim Aufbau der Szene ausgelesen.
// Es gibt keine zweite Farbliste — wer eine Farbe ändern will, ändert das Token.

const TOKENS = [
  "--plan",
  "--canvas",
  "--panel",
  "--elevated",
  "--sunken",
  "--line",
  "--line-strong",
  "--line-control",
  "--line-plan",
  "--board",
  "--window",
  "--select",
  "--wood",
  "--plant",
  "--metal",
  "--poster-a",
  "--poster-b",
] as const;

export type Farbtoken = (typeof TOKENS)[number];
export type Szenenfarben = Record<Farbtoken, string>;

/**
 * Ersatzfarbe, falls ein Token nicht aufgelöst werden kann — etwa weil das
 * Stylesheet noch nicht geladen ist. Bewusst auffällig neutral: eine graue
 * Szene ist ein sichtbarer Hinweis auf ein fehlendes Stylesheet, eine hier
 * zweitkopierte Palette wäre stille Abweichung vom Designsystem.
 */
const ERSATZ = "#9c9c9c";

/** Liest die Szenenfarben-Tokens vom Dokumentwurzelelement; fehlende Werte fallen auf `ERSATZ` zurück. */
export function leseSzenenfarben(): Szenenfarben {
  const stil = getComputedStyle(document.documentElement);
  const farben = {} as Szenenfarben;
  for (const token of TOKENS) {
    farben[token] = stil.getPropertyValue(token).trim() || ERSATZ;
  }
  return farben;
}
