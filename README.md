# Sitzplan Studio

Baue eine Web-App für Lehrkräfte: **Sitzplan** — Klassen verwalten, Räume zeichnen, Sitzpläne erstellen. Deutschsprachige Oberfläche. Reine Frontend-Demo mit Fantasiedaten, kein Backend.

Halte dich exakt an das folgende Designsystem. Es ist fertig entworfen — nicht neu interpretieren.

## Leitidee
„Modernes Klassenatelier und digitaler Lehrertisch." Ruhig, warm, hochwertig, technisch präzise. Ein Werkzeug, kein Marketing.

## Verboten
Kein generisches SaaS-Dashboard. Keine riesigen Karten für alles. Keine großen Radien überall. Keine Farbverläufe, kein Glassmorphism, kein Dark Mode, kein Violett/Indigo. Keine Emojis als Icons. Keine Hero-Bereiche in der App. Keine Überschrift über 26 px in Arbeitsansichten. Keine schwebenden Karten, keine Bounce-Animationen. Keine dekorativen Elemente ohne Funktion.

## Farben (exakt, als CSS-Variablen in index.css und im Tailwind-Theme)
Flächen: canvas #F1EBE0 · panel #FCFAF6 · elevated #FFFFFF · sunken #F3EDE3 · plan #FDFBF7
Text: primary #26211C · secondary #6A6157 · tertiary #8E8477 · disabled #A29888 · onMarke #15110D
Linien: subtle #E4DACA · strong #D2C5AF · control #C3B49B · plan #5C5348
Aktion (Terrakotta, höchstens EINE Primäraktion pro Ansicht): #A8501F · hover #8E4218 · soft #F5E3D3 · softInk #7A3B15
Auswahl UND Fokus (Petrol, niemals Rot): #2F5D73 · soft #E1ECF1
Status: success #33573C auf #E5EDE3 · warning #7A5010 auf #F7EDD8 · danger #A32E24 auf #F8E4E0 · info #2A5468 auf #E1ECF1
Schülerfarben (index-stabil, Text darauf immer #15110D): #E08A6B #9DBFA8 #E3B56B #A99CCB #7CA9C2 #D88BA0 #B89970 #82B7A5

Regel: Rot ist ausschließlich für Löschen und Fehler. Auswahl und Fokus sind Petrol. Terrakotta ist nur die Primäraktion.

## Typografie (Google Fonts)
IBM Plex Sans für die gesamte Oberfläche. Source Serif 4 (600) nur für Seitentitel und Dialogüberschriften. IBM Plex Mono für Messwerte, Koordinaten, Zeitstempel.
Größen: Seitentitel 26px Serif · Abschnitt 17px/600 · Bereichsmarke 11px/600 versal mit 0.1em Laufweite in #8E8477 · Fließtext 14px/21px · Hilfstext nie unter 12px. Fließtext maximal 68 Zeichen breit.

## Form
Radien 3 / 6 / 8 / 10 px. Pillenform NUR für Personen-Chips. Genau zwei Schatten: `0 1px 2px rgba(38,33,28,.05)` für Panels und `0 22px 48px -16px rgba(38,33,28,.4)` für Overlays. Struktur entsteht durch 1-px-Hairlines und Flächenwechsel, nicht durch Höhe. Klickflächen mindestens 40 px, auf Touch 44 px. Globaler Fokusstil: `outline: 2px solid #2F5D73; outline-offset: 2px` auf `:focus-visible`. `prefers-reduced-motion` respektieren.

## Icons
lucide-react, 16 px, Strichstärke 1.5. Icon-only-Buttons brauchen `aria-label`.

## App-Shell
Linke Seitenleiste 236 px auf #FCFAF6 mit rechter Hairline. Oben Wortmarke: 28-px-Quadrat in Terrakotta mit „S" in Serif, daneben „Sitzplan". Nav-Einträge 38 px hoch, Icon + Label + rechtsbündige Zahl in Mono. Aktiver Eintrag: Fläche #F5E3D3, Text #7A3B15, fett UND `box-shadow: inset 3px 0 0 #A8501F` — drei Merkmale, nicht nur Farbe. Bereiche: Übersicht, Klassen, Räume, Sitzpläne, dann Trennlinie, dann Papierkorb, Einstellungen. Unten abgesetzt der Nutzerblock. Unter 768 px: Seitenleiste weg, stattdessen untere Tab-Leiste mit vier Bereichen, 52 px hoch.

## Seiten

**/ (Übersicht)** — Kopf „Guten Morgen" mit Datum, rechts Suchen + „Neuer Sitzplan". Zweispaltig: links „Zuletzt bearbeitet" als Liste von Zeilen (44-px-Planvorschau als kleines SVG, Titel, Metazeile „Klasse 7a · Raum B204 · 18 von 19 Plätzen belegt", Statusanzeige, Zeitstempel in Mono) und darunter Raumvorlagen als drei kompakte Karten mit Planvorschau plus eine gestrichelte „Raumvorlage anlegen"-Karte. Rechte Spalte: Klassenliste kompakt und ein Hinweiskasten „Datenstand — läuft mit Fantasiedaten", Badge „Testbetrieb".

**/klassen** — Seitenkopf mit Brotkrumen, Titel, Untertitel, Suchfeld, „Neue Klasse". Tabelle mit Spaltenkopf auf #F3EDE3: Klasse (Farbkreis mit Kürzel + Name + Notiz) · Schüler · Sitzregeln · Sitzpläne · Aktionen (Bearbeiten- und Löschen-Icon-Buttons, sichtbar bei Hover und immer bei Fokus). KEINE großen Karten. Leerzustand: kleine gezeichnete SVG-Illustration aus Linien und Kreisen, Überschrift „Noch keine Klasse angelegt", zwei Sätze Erklärung, „Erste Klasse anlegen" + „CSV importieren".

**/klassen/:id** — Kopf mit Farbkreis, Name, Metazeile, rechts „Bearbeiten" und „Sitzplan erstellen". Darunter Tabs (Unterstreichung in Terrakotta): Schüler / Sitzregeln / Sitzpläne. Schüler als Chips: Pillenform, 34 px, Initialen-Kreis in der Schülerfarbe plus Name.

**/raeume** — kompakte Karten mit SVG-Planvorschau, Name, Maße in Mono.

**/raeume/:id — Raumeditor, das Kernstück.** Vier Zonen:
1. Toolbar 52 px: Rücksprung „Räume", Trennstrich, Identität (Name + „720 × 520 cm · Raster 25 cm · 19 Plätze" in Mono), Undo/Redo, Raster-Checkbox, Zoom-Stepper, rechts Speicherstatus und „Raumdaten".
2. Links Palette 212 px: Bereichsmarke „Möbel einfügen", darunter sechs Einträge mit maßstäblicher SVG-Vorschau, Label und Maßen: Einzeltisch 60×50, Doppeltisch 120×50, Lehrerpult 160×80, Tafel 400×15, Tür 90×20, Fenster 15×180.
3. Mitte: der Raumplan als **SVG-Zeichnung**, `viewBox="0 0 720 520"`, zentriert, mit Bemaßungslinien außen. Wände 3 px #5C5348. Raster 25 cm als `<pattern>` in #E7DCC8. Tische weiß mit 2-px-Kontur, Doppeltisch mit Mittellinie. Lehrerpult mit 45°-Schraffur-Pattern und Beschriftung. Tafel als massiver Balken #3D4A41 mit Text „TAFEL" darunter. Tür mit gestricheltem Viertelkreis-Schwenkbogen. Fenster als Doppellinie mit #7CA9C2. Freie Sitzplätze als gestrichelte Kreise r=11. Jede Objektart muss auch in Graustufen unterscheidbar sein — Form vor Farbe.
4. Rechts Inspector 296 px: Objekttyp mit Vorschau, Position X/Y editierbar, Maße gesperrt auf #F3EDE3, Drehung als 4er-Segmentleiste 0/90/180/270, Sitzplatzliste, Tastaturhinweise mit `<kbd>`.
Ausgewähltes Objekt: 2.6-px-Kontur in Petrol, gestrichelter Auswahlrahmen, vier Eckgriffe, Drehgriff oben. Darüber schwebend am unteren Rand eine kontextuelle Aktionsleiste: Objektname, dann Drehen (R) · Duplizieren (D) · Löschen, Löschen in Rot.

**/sitzplaene/:id — Sitzplaneditor.** Gleiche Toolbar, Speicherstatus „Änderungen — speichert in Kürze". Plan wie oben, aber Sitzplätze r=16: belegt = Schülerfarbe mit Initialen in #15110D und dunklerem Kontrastrand; frei = weiß, gestrichelt, Text „frei". Ein Konflikt: zusätzlicher gestrichelter Warnring r=21 in #8A5A12 PLUS kleine „!"-Marke — nie nur Farbe. Unten eine einklappbare Schülerablage: Bereichsmarke, Zähler „2 ohne Platz", gestrichelter Bereich mit 40-px-Chips; der ausgewählte Chip hat Petrol-Rand und Petrol-Glow. Rechte Spalte 320 px: oben „Prüfung" mit dem Konfliktkasten (Warndreieck, Titel, Erklärung, zwei Aktionen), darunter „Vorschlag" — Terrakotta-Stern-Icon, ein Satz Erklärung, zwei Tauschkarten mit Vorher/Nachher-Chips und Begründung, dann „Beide übernehmen" / „Verwerfen" und der Hinweis, dass der Vorschlag reproduzierbar ist. Kein Chatbot, kein Funkeln, keine Änderung ohne Bestätigung.

**/signin** — zentriert, Wortmarke, Segmentumschalter Anmelden/Registrieren, zwei Felder, Primärbutton, darunter der Hinweis auf Fantasiedaten.

## Zustände — alle bauen
Speicherstatus in sechs Ausprägungen, alle 30 px hoch, gleiche Position, kein Springen: Gespeichert (grün, Haken) · Änderungen (gelb, Uhr) · Speichert … (neutral, Spinner) · Offline gesichert (blau) · Konflikt mit Serverstand (gelb, Dreieck) · Nicht gespeichert (rot). Jeder Zustand hat Symbol UND Text.
Ladezustand als Skeleton mit unterschiedlich breiten Zeilen und sanftem Puls. Fehlerzustand, der den lokalen Entwurf erwähnt statt nur zu scheitern, mit „Erneut versuchen" und „Entwurf ansehen". Bestätigungsdialog mit Folgenbeschreibung und Wiederherstellungsfrist — nie `window.confirm`.
Formulare: Feldgruppen mit Bereichsmarke, Pflichtfeld als Text „· Pflichtfeld" statt Sternchen, Hilfetext unter dem Feld, Fehler AM Feld mit Symbol und Satz plus eine Zusammenfassung mit `role="alert"` oben. Felder so breit wie ihr Inhalt, nicht wie der Container.

## Daten
Ausschließlich erfundene Namen. Klassen 7a, 9c, 5b, 6d, 8a, 10b. Schüler z. B. Alva Birkner, Bo Castellan, Cem Dorn, Dara Elm, Elif Fahr, Finn Gorlitz, Greta Halm, Hanno Isen, Ida Juhl, Jaro Kell, Kira Lund, Levi Moor, Mina Norr, Noe Ostwald, Ora Pels, Pino Quandt, Quirin Rasch, Suri Tavor. Räume B204, A101, C12. Sitzpläne „Deutsch 7a — Halbjahr 2", „Gruppentische — Projektwoche", „Klassenarbeit — Reihen", „Stuhlkreis — Klassenrat".

## Interaktion
Auswahl im Plan per Klick, Inspector reagiert. Schüler per Klick auswählen und auf freien Platz setzen; Drag-and-drop zusätzlich, aber die Tastaturbedienung ist gleichwertig, nicht Notlösung. Semantisches HTML, korrekte Überschriftenhierarchie, `aria-live="polite"` für den Speicherstatus, Ziel WCAG 2.2 AA.

Beginne mit Designsystem und App-Shell, dann Übersicht und Klassen, dann der Raumeditor.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6f249ae9-eb8e-40db-8f19-9d697518a3df).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
