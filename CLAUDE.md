# Claude Code — Sitzplan Studio

Ergänzt [`AGENTS.md`](AGENTS.md). Bei Widerspruch gewinnt diese Datei für Claude Code.
Antworten auf Deutsch, technische Bezeichner im Original.

## Hartanker — nicht verhandelbar

1. **Designsystem vor Code.** [`docs/designsystem.md`](docs/designsystem.md) ist
   SSoT. Farbe, Radius, Schatten, Schriftgröße nie improvisieren — nachschlagen.
2. **RLS an jeder Tabelle.** Neue Migration ohne `user_id`-Policy wird nicht
   committet. Ausnahmslos.
3. **`deleted_at IS NULL`** in jeder Leseabfrage auf Nutzdaten.
4. **Kein History-Rewrite.** Lovable synchronisiert `main` in beide Richtungen.
   `--force`, Rebase, Amend auf Gepushtem: verboten.
5. **Ein Sitzplatz heißt `<objektId>__sitz_<n>`.** Das Muster ist Vertrag
   zwischen `canvas_document` (JSONB) und UI — siehe `seatId()`.

## Vor dem Ändern

Dieses Repo ist **nicht** in `code-review-graph` registriert (`list_repos_tool`
prüfen, falls sich das geändert hat). Also:

- Einstieg über `src/routes/_authenticated/` — dateibasierte Routen zeigen die
  Seitenstruktur direkt.
- `Grep` nach dem Domänenbegriff auf Deutsch (`sitzregeln`, `raster_cm`,
  `canvas_document`), nicht auf Englisch.
- Domänentypen zuerst lesen: [`src/data/types.ts`](src/data/types.ts).
  Sie erklären Geometrie, Konflikte und Papierkorb in 150 Zeilen.
- Für Supabase-Schemafragen die Migrationen lesen, nicht die generierten Typen.

## Gate vor Commit (sequentiell, kein Auto-Fix-Loop)

```bash
bun run lint     # muss sauber sein
bun run build    # muss durchlaufen
```

Bei Schemaänderung zusätzlich: `supabase db push` gegen eine Wegwerf-Instanz,
danach Typen neu generieren statt `types.ts` von Hand zu pflegen.

Es gibt **keine Testsuite**. Solange das so ist, ersetzt sorgfältiges Lesen der
betroffenen Stellen das grüne Häkchen — nicht die Hoffnung.

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
