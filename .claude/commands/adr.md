---
description: Architekturentscheidung als ADR festhalten
---

Halte eine Architekturentscheidung in `docs/decisions/` fest.

Thema: $ARGUMENTS

## Vorher prüfen

Ein ADR ist nur gerechtfertigt, wenn die Entscheidung **schwer umkehrbar** ist,
**ohne Kontext überraschend** wirkt oder das Ergebnis eines **echten Trade-offs**
war. Trifft nichts davon zu, sag das und schreibe kein ADR — eine Notiz in
`docs/architecture.md` reicht dann.

Vorhandene ADRs lesen, bevor ein neues entsteht: Vielleicht wird eines ersetzt
(dann Status des alten auf **Superseded by ADR-XXXX** setzen, nicht löschen).

## Format

Nächste freie Nummer, Dateiname `NNNN-kurzer-titel.md`, Deutsch:

```markdown
# ADR-NNNN: Titel als Aussagesatz

- Status: **Accepted** | **Proposed** | **Superseded by ADR-XXXX**
- Datum: JJJJ-MM-TT
- Betrifft: Dateien, Tabellen, Module
- Baut auf: (optional) ADR-XXXX

## Kontext
Welches Problem stand an? Was war der Zwang? Ohne Lösung vorwegzunehmen.

## Entscheidung
Was wurde festgelegt — im Aktiv, als Tatsache.

## Folgen
**Gut.** / **Teuer.** / **Überraschend.** / **Regel.** / **Offen.**
Ehrlich, auch die Nachteile. Ein ADR ohne Kosten ist Werbung.

## Verworfen
Welche Alternativen lagen auf dem Tisch, warum nicht?
```

## Danach

Neues ADR in [`docs/architecture.md`](../../docs/architecture.md) unter
„Entscheidungen" verlinken. Folgt aus der Entscheidung eine Regel für den
Alltag, gehört sie zusätzlich in [`CLAUDE.md`](../../CLAUDE.md) und
[`AGENTS.md`](../../AGENTS.md) — kurz, als Zeile in der Fallen-Tabelle.

Ein ADR ist ein Protokoll, keine Aufgabenliste. Es wird nicht nachträglich
umgeschrieben, wenn sich die Welt ändert — dann entsteht ein neues.
