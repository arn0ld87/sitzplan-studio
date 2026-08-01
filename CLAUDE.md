# Claude Code — Sitzplan Studio

Ergänzt [`AGENTS.md`](AGENTS.md). Bei Widerspruch gewinnt diese Datei für Claude Code.
Antworten auf Deutsch, technische Bezeichner im Original.

## Hartanker — nicht verhandelbar

1. **Designsystem vor Code.** [`docs/designsystem.md`](docs/designsystem.md) ist
   SSoT. Farbe, Radius, Schatten, Schriftgröße nie improvisieren — nachschlagen.
2. **RLS an jeder Tabelle.** Neue Migration ohne `user_id`-Policy wird nicht
   committet. Ausnahmslos.
3. **`deleted_at IS NULL`** in jeder Leseabfrage auf Nutzdaten.
4. **Kein History-Rewrite auf Gepushtem.** `--force`, Rebase, Amend: verboten.
   Offene PRs und Review-Kommentare hängen an den Commit-SHAs.
5. **Ein Sitzplatz heißt `<objektId>__sitz_<n>`.** Das Muster ist Vertrag
   zwischen `canvas_document` (JSONB) und UI — siehe `seatId()`.

## Vor dem Ändern

Dieses Repo **ist** in `code-review-graph` registriert (Alias `sitzplan_app`,
seit 2026-08-01). Also zuerst dort fragen — 647 Knoten und 6082 Kanten über
128 Dateien zu befragen ist billiger, als die Dateien zu lesen:

- `semantic_search_nodes` statt `Grep`, `get_impact_radius` vor jeder Änderung
  mit Reichweite, `query_graph` für Aufrufer und Tests.
- `Grep`/`Read` erst danach, und nur für die Stellen, die CRG benannt hat.
- Der Graph hält sich selbst frisch: global bei Session-Start, im Projekt per
  PostToolUse-Hook in [`.claude/settings.json`](.claude/settings.json) nach
  Änderungen an `.ts`, `.tsx`, `.sql`.

Danach:

- Einstieg über `src/routes/_authenticated/` — dateibasierte Routen zeigen die
  Seitenstruktur direkt ([ADR-0005](docs/decisions/0005-dateibasierte-routen.md)).
- `Grep` nach dem Domänenbegriff auf Deutsch (`sitzregeln`, `raster_cm`,
  `canvas_document`), nicht auf Englisch.
- Domänentypen zuerst lesen: [`src/data/types.ts`](src/data/types.ts).
  Sie erklären Geometrie, Sitzplatzkennungen und Papierkorb in 185 Zeilen.
- Für Supabase-Schemafragen die Migrationen lesen, nicht die generierten Typen.

## Gate vor Commit (sequentiell, kein Auto-Fix-Loop)

```bash
bun run typecheck   # tsc --noEmit
bun run lint        # muss sauber sein
bun run test        # vitest run — ohne Netz, ohne Datenbank
bun run build       # muss durchlaufen
```

Kurzform: `/gate`. Einzelheiten und Schemasonderfälle:
[`docs/runbooks/pre-push-gate.md`](docs/runbooks/pre-push-gate.md).

Neun Testdateien decken die Stellen ab, an denen stille Fehler teuer werden:

| Datei | Prüft |
| --- | --- |
| `src/data/mapping.test.ts` | Rundreise DB → Domäne → DB, tolerante Altfälle |
| `src/data/types.test.ts` | Geometrie, `seatId()`, Möbelmaße, Farbvergabe |
| `src/data/laden.test.ts` | Zeilen zu `AppData`, Papierkorb-Nutzlast |
| `src/data/papierkorb.test.ts` | Soft-Delete-Filter, Wiederherstellen |
| `src/data/sitzregeln.test.ts` | Nachbarschaft und Regelverstöße |
| `src/lib/raster.test.ts` | Rasterrundung in Zentimetern |
| `src/lib/zeit.test.ts` | relative Zeitangaben über Monats- und Jahresgrenzen |
| `src/components/ui-kit/SaveStatus.test.tsx` | Zustand als Symbol **und** Text |
| `src/components/plan/room3d/geometrie.test.ts` | 3D-Projektion der Raumgeometrie |

Wer dort etwas ändert, erweitert die Tests, statt sie passend zu machen. Für
Routing, Druckansicht und Anmeldung gibt es keine Tests; dort ersetzt
sorgfältiges Lesen und einmal Durchklicken das grüne Häkchen.

## Häufige Fallen

| Falle | Richtig |
| --- | --- |
| Neue Komponente bauen | Erst `src/components/ui-kit/` durchsehen |
| `src/components/ui/` umbauen | Generierte shadcn-Primitives in Ruhe lassen |
| Tailwind-Standardfarben nutzen | CSS-Variablen aus `src/styles.css` |
| Fokus/Auswahl in Terrakotta | Petrol `#2F5D73`, Terrakotta ist Primäraktion |
| `window.confirm` | `ConfirmDialog` aus dem ui-kit |
| Zweite Primäraktion in einer Ansicht | Genau eine, Rest sekundär |
| Raumvorlage ändern und Pläne mitziehen | Plan hat eine **eingefrorene Kopie** |
| Zustand nur farblich unterscheiden | Symbol **und** Text, siehe `SaveStatus` |

## Token Efficiency

- Keine Datei erneut lesen, die gerade geschrieben wurde.
- Kein Nacherzählen von Diffs, keine Zusammenfassung, wenn das Ergebnis
  selbsterklärend ist.
- Unabhängige Tool-Calls in einer Message bündeln.
- Zusammengehörige Edits in einem Rutsch, nicht fünf einzelne.

## Stil

- Knapp. 2–4 Sätze als Standardreport.
- Datei-Referenzen als Markdown-Link: [`src/data/types.ts`](src/data/types.ts).
- Keine Emojis, keine Entschuldigungen, keine Meta-Kommentare.
- Widerworte sind erwünscht: unsinnige oder riskante Anforderungen erst
  benennen, dann Gegenvorschlag, dann auf Entscheidung warten.
