# Markenquellen

Hier liegen die Originale des Logo-Pakets. Was die Anwendung ausliefert, steht
dagegen in [`public/`](../../public/) — dieser Ordner ist Archiv und
Ableitungsgrundlage, keine Laufzeitquelle. `docs/` steht in
[`.dockerignore`](../../.dockerignore); nichts davon landet im Abbild.

Verbindlich für Farbe, Schutzraum und Einsatz ist der Abschnitt „Marke" im
[Designsystem](../designsystem.md).

## Dateien

| Datei | Maß | Wofür |
| --- | --- | --- |
| `sitzplan-studio-logo.svg` | 1060 × 256 | Masterlogo, Bild- und Wortmarke nebeneinander |
| `sitzplan-studio-logo.png` | 1600 × 386 | dasselbe als Rastergrafik, für Social-Vorschau und Fremdsysteme |
| `sitzplan-studio-bildmarke.svg` | 256 × 256 | nur das Zeichen |
| `sitzplan-studio-bildmarke.png` | 1024 × 1024 | Zeichen als Rastergrafik, Vorlage für alle Icon-Größen |
| `sitzplan-studio-wortmarke.svg` | 760 × 160 | nur der Namenszug |
| `sitzplan-studio-wortmarke.png` | 1600 × 337 | Namenszug als Rastergrafik |
| `sitzplan-studio-refined-concept.png` | 1254 × 1254 | Entwurfsblatt zur Formfindung, nicht zum Einsetzen |

Die SVG-Dateien tragen ihre Schrift als Pfade, brauchen also keine
Schriftdatei. Alle Marken stehen auf transparentem Grund.

## Was daraus abgeleitet ist

In `public/` liegen die ausgelieferten Fassungen. Zwei sind nicht bloß Kopien
und lassen sich so wiederherstellen:

```bash
# Favicon: 16/32/48/64 in einer Datei. Die .ico aus dem Paket war eine
# einzelne 192er-Größe mit 173 KB — für ein Favicon das Zehnfache des Nötigen.
magick public/favicon-512.png -define icon:auto-resize=64,48,32,16 public/favicon.ico

# Maskierbares Icon: Android beschneidet das Icon auf eine Gerätemaske. Die
# Marke füllt ihre Fläche fast randlos, deshalb hier auf 56 % verkleinert und
# auf die helle Fläche des Designsystems gesetzt.
#
# `-extent` hängt keine Ränder an, sondern legt eine neue Leinwand in
# `-background` an und komponiert das Bild mit `over` darauf — die Transparenz
# der Quelle wird dabei schon gegen #F1EBE0 gerechnet. `-alpha remove -alpha
# off` ändert am Ergebnis daher nichts und steht nur da, damit die Absicht
# nicht vom Verhalten von `-extent` abhängt: ein maskierbares Icon muss
# deckend sein, sonst füllt der Launcher den Rest nach eigenem Gutdünken.
magick public/logo-bildmarke.png -resize 288x288 \
  -background "#f1ebe0" -gravity center -extent 512x512 \
  -alpha remove -alpha off public/maskable-512.png
```

Die restlichen Dateien in `public/` sind unveränderte Übernahmen aus diesem
Ordner beziehungsweise aus dem Logo-Paket.

## Die dritte Fassung

Die Bildmarke existiert ein drittes Mal, als React-Komponente in
[`src/components/Marke.tsx`](../../src/components/Marke.tsx). Grund ist die
Farbe: Die Oberfläche zieht sie über `var(--action)` aus dem Designsystem,
statt Terrakotta fest einzubauen. Geometrie und Pfade sind dieselben wie in
`sitzplan-studio-bildmarke.svg`.

## Wenn sich die Form ändert

Die Marke liegt an drei Stellen, und sie hängen in dieser Reihenfolge
voneinander ab:

1. **Quelle** — die SVG-Dateien in diesem Ordner. Hier wird gezeichnet.
2. **Ausgelieferte Fassungen** in `public/`. Die unveränderten Übernahmen neu
   kopieren, `favicon.ico` und `maskable-512.png` mit den beiden Befehlen oben
   neu erzeugen.
3. **`src/components/Marke.tsx`** — Pfade und Geometrie von Hand nachziehen.

Wer bei Schritt 2 oder 3 aufhört, bekommt keinen Fehler: Favicon, Startbildschirm
und Oberfläche sehen jedes für sich richtig aus und zeigen trotzdem verschiedene
Marken. Nach einer Formänderung deshalb einmal `/signin`, den Browser-Tab und
den Ausdruck ansehen.
