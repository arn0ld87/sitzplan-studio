import { describe, expect, it } from "vitest";
import { PASSWORT_MINDESTLAENGE, pruefePasswort } from "./passwort";

describe("pruefePasswort", () => {
  it("nimmt ein ausreichend langes, doppelt gleiches Passwort an", () => {
    expect(pruefePasswort("geheim1234", "geheim1234")).toBeNull();
  });

  it("verlangt überhaupt eine Eingabe", () => {
    expect(pruefePasswort("", "")).toBe("Bitte ein Passwort eingeben.");
  });

  it("weist ein zu kurzes Passwort ab", () => {
    const kurz = "a".repeat(PASSWORT_MINDESTLAENGE - 1);
    expect(pruefePasswort(kurz, kurz)).toBe(`Mindestens ${PASSWORT_MINDESTLAENGE} Zeichen.`);
  });

  it("nimmt genau die Mindestlänge an", () => {
    const knapp = "a".repeat(PASSWORT_MINDESTLAENGE);
    expect(pruefePasswort(knapp, knapp)).toBeNull();
  });

  it("meldet abweichende Wiederholung", () => {
    expect(pruefePasswort("geheim1234", "geheim1235")).toBe(
      "Die beiden Eingaben stimmen nicht überein.",
    );
  });

  it("prüft die Länge vor der Übereinstimmung", () => {
    // Sonst bekäme jemand, der sich vertippt UND zu kurz ist, erst die
    // zweitwichtigere Meldung und nach dem Korrigieren die erste.
    expect(pruefePasswort("kurz", "anders")).toBe(`Mindestens ${PASSWORT_MINDESTLAENGE} Zeichen.`);
  });

  it("wertet Leerzeichen als Zeichen", () => {
    // Kein Trimmen: Ein Passwort aus Leerzeichen ist ungewöhnlich, aber gültig,
    // und stilles Abschneiden würde die Anmeldung später scheitern lassen.
    const mitRand = " ".repeat(PASSWORT_MINDESTLAENGE);
    expect(pruefePasswort(mitRand, mitRand)).toBeNull();
  });
});
