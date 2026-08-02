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
magick public/logo-bildmarke.png -resize 288x288 \
  -background "#f1ebe0" -gravity center -extent 512x512 public/maskable-512.png
```

Die restlichen Dateien in `public/` sind unveränderte Übernahmen aus diesem
Ordner beziehungsweise aus dem Logo-Paket.

## Die dritte Fassung

Die Bildmarke existiert ein drittes Mal, als React-Komponente in
[`src/components/Marke.tsx`](../../src/components/Marke.tsx). Grund ist die
Farbe: Die Oberfläche zieht sie über `var(--action)` aus dem Designsystem,
statt Terrakotta fest einzubauen. Geometrie und Pfade sind dieselben wie in
`sitzplan-studio-bildmarke.svg`.

Wer die Form ändert, ändert beide Stellen — sonst laufen Favicon und
Oberfläche auseinander, und das fällt niemandem auf, weil beides für sich
richtig aussieht.
