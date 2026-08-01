# ADR-0003: Der Sitzplan friert den Raum ein

- Status: **Accepted**
- Datum: 2026-08-01 (rückwirkend festgehalten)
- Betrifft: `sitzplaene`, `src/data/mapping.ts`
- Baut auf: [ADR-0002](0002-dokumenten-jsonb-fuer-geometrie.md)

## Kontext

Ein Raum ist eine Vorlage; ein Sitzplan nutzt sie. Räume ändern sich: Tische
kommen dazu, die Anordnung wird umgestellt, ein Möbelstück verschwindet.

Verwiese ein Plan nur auf `raeume.id`, hätte jede Raumänderung rückwirkende
Folgen für jeden Plan. Ein gelöschter Tisch nähme Schülern ihren Sitzplatz —
in einem Plan, den die Lehrkraft vor drei Monaten fertiggestellt und
ausgedruckt hat. Sitzplatz-IDs (`<objektId>__sitz_<n>`) zeigten ins Leere,
Zuordnungen gingen still verloren.

## Entscheidung

Beim Anlegen erhält der Sitzplan eine **vollständige Kopie** der Raumgeometrie
zum Zeitpunkt der Erstellung. Diese Kopie ist unabhängig von der Vorlage.

Spätere Änderungen an der Raumvorlage wirken **nicht** auf bestehende Pläne.
Wer die neue Raumfassung nutzen will, legt einen neuen Plan an.

## Folgen

**Gut.** Ein fertiger Sitzplan bleibt gültig. Was gedruckt wurde, entspricht dem,
was gespeichert ist — dauerhaft.

**Gut.** Zuordnungen können nicht ins Leere zeigen. Die Sitzplätze, auf die sie
verweisen, liegen im selben Dokument.

**Überraschend.** „Ich habe den Raum geändert, der Plan sieht aber alt aus" ist
kein Fehler, sondern diese Entscheidung. Die Oberfläche muss das sichtbar machen,
sonst wirkt es wie ein Defekt. Diese Falle steht deshalb in
[`CLAUDE.md`](../../CLAUDE.md) und in [`AGENTS.md`](../../AGENTS.md).

**Teuer.** Geometrie liegt mehrfach. Bei zwanzig Plänen aus einem Raum liegt sie
zwanzigmal. Bei der Datenmenge einer Lehrkraft ist das bedeutungslos.

**Offen.** Ein bewusstes „Plan auf neue Raumfassung heben" ist denkbar, existiert
aber nicht. Es müsste Zuordnungen abgleichen und Verluste anzeigen — eigene
Entscheidung, eigenes ADR.

## Verworfen

*Referenz auf die Vorlage.* Sparsam, aber macht jede Raumänderung zu einem
Eingriff in abgeschlossene Arbeit.

*Kopie beim ersten Bearbeiten statt beim Anlegen.* Verlagert die Überraschung nur
und macht schwer erklärbar, wann ein Plan sich abkoppelt.
