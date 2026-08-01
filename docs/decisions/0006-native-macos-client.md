# ADR-0006: Nativer macOS-Client in einem eigenen Repository

- Status: **Accepted**
- Datum: 2026-08-01
- Betrifft: dieses Repository (Web-Client), das gemeinsame Supabase-Projekt,
  `contracts/`
- Ausführliche Fassung: `sitzplan_macos/docs/decisions/0001-nativer-macos-client.md`

## Kontext

Der Kern des Produkts ist ein Zeicheneditor mit Druckausgabe. Genau das ist im
Browser am teuersten: Zeigerpräzision, Tastaturbedienung, Undo-Stapel und
Druckdialog muss eine Web-App nachbauen, während macOS sie mitbringt.

Die Daten liegen bereits vollständig in Supabase — sechs Tabellen, jede mit
`user_id`, vollständigem RLS-Satz und `deleted_at`, Geometrie als versioniertes
JSONB-Dokument ([ADR-0002](0002-dokumenten-jsonb-fuer-geometrie.md)). Ein
zweiter Client braucht davon nichts zu ändern.

## Entscheidung

Ein nativer macOS-Client in Swift und SwiftUI, als **zusätzlicher Client
desselben Produkts**. Er lebt in einem eigenen Repository `sitzplan_macos`.

Für dieses Repository folgt daraus dreierlei:

1. **Nichts wird umgebaut.** Der Web-Client bleibt unverändert. Insbesondere
   wird er nicht nach `apps/web/` verschoben.
2. **`contracts/` kommt hinzu.** Plattformneutrale JSON-Fixtures, die beide
   Testsuiten lesen. Dieses Repository ist die Quelle der Wahrheit, weil hier
   Schema, Migrationen und die Referenzimplementierung in `src/data/` liegen.
   Das macOS-Repo hält eine Kopie und vergleicht sie in seiner CI.
3. **Verträge werden nicht mehr einseitig geändert.** Wer `mapping.ts`,
   `types.ts`, `seatId()` oder eine Migration anfasst, ändert damit auch das
   Verhalten eines zweiten Clients.

### Warum ein eigenes Repository

Ausschlaggebend ist Lovable: Es synchronisiert `main` dieses Repos in beide
Richtungen. Ein Xcode-Projekt unter `macos/` stünde dauerhaft unter dem Zugriff
eines Werkzeugs, das TypeScript erwartet und `.pbxproj`-Dateien nicht kennt.
Dazu kommen getrennte Werkzeugketten, getrennte CI-Läufe und ein getrennter
Freigabezyklus.

Der Preis ist Drift zwischen zwei Repositories. Die Fixtures in `contracts/`
sind die Antwort darauf — und sie wirken nur, solange die Vergleichsprüfung in
der CI bestehen bleibt.

## Folgen

**Gut.** Additive Entscheidung. Fällt der macOS-Client weg, ändert sich hier
nichts außer einem ungenutzten Verzeichnis.

**Gut.** Die Fixtures decken erstmals Fälle ab, die bisher nur implizit galten —
die Rundungsrichtung, die Kanonizität der Sitzplatzkennung, der Klassenfall im
Papierkorb.

**Teuer.** Fachlogik existiert künftig zweimal. Rasterrundung, Sitzplatzkennung,
tolerantes Lesen und Regelprüfung sind in TypeScript und Swift zu pflegen.

**Teuer.** Schemaänderungen brauchen Abstimmung. Eine Migration, die nur hier
nachgezogen wird, fällt erst auf, wenn ein Mac-Nutzer etwas Falsches sieht.

**Aufgedeckt.** Bei der Vertragsanalyse sind fünf Unstimmigkeiten im Bestand
sichtbar geworden, die vorher niemandem auffielen — unter anderem der
Rasterrückfall 10 gegen `RASTER_STANDARD` 25 und die nie erhöhte
`sitzplaene.revision`. Sie sind in `sitzplan_macos/docs/datenvertrag.md`
festgehalten und werden als eigene Issues verfolgt, nicht in diesem ADR gelöst.

## Verworfen

*Unterverzeichnis `macos/` in diesem Repository.* Am einfachsten für die
Fixtures, kollidiert aber mit dem bidirektionalen Lovable-Sync auf `main`.

*Vollständiges Monorepo mit `apps/web` und `apps/macos`.* Löst die Drift am
elegantesten und bleibt möglich, wenn Lovable wegfällt — dann mit eigenem ADR,
eigenem Issue und eigenem Pull Request.

*Zweites Backend für den Mac-Client.* Zweite Wahrheit über Schülerdaten. Nicht
verhandelbar.
