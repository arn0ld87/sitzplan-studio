// Rastermathematik des Grundrisses. Alle Längen in Zentimetern — die
// Zeichenfläche rechnet 1 SVG-Einheit = 1 cm (siehe `raster_cm` in der Datenbank).

/** Rasterweite, wenn ein Raum keine eigene mitbringt. */
export const RASTER_STANDARD = 25;

/** Rasterweite eines Raums; fällt bei fehlender oder unbrauchbarer Angabe auf {@link RASTER_STANDARD}. */
export function rasterWeite(raster?: number | null): number {
  return raster || RASTER_STANDARD;
}

/**
 * Rundet einen Wert auf das nächste Vielfache der Rasterweite.
 * Halbe Rasterschritte gehen zur größeren Zahl (JavaScript-Rundung).
 */
export function aufRasterRunden(wert: number, raster: number): number {
  return Math.round(wert / raster) * raster;
}

/** Rundet einen Punkt komponentenweise auf das Raster. */
export function aufRasterPunkt(x: number, y: number, raster: number): { x: number; y: number } {
  return { x: aufRasterRunden(x, raster), y: aufRasterRunden(y, raster) };
}
