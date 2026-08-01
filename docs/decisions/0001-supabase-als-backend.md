# ADR-0001: Supabase als Backend, RLS als einzige Zugriffsgrenze

- Status: **Accepted**
- Datum: 2026-08-01 (rückwirkend festgehalten)
- Betrifft: `supabase/migrations/`, `src/integrations/supabase/`

## Kontext

Sitzplan Studio ist eine Anwendung für einzelne Lehrkräfte. Jede Lehrkraft sieht
ausschließlich eigene Daten. Ein eigenes Backend hätte Authentifizierung,
Rechteprüfung, Migrationen und Betrieb bedeutet — für eine Anwendung, deren
Fachlogik fast vollständig im Browser stattfindet.

Schülerdaten sind personenbezogen und besonders schutzwürdig. Eine
Zugriffsprüfung, die in der Anwendungsschicht sitzt, ist genau so verlässlich
wie die Sorgfalt der Person, die die nächste Abfrage schreibt.

## Entscheidung

Supabase übernimmt Datenbank, Authentifizierung und Zugriffsschutz. Die
Zugriffsgrenze liegt **in der Datenbank**, nicht in der Anwendung:

- Jede Nutzdatentabelle trägt `user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE`.
- Jede Tabelle hat Row Level Security aktiviert und einen vollständigen
  Policy-Satz für select, insert, update und delete.
- Löscht ein Nutzerkonto, verschwinden die Daten per Kaskade mit.

Eine Migration ohne `user_id`-Policy wird nicht committet. Ausnahmslos.

## Folgen

**Gut.** Eine vergessene `where user_id = ...`-Bedingung führt zu leeren
Ergebnissen, nicht zu fremden Daten. Der Fehler ist harmlos statt meldepflichtig.

**Gut.** Kein Serverbetrieb, keine Sitzungsverwaltung von Hand.

**Teuer.** Das Schema ist nur über Migrationen änderbar; `types.ts` unter
`src/integrations/supabase/` wird generiert und nicht von Hand gepflegt. Bei
Schemafragen sind die Migrationen die Wahrheit, nicht die generierten Typen.

**Grenze.** Fachlogik, die serverseitig erzwungen werden müsste, gibt es
derzeit nicht. Käme sie, wären Edge Functions der nächste Schritt — mit dem
Preis, dass Logik dann an zwei Orten lebt.

## Verworfen

*Eigenes Backend (FastAPI o. ä.).* Mehr Betrieb, mehr Angriffsfläche, kein
fachlicher Gewinn bei einer Ein-Personen-Anwendung.

*Rein clientseitige Speicherung.* Kein Gerätewechsel, kein Backup, Datenverlust
beim Leeren des Browserspeichers.
