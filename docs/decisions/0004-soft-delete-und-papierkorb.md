# ADR-0004: Soft-Delete mit Papierkorb

- Status: **Accepted**
- Datum: 2026-08-01 (rückwirkend festgehalten)
- Betrifft: alle Nutzdatentabellen, `src/routes/_authenticated/papierkorb.tsx`

## Kontext

Die Nutzer sind Lehrkräfte, keine Datenbankadministratoren. Ein versehentlich
gelöschter Sitzplan bedeutet eine Stunde Arbeit noch einmal. Ein versehentlich
gelöschter Raum nimmt keine bestehenden Pläne mit — siehe
[ADR-0003](0003-eingefrorene-raumkopie-im-plan.md) — kostet aber die Vorlage.

Gleichzeitig sind Schülerdaten personenbezogen. „Nie wirklich löschen" ist keine
zulässige Antwort; auf Wunsch muss endgültig gelöscht werden können.

## Entscheidung

Jede Nutzdatentabelle trägt `deleted_at timestamptz NULL`. Löschen setzt den
Zeitstempel, es entfernt keine Zeile. Der Papierkorb zeigt, was einen Zeitstempel
trägt, und stellt es wieder her.

Daraus folgt eine Regel ohne Ausnahme:

> **Jede Leseabfrage auf Nutzdaten enthält `deleted_at IS NULL`.**

Wer sie vergisst, zeigt gelöschte Daten an. Das ist kein Schönheitsfehler,
sondern eine falsche Auskunft an die Lehrkraft.

Endgültiges Löschen bleibt möglich: aus dem Papierkorb heraus, ausdrücklich, und
über die Kaskade an `auth.users`, wenn ein Konto verschwindet.

## Folgen

**Gut.** Fehlgriffe sind umkehrbar. Löschen darf sich leicht anfühlen.

**Gut.** Fremdschlüssel bleiben gültig, solange die Zeile existiert. Ein
gelöschter Schüler zerreißt keine Sitzregel.

**Teuer.** Die Regel ist nicht erzwungen. Weder Datenbank noch Typsystem
verhindern eine Abfrage ohne `deleted_at IS NULL`. Sie steht deshalb in
[`CLAUDE.md`](../../CLAUDE.md), in [`AGENTS.md`](../../AGENTS.md) und hier.

**Teuer.** Eindeutigkeitsregeln müssen den Papierkorb berücksichtigen — ein
gelöschter Datensatz belegt seinen Namen weiter, solange nichts anderes
festgelegt ist.

**Offen.** Ein automatisches Leeren nach Frist gibt es nicht. Käme es, gehört die
Frist in die Datenschutzhinweise, bevor sie in den Code gehört.

## Verworfen

*Echtes Löschen mit Bestätigungsdialog.* Ein Dialog ersetzt keine Umkehrbarkeit;
er wird weggeklickt.

*Papierkorb nur im Browser.* Überlebt keinen Gerätewechsel und keine neue Sitzung.
