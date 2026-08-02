/**
 * Prüfregeln für ein neues Passwort.
 *
 * Bewusst hier und nicht im Formular: Dieselben Regeln gelten an zwei Stellen —
 * in den Einstellungen und auf der Seite nach einem Wiederherstellungslink.
 * Zwei Kopien wären zwei Gelegenheiten, unterschiedlich streng zu sein.
 *
 * Die Mindestlänge folgt der Anmeldeseite, nicht der Voreinstellung von
 * Supabase (sechs Zeichen). Wer sie ändert, ändert sie auch dort.
 */
export const PASSWORT_MINDESTLAENGE = 8;

/**
 * Gibt die Fehlermeldung zurück oder `null`, wenn beides in Ordnung ist.
 *
 * Die Rückgabe ist die fertige deutsche Meldung, keine Fehlerkennung: Es gibt
 * genau eine Oberfläche, und ein Zwischenschritt über Codes brächte hier nichts
 * außer einer weiteren Tabelle, die auseinanderlaufen kann.
 */
export function pruefePasswort(neu: string, wiederholung: string): string | null {
  if (!neu) return "Bitte ein Passwort eingeben.";
  if (neu.length < PASSWORT_MINDESTLAENGE) return `Mindestens ${PASSWORT_MINDESTLAENGE} Zeichen.`;
  if (neu !== wiederholung) return "Die beiden Eingaben stimmen nicht überein.";
  return null;
}
