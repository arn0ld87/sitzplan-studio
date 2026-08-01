const MIN = 60_000;
const STD = 60 * MIN;
const TAG = 24 * STD;

export function relativeZeit(input: string | Date, now: Date = new Date()) {
  const d = typeof input === "string" ? new Date(input.replace(" ", "T")) : input;
  if (Number.isNaN(d.getTime())) return typeof input === "string" ? input : "";
  const diff = now.getTime() - d.getTime();

  if (diff < MIN) return "gerade eben";
  if (diff < STD) return `vor ${Math.floor(diff / MIN)} Min.`;
  if (diff < TAG) return `vor ${Math.floor(diff / STD)} Std.`;

  const tagVon = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const tageDiff = Math.round((tagVon(now) - tagVon(d)) / TAG);
  if (tageDiff === 1) return "Gestern";

  const mitJahr = now.getTime() - d.getTime() > 365 * TAG;
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
    ...(mitJahr ? { year: "numeric" } : {}),
  }).format(d);
}
