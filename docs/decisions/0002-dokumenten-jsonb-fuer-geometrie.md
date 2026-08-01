# ADR-0002: Raumgeometrie als versioniertes JSONB-Dokument

- Status: **Accepted**
- Datum: 2026-08-01 (rückwirkend festgehalten)
- Betrifft: `raeume.canvas_document`, `sitzplaene`, `src/data/mapping.ts`

## Kontext

Ein Raum besteht aus Möbeln mit Position, Drehung, Maßen und Typ, dazu
Wänden, Fenstern und Türen. Beim Zeichnen ändert sich dieser Zustand
fortlaufend — schieben, drehen, löschen, rückgängig machen.

Relational modelliert wäre das eine Tabelle `moebel` mit Fremdschlüssel auf
`raeume`, dazu eine für Sitzplätze. Jede Mausbewegung, die ein Möbelstück
absetzt, wäre dann ein Schreibvorgang auf mehrere Zeilen; jedes Laden ein Join.

## Entscheidung

Die vollständige Raumgeometrie liegt als **ein** JSONB-Dokument in
`raeume.canvas_document`. Sitzpläne speichern ihr Dokument analog.

Beide Dokumenttypen tragen eine Versionsnummer — `RAUM_DOKUMENT_VERSION` und
`PLAN_DOKUMENT_VERSION` in [`src/data/types.ts`](../../src/data/types.ts). Der
Übergang zwischen Datenbank und Domäne läuft ausschließlich über vier Funktionen
in [`src/data/mapping.ts`](../../src/data/mapping.ts):

| Richtung | Funktion | Haltung |
| --- | --- | --- |
| DB → Domäne | `ausRaumDokument`, `ausPlanDokument` | **tolerant** — ergänzt Fehlendes mit Vorgaben |
| Domäne → DB | `zuRaumDokument`, `zuPlanDokument` | **streng** — schreibt nur Vollständiges |

Sitzplätze werden nicht gespeichert, sondern aus dem Möbelstück abgeleitet:
`seatId()` erzeugt `<objektId>__sitz_<n>`. Dieses Muster ist der Vertrag
zwischen Dokument und Oberfläche.

## Folgen

**Gut.** Ein Raum ist ein Lesevorgang und ein Schreibvorgang. Undo/Redo ist
Zustandsverwaltung im Browser, keine Transaktionsakrobatik.

**Gut.** Neue Möbeleigenschaften brauchen keine Migration — nur eine
Versionserhöhung und einen Vorgabewert in der `aus*`-Funktion.

**Teuer.** Die Datenbank kann Geometrie nicht prüfen. Kein Fremdschlüssel
verhindert einen Sitzplatz ohne Möbelstück. Diese Prüfung liegt in `types.ts`
und in den Tests — deshalb ist `mapping.test.ts` nicht optional.

**Teuer.** Suchen über Geometrie („alle Räume mit Doppeltisch") sind JSONB-Abfragen
statt Joins. Bislang gibt es diesen Bedarf nicht. Käme er, ist eine abgeleitete
Tabelle die Antwort, nicht die Umkehr dieser Entscheidung.

**Regel.** Wer `seatId()` oder das Dokumentformat ändert, muss die `aus*`-Funktionen
abwärtskompatibel halten und die Versionsnummer erhöhen. Bestehende Pläne dürfen
nicht brechen.

## Verworfen

*Relationale Möbeltabellen.* Korrekter, aber im Zeichenbetrieb spürbar langsamer
und deutlich aufwendiger beim Rückgängigmachen.

*Unversioniertes JSON.* Spart heute fünf Zeilen und kostet beim ersten
Formatwechsel jeden bestehenden Datensatz.
