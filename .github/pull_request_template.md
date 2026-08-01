<!--
Diese Vorlage ist kein Formular zum Abhaken, sondern eine Gedächtnisstütze.
Was nicht zutrifft, darf ersatzlos gelöscht werden — ein leerer Abschnitt ist
schlechter als kein Abschnitt.
-->

## Zweck

<!-- Was ändert sich fachlich, und warum? Ein bis drei Sätze. -->

Closes #

## Was drin ist

<!-- Die Entscheidungen, nicht die Dateiliste. Das Diff steht schon daneben. -->

-

## Prüfschritte

<!--
Wie hat jemand das nachgeprüft? Für Routing, Druckansicht und Anmeldung gibt
es keine Tests — dort ersetzt einmal Durchklicken das grüne Häkchen. Bitte
konkret: welche Seite, welcher Klick, welches Ergebnis.
-->

-

## Gate

Vor dem Push lokal gelaufen (siehe [`docs/runbooks/pre-push-gate.md`](docs/runbooks/pre-push-gate.md)):

- [ ] `bun run typecheck`
- [ ] `bun run lint`
- [ ] `bun run test`
- [ ] `bun run build`

Diese vier Schritte laufen bislang **nur lokal** — im Repo liegt noch kein
Workflow, der sie erzwingt (siehe #1). Ein unausgefülltes Kästchen heißt
also: ungeprüft. Niemand fängt das hinterher auf.

## Designsystem

<!--
Nur ausfüllen, wenn sich sichtbar etwas ändert. Sonst diesen Abschnitt löschen.
[`docs/designsystem.md`](docs/designsystem.md) ist die einzige Quelle für Farbe,
Radius, Schatten und Schriftgröße.
-->

- [ ] Farben, Radien und Abstände aus `src/styles.css`, keine Tailwind-Standardfarben
- [ ] Fokus und Auswahl in Petrol `#2F5D73`, Terrakotta bleibt der Primäraktion vorbehalten
- [ ] Genau eine Primäraktion in der Ansicht
- [ ] Bestehende Bausteine aus `src/components/ui-kit/` geprüft, bevor Neues entstand
- [ ] Zustände nicht allein farblich unterschieden, sondern mit Symbol und Text

## Daten und Sicherheit

<!-- Löschen, wenn weder Migration noch Leseabfrage berührt wurde. -->

- [ ] Neue Tabellen haben `ALTER TABLE … ENABLE ROW LEVEL SECURITY`
- [ ] Und **alle vier** Policies gegen `auth.uid()`: `select`, `insert`, `update`, `delete`
- [ ] Neue Tabellen haben `user_id`, `created_at`, `updated_at`, `deleted_at` und den Trigger `set_updated_at`
- [ ] Jede neue Leseabfrage auf Nutzdaten filtert `deleted_at IS NULL`
- [ ] Das Muster `<objektId>__sitz_<n>` bleibt unangetastet

Eine Tabelle ohne aktiviertes RLS ist ein Sicherheitsvorfall, kein Schönheitsfehler.
Ein fehlendes `insert` oder `update` fällt dagegen nicht als Lücke auf, sondern als
kaputte Funktion — beides gehört geprüft, bevor die Migration gemergt wird.

## Offen geblieben

<!--
Bewusst nicht erledigt, mit Grund. Ein ehrlicher Rest ist wertvoller als ein
PR, der Vollständigkeit behauptet.
-->

-
