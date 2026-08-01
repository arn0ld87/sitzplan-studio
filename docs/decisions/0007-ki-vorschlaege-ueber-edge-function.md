# ADR-0007: KI-Sitzplanvorschläge über eine Edge Function

- Status: **Accepted**
- Datum: 2026-08-01
- Betrifft: `supabase/functions/`, `supabase/migrations/`, die Sitzplan-Ansicht
- Umsetzungsplan: [Plan 0001](../plaene/0001-merkmale-notizen-und-ki-vorschlag.md)

## Kontext

Eine Lehrkraft soll sich beim Verteilen von Schülern auf Sitzplätze von einem
Sprachmodell helfen lassen können. Die Eingabe dafür sind Merkmale wie ADHS oder
Schwerhörigkeit, freie Notizen und die bestehenden Sitzregeln.

Daraus folgen drei Zwänge, die sich nicht wegdiskutieren lassen:

1. **Ein Vite-Bundle kennt keine Geheimnisse.** `VITE_*`-Variablen werden beim
   Bauen in den ausgelieferten JavaScript-Code hineingeschrieben. Die Forderung
   „der Schlüssel ist fest hinterlegt und trotzdem nicht auslesbar" ist im
   Frontend unerfüllbar — sie ist nur erfüllbar, wenn der Schlüssel das Frontend
   nie erreicht.
2. **Die Registrierung ist offen.** [`signin.tsx`](../../src/routes/signin.tsx)
   bietet `signUp` an. Ein Aufruf kostet rund 1,9 Cent. Ohne Deckel ist die
   Rechnung eine Funktion der Kontenzahl, und die kontrolliert niemand.
3. **Ein Sprachmodell liefert Plausibles, nicht Richtiges.** Structured Output
   garantiert das Schema, nicht die Bedeutung. Ein Schüler auf zwei Plätzen, ein
   erfundener Sitzplatz, eine ignorierte Regel sind reale Ausgänge.

Zugleich existiert in [`src/data/sitzregeln.ts`](../../src/data/sitzregeln.ts)
bereits eine deterministische Regelprüfung. Sie war für die Handarbeit gedacht,
taugt aber unverändert dazu, ein Modellergebnis nachzurechnen.

## Entscheidung

**Der Schlüssel liegt als Supabase-Secret in einer Edge Function, nie im
Bundle.** Das Frontend ruft die Funktion mit dem Anmelde-Token auf.

**Die Funktion bekommt nur `{ planId, modus }`.** Sie liest Klasse, Schüler,
Merkmale, Notizen, Regeln und Raumgeometrie selbst aus der Datenbank, mit dem
JWT des Nutzers, sodass die bestehende RLS unverändert greift. Der Prompt
entsteht vollständig serverseitig.

Das ist der Kern der Entscheidung: Die Alternative — das Frontend schickt den
fertigen Datensatz mit — spart Code, macht die Funktion aber zu einem
authentifizierten Weiterreichen beliebiger Prompts auf fremde Rechnung. Wer sich
anmelden kann, könnte ihr dann jeden Inhalt unterschieben.

**Jede Antwort wird nachgerechnet, bevor sie jemand sieht.** Unbekannte
Sitzplatzkennungen und Doppelbelegungen werden verworfen und der Platz bleibt
leer; vergessene Schüler erscheinen sichtbar als „nicht zugeordnet";
Regelverstöße werden gemeldet und nicht stillschweigend korrigiert. Kein
automatischer zweiter Versuch. Der Vorschlag erscheint als Vorschau und wird
erst auf „Übernehmen" wirksam.

**Modell:** `gemini-3.6-flash` mit `generation_config.thinking_level: "low"` und
`store: false`, über die Interactions API. Die Werte sind gemessen, nicht
geraten; die Meßreihe steht im Plan. Kurz: der Default `medium` kostet 22–26
Sekunden statt 7, ohne bessere Ergebnisse. `gemini-3.5-flash-lite` wäre
viermal schneller und zehnmal billiger, überging in der Messung aber in zwei von
drei Läufen eine Freitext-Notiz — also genau das, wofür die Notiz existiert.

`store: false` schaltet **das Interaction-Logging** ab: ohne das Feld hielte
Google die Anfrage im Paid Tier standardmäßig 55 Tage abrufbar vor. Es ist
ausdrücklich **keine** Zusicherung, dass nichts gespeichert wird. Google
protokolliert Prompts und Antworten daneben befristet zur Erkennung von
Verstößen gegen die Nutzungsrichtlinien — das steht so in den Additional Terms
und lässt sich per Feld nicht abschalten. Wer echte Nullspeicherung braucht,
landet bei Zero Data Retention, und das ist eine Vertragsfrage, keine
Codezeile.

**Deckel:** 100 Aufrufe pro Tag und Konto, 10 pro Minute, 300 pro Tag über alle
Konten, protokolliert in einer Tabelle `ki_aufrufe` mit RLS wie überall sonst.

**Nur bezahltes Kontingent.** Das kostenlose ist für Anwendungen im EWR
vertraglich ausgeschlossen und gibt eingereichte Inhalte in Training und
menschliche Sichtung. Fällt die Abrechnung weg, muss das Feature abschalten und
darf nicht zurückfallen.

## Folgen

**Gut.** Der Schlüssel ist tatsächlich geschützt, nicht nur gefühlt. Ein Blick
in den Quelltext der ausgelieferten Seite fördert ihn nicht zutage.

**Gut.** Die vorhandene Regelprüfung bekommt eine zweite Aufgabe, ohne verändert
zu werden. Ein halluzinierter Plan kann nicht unbemerkt in den Store gelangen.

**Gut.** Die Zähltabelle zeigt nebenbei, wie oft das Feature überhaupt benutzt
wird — eine Frage, die sich sonst niemand beantworten könnte.

**Teuer.** Das Projekt bekommt seine erste Serverkomponente. Damit auch einen
zweiten Laufzeitkontext (Deno statt Browser), einen eigenen Auslieferungsweg und
Fehler, die nicht im Browser sichtbar werden.

**Teuer.** Sieben bis fünfzehn Sekunden Wartezeit sind für eine Web-Oberfläche
viel. Ein blockierender Dialog macht das erträglich, nicht schnell. „Abbrechen"
beendet nur das Warten — der Aufruf läuft weiter und kostet.

**Offen und bewusst so.** Vor- und Nachnamen gehen samt Merkmalen und Notizen
unpseudonymisiert an Google. Eine Pseudonymisierung wurde vorgeschlagen und
verworfen; sie bleibt nachrüstbar, weil das Zusammenstellen des Prompts
ausschließlich in der Funktion stattfindet. Daß ADHS und Schwerhörigkeit
Gesundheitsdaten nach Art. 9 DSGVO sind und es um Minderjährige geht, ist
festgehalten; die Abwägung liegt beim Betreiber.

## Verworfen

*`VITE_GEMINI_API_KEY` im Frontend.* Zwei Zeilen Aufwand, Schlüssel ab dem ersten
Deploy öffentlich. Wird von Bots automatisiert abgegriffen.

*Eigener Schlüssel je Lehrkraft unter Einstellungen.* Kein Missbrauchsrisiko auf
fremde Rechnung und kein Server nötig, aber niemand außer dem Betreiber besorgt
sich einen Google-API-Schlüssel. Das Feature wäre für alle anderen tot.

*Streaming der einzelnen Platzierungen.* Sieht schneller aus, ist es nicht: das
Modell denkt die ersten Sekunden, in denen nichts zu strömen wäre. Kostet
Server-Sent-Events durch zwei Schichten und Teilzustand im Store.

*Hintergrundauftrag mit Benachrichtigung.* Auftragstabelle, Polling oder Realtime
und ein zweiter Zustandsautomat — unverhältnismäßig für zwanzig Sekunden.

*Merkmale als harte Zonenregeln* („schwerhörig ⇒ tafelnah"). Verlockend, weil
`tafel`, `fenster` und `tuer` Möbelstücke mit Koordinaten sind. Kostet ein
vollständiges Zonenmodell samt Drehung und Blickrichtung und macht den
Merkmalskatalog zu einer Codekonstante, die niemand mehr erweitern darf.
Bleibt möglich, dann mit eigenem ADR.

*Automatischer zweiter Versuch bei Regelverstößen.* Verdoppelt Token, Wartezeit
und Fehlerpfade, um dem Nutzer eine Information vorzuenthalten, die er sehen
sollte.
