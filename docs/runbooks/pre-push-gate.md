# Runbook: Gate vor dem Push

Vier Schritte, in dieser Reihenfolge, jeder muss sauber sein. Kein
Auto-Fix-Loop: Wenn ein Schritt fällt, wird die Ursache behoben und ab Schritt 1
neu begonnen — nicht am Werkzeug gedreht, bis es schweigt.

```bash
bun run typecheck   # tsc --noEmit — Typen müssen halten
bun run lint        # eslint . — inklusive Prettier-Regeln
bun run test        # vitest run — ohne Netz, ohne Datenbank
bun run build       # vite build — muss durchlaufen
```

Kurzform als Slash-Command: `/gate`.

## Warum diese Reihenfolge

Typfehler machen Lint-Meldungen unlesbar. Lint-Fehler machen Testausgaben
unlesbar. Ein Build, der auf rotem Test läuft, sagt nichts aus. Der billigste
Schritt kommt zuerst.

## Wenn Lint meckert

`bun run format` schreibt Prettier-Formatierung. Das behebt Einrückung und
Anführungszeichen, **nicht** echte Regelverstöße wie
`react-refresh/only-export-components`. Diese Warnung heißt: Die Datei
exportiert neben der Komponente noch etwas anderes. Richtige Antwort ist meist,
Konstanten in eine eigene Datei zu ziehen — nicht die Regel abzuschalten.

## Bei Schemaänderungen

Zusätzlich vor dem Push:

1. `supabase db push` gegen eine Wegwerf-Instanz, nicht gegen Produktivdaten.
2. Typen neu generieren statt `src/integrations/supabase/types.ts` von Hand zu pflegen.
3. Prüfen, dass die neue Tabelle RLS aktiviert hat und alle vier Policies trägt
   (select/insert/update/delete) — siehe
   [ADR-0001](../decisions/0001-supabase-als-backend.md). Eine Migration ohne
   `user_id`-Policy wird nicht committet.
4. Prüfen, dass `deleted_at` existiert und Leseabfragen `deleted_at IS NULL`
   filtern — siehe [ADR-0004](../decisions/0004-soft-delete-und-papierkorb.md).

## Was das Gate nicht prüft

Es gibt keine E2E-Tests. Wer Routing, Druckansicht oder Anmeldung anfasst, klickt
den Weg einmal von Hand durch: anmelden, Raum öffnen, Plan öffnen, drucken,
Papierkorb.

Es gibt keine visuelle Regression. Änderungen am Designsystem gehören gegen
[`docs/designsystem.md`](../designsystem.md) geprüft, nicht gegen das Gefühl.
