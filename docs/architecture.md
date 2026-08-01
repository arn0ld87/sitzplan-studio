# Architektur — Sitzplan Studio

Stand: 2026-08-01. Tatsachenquelle ist der Code, nicht dieses Dokument. Wo
beides auseinanderläuft, gewinnt der Code — und dieses Dokument wird korrigiert.

## Was die Anwendung tut

Lehrkräfte verwalten Klassen und Schüler, zeichnen Räume mit echtem Mobiliar
maßstabsgetreu und verteilen Schüler auf Sitzplätze. Sitzregeln beschreiben
Wünsche und Konflikte; die Anwendung prüft sie und macht Verstöße sichtbar.
Ergebnis ist ein druckbarer Sitzplan.

## Schichten

```
src/routes/          TanStack Start, dateibasiert — Seitenstruktur ist Ordnerstruktur
  └ _authenticated/  alles hinter Login; route.tsx erzwingt die Session
src/components/      74 Dateien
  ├ ui-kit/          eigene, kuratierte Bausteine — hier zuerst nachsehen
  └ ui/              generierte shadcn-Primitives — nicht von Hand umbauen
src/data/            Domäne: types.ts (Wahrheit über Geometrie) + mapping.ts (DB ↔ Domäne)
src/integrations/    Supabase: Client, Server-Client, Auth-Middleware
src/lib/             Querschnitt: Zeitformate, Fehlererfassung
src/store/           clientseitiger Zustand
supabase/migrations/ Schema und RLS-Policies
```

Die Abhängigkeit zeigt in eine Richtung: Routen nutzen Komponenten, Komponenten
nutzen `data/`, `data/` kennt weder Routen noch Komponenten. `mapping.ts` ist
die einzige Stelle, die Datenbankzeilen in Domänenobjekte übersetzt.

## Datenmodell

Sechs Tabellen, jede mit `user_id uuid NOT NULL REFERENCES auth.users ON DELETE
CASCADE` und vollständigem RLS-Policy-Satz (select/insert/update/delete):

| Tabelle | Inhalt |
| --- | --- |
| `klassen` | Klassen der Lehrkraft |
| `schueler` | Schüler, gehören zu einer Klasse |
| `raeume` | Raumvorlagen mit `canvas_document` (JSONB) und `raster_cm` |
| `sitzplaene` | Sitzpläne mit eingefrorener Raumkopie und Zuordnungen |
| `sitzplan_versionen` | Versionsstände eines Plans |
| `sitzregeln` | Wünsche und Konflikte zwischen Schülern |

Geometrie liegt nicht relational, sondern als versioniertes JSONB-Dokument in
`canvas_document` — siehe [ADR-0002](decisions/0002-dokumenten-jsonb-fuer-geometrie.md).
`raster_cm` ist per `CHECK (raster_cm >= 5)` nach unten begrenzt.

## Zwei Dokumenttypen, ein Vertrag

`RaumDokument` beschreibt eine Vorlage, `PlanDokument` einen konkreten Plan.
Beide tragen eine Versionsnummer (`RAUM_DOKUMENT_VERSION`, `PLAN_DOKUMENT_VERSION`)
und werden über vier Funktionen in `src/data/mapping.ts` gelesen und geschrieben:

```
DB-Zeile ──ausRaumDokument──▶ RaumDokument ──zuRaumDokument──▶ DB-Zeile
DB-Zeile ──ausPlanDokument──▶ PlanDokument ──zuPlanDokument──▶ DB-Zeile
```

Die `aus*`-Funktionen sind tolerant: Sie lesen auch unvollständige oder ältere
Dokumente und füllen Fehlendes mit Vorgaben. Die `zu*`-Funktionen sind streng.
Das ist Absicht — alte Datensätze dürfen nie zum Absturz führen.

**Sitzplatz-IDs** folgen dem Muster `<objektId>__sitz_<n>`, erzeugt von `seatId()`.
Dieses Muster ist der Vertrag zwischen JSONB-Dokument und Oberfläche. Wer es
ändert, macht bestehende Zuordnungen unlesbar.

`FURNITURE_SPECS` hält die realen Maße je Möbeltyp, `STUDENT_COLORS` die
Farbpalette für Schülermarker. Beides in [`src/data/types.ts`](../src/data/types.ts).

## Authentifizierung

Supabase Auth. Drei Dateien teilen sich die Arbeit:

- [`client.ts`](../src/integrations/supabase/client.ts) — Browser-Client
- [`client.server.ts`](../src/integrations/supabase/client.server.ts) — Server-Client
- [`auth-middleware.ts`](../src/integrations/supabase/auth-middleware.ts) — prüft Token serverseitig
- [`auth-attacher.ts`](../src/integrations/supabase/auth-attacher.ts) — hängt die Session an Requests

Der Login liegt auf `/signin`, alles Weitere unter `_authenticated/`. Die
`route.tsx` dieses Segments ist die einzige Stelle, die den Zugang bewacht.

## Löschen

Nichts wird sofort entfernt. Jede Nutzdatentabelle hat `deleted_at timestamptz
NULL`; der Papierkorb zeigt, was darin liegt. Jede Leseabfrage auf Nutzdaten
muss `deleted_at IS NULL` enthalten — siehe
[ADR-0004](decisions/0004-soft-delete-und-papierkorb.md).

## Tests

Vitest mit jsdom. Neun Testdateien decken die Stellen ab, an denen stille Fehler
teuer wären:

| Datei | Prüft |
| --- | --- |
| `src/data/mapping.test.ts` | Rundreise DB → Domäne → DB, tolerante Altfälle |
| `src/data/types.test.ts` | Geometrie, `seatId()`, Möbelmaße, Farbvergabe |
| `src/data/laden.test.ts` | Zeilen zu `AppData`, Nutzlast des Papierkorbs |
| `src/data/papierkorb.test.ts` | Soft-Delete-Filter, Wiederherstellen |
| `src/data/sitzregeln.test.ts` | Nachbarschaft und Regelverstöße |
| `src/lib/raster.test.ts` | Rasterrundung in Zentimetern |
| `src/lib/zeit.test.ts` | relative Zeitangaben über Monats- und Jahresgrenzen |
| `src/components/ui-kit/SaveStatus.test.tsx` | Zustand als Symbol **und** Text |
| `src/components/plan/room3d/geometrie.test.ts` | 3D-Projektion der Raumgeometrie |

`bun run test` läuft ohne Netz und ohne Datenbank. Wo eine Supabase-Antwort nötig
ist, wird sie gefälscht, nicht abgerufen.

## Werkzeuge

Vite, TanStack Start und Router, Tailwind v4 mit CSS-Variablen aus
`src/styles.css`, Supabase, Vitest, ESLint mit Prettier, Bun als Paketmanager.

Das Repo ist im `code-review-graph` registriert (Alias `sitzplan_app`). Vor
Codeänderungen zuerst dort fragen — 647 Knoten, 6082 Kanten und 44 Abläufe über
128 Dateien sind billiger zu befragen als die Dateien zu lesen.

## Wo Lovable mitspielt

Lovable synchronisiert `main` in beide Richtungen. Deshalb: kein
History-Rewrite, kein `--force`, kein Amend auf Gepushtem. Wer die Historie
umschreibt, zerlegt die Synchronisierung.

## Entscheidungen

- [ADR-0001](decisions/0001-supabase-als-backend.md) — Supabase statt eigenem Backend
- [ADR-0002](decisions/0002-dokumenten-jsonb-fuer-geometrie.md) — Geometrie als JSONB-Dokument
- [ADR-0003](decisions/0003-eingefrorene-raumkopie-im-plan.md) — Plan friert den Raum ein
- [ADR-0004](decisions/0004-soft-delete-und-papierkorb.md) — Soft-Delete statt echtem Löschen
- [ADR-0005](decisions/0005-dateibasierte-routen.md) — dateibasierte Routen
