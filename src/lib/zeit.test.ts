import { describe, expect, it } from "vitest";
import { relativeZeit } from "./zeit";

const jetzt = new Date("2026-08-01T12:00:00");
const vor = (ms: number) => new Date(jetzt.getTime() - ms);

const SEK = 1000;
const MIN = 60 * SEK;
const STD = 60 * MIN;
const TAG = 24 * STD;

describe("relativeZeit", () => {
  it("nennt die letzte Minute 'gerade eben'", () => {
    expect(relativeZeit(vor(0), jetzt)).toBe("gerade eben");
    expect(relativeZeit(vor(59 * SEK), jetzt)).toBe("gerade eben");
  });

  it("zählt Minuten bis zur vollen Stunde", () => {
    expect(relativeZeit(vor(MIN), jetzt)).toBe("vor 1 Min.");
    expect(relativeZeit(vor(59 * MIN), jetzt)).toBe("vor 59 Min.");
  });

  it("zählt Stunden bis zum vollen Tag", () => {
    expect(relativeZeit(vor(STD), jetzt)).toBe("vor 1 Std.");
    expect(relativeZeit(vor(23 * STD), jetzt)).toBe("vor 23 Std.");
  });

  it("sagt 'Gestern', wenn der Kalendertag genau einer zurückliegt", () => {
    expect(relativeZeit(vor(25 * STD), jetzt)).toBe("Gestern");
  });

  it("nennt bei älteren Einträgen Tag und Monat", () => {
    expect(relativeZeit(vor(5 * TAG), jetzt)).toBe("27. Juli");
  });

  it("ergänzt das Jahr, sobald der Eintrag über ein Jahr alt ist", () => {
    expect(relativeZeit(vor(400 * TAG), jetzt)).toBe("27. Juni 2025");
  });

  it("versteht Zeitstempel im Postgres-Format mit Leerzeichen", () => {
    expect(relativeZeit("2026-08-01 11:00:00", jetzt)).toBe("vor 1 Std.");
  });

  it("gibt unlesbare Eingaben unverändert zurück, statt 'Invalid Date' anzuzeigen", () => {
    expect(relativeZeit("morgen früh", jetzt)).toBe("morgen früh");
    expect(relativeZeit(new Date("kaputt"), jetzt)).toBe("");
  });
});
