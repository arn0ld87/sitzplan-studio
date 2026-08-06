# Plan 0001: Schülermerkmale, Notizen und KI-Sitzplanvorschlag

Stand: 2026-08-01. Entstanden aus einer durchgesprochenen Anforderung, nicht aus
einer Vermutung — jede Entscheidung unten wurde einzeln entschieden, die Zahlen
sind gemessen und nicht geschätzt.

Dieser Plan überlebt absichtlich den Sitzungskontext: wer hier später weiterbaut,
soll nicht nachfragen müssen, warum etwas so und nicht anders aussieht.

## Ausgangslage

Was bereits existiert und **nicht** neu gebaut wird: „wer neben wem sitzen darf".
Die Tabelle `sitzregeln` (`art IN ('nicht_neben','muss_neben')`), der Typ
`SeatRule`, die Auswertung in [`src/data/sitzregeln.ts`](../../src/data/sitzregeln.ts)
und ihre Tests sind vollständig vorhanden. Die Sitzplan-Ansicht zeigt Verstöße
bereits an.

Was fehlt: `schueler` trägt nur `vorname`, `nachname`, `initialen` und
`farb_index` — kein Feld für Besonderheiten, keines für eine Notiz. `klassen` hat
ein `note`, Schüler haben keines.

## Die drei Schritte

Drei Pull Requests in dieser Reihenfolge, jeder einzeln durch das
[Gate](../runbooks/pre-push-gate.md), jeder einzeln zurücknehmbar. Der Schnitt
folgt nicht der Bequemlichkeit, sondern dem Risiko: Schritt 1 ist ohne jede
KI nützlich und ohne fremden Dienst gebaut.

### PR 1 — Merkmale, Notiz, Druckoption

Migration:

```sql
ALTER TABLE public.schueler
  ADD COLUMN merkmale text[] NOT NULL DEFAULT '{}',
  ADD COLUMN notiz    text   NOT NULL DEFAULT '';
```

Die bestehenden RLS-Policies liegen auf der Tabelle, nicht auf Spalten, und
gelten damit unverändert weiter. Keine neue Policy nötig — was hier ausdrücklich
festgehalten wird, damit niemand später glaubt, es sei vergessen worden.

Katalog als Konstante `MERKMALE` in [`src/data/types.ts`](../../src/data/types.ts),
nach dem Vorbild von `STUDENT_COLORS`:

| Schlüssel | Label |
| --- | --- |
| `adhs` | ADHS |
| `autismus_spektrum` | Autismus-Spektrum |
| `schwerhoerig` | Schwerhörigkeit |
| `sehschwaeche` | Sehschwäche |
| `legasthenie` | Legasthenie |
| `dyskalkulie` | Dyskalkulie |
| `daz` | Deutsch als Zweitsprache |
| `nachteilsausgleich` | Nachteilsausgleich |
| `motorisch` | motorische Einschränkung |
| `chronisch_krank` | chronische Erkrankung |

Der Katalog ist eine **Vorschlagsliste, keine Schranke.** Freie Eingaben landen
im selben `text[]`. Beim Anzeigen gilt: bekannter Schlüssel wird zum deutschen
Label, unbekannter Wert erscheint wörtlich. Die Vorschläge speisen sich aus dem
Katalog plus allem, was der Nutzer bereits vergeben hat.

Merkmale sind **Anzeige und später KI-Eingabe — keine Prüflogik.** Es entsteht
kein Zonenmodell, das „vorne" oder „fensternah" aus der Raumgeometrie ableitet.
Das wäre möglich (`tafel`, `fenster` und `tuer` sind Möbelstücke mit Koordinaten),
ist aber bewusst nicht Teil dieses Vorhabens. Wer es später baut, findet in
`sitzregeln.ts` das Muster für prüfbare Regeln.

Zu ändern:

- `src/data/types.ts` — `Student` um `merkmale: string[]` und `notiz: string`,
  Konstante `MERKMALE`, Hilfsfunktion für die Label-Auflösung
- `src/data/mapping.ts` — beide Richtungen der Umwandlung
- `src/data/laden.ts` — Zeilen zu `AppData`
- `src/store/app.tsx` — Aktion zum Ändern der neuen Felder
- `src/routes/_authenticated/klassen.$id.tsx` — Editor in der Schülerliste
- `src/components/ui-kit/StudentChip.tsx` — Merkmale als Badge
- `src/routes/_authenticated/sitzplaene.$id_.drucken.tsx` — zwei Häkchen,
  **beide standardmäßig aus**

Der Papierkorb ist die Falle dieses PRs: `TrashItem.payload` trägt bei einer
gelöschten Klasse die vollständige `SchoolClass` samt Schülern. Die neuen Felder
müssen die Rundreise Löschen → Wiederherstellen überstehen, sonst verliert eine
wiederhergestellte Klasse still ihre Merkmale. Zu erweitern sind daher
`mapping.test.ts`, `laden.test.ts` und `papierkorb.test.ts`.

Zur Druckansicht: Ein ausgedruckter Sitzplan liegt im Klassenraum, wandert in die
Vertretungsmappe und wird am Kopierer liegengelassen. Deshalb erscheinen Merkmale
und Notizen dort **nur auf ausdrückliches Ankreuzen**, nie von allein.

### PR 2 — Edge Function und „Plan erzeugen"

Die erste Edge Function dieses Projekts. Grund für ihre Existenz ist der
API-Schlüssel: In einem Vite-Bundle gibt es kein Geheimnis, `VITE_*`-Variablen
werden beim Bauen in den ausgelieferten JavaScript-Code hineingeschrieben. Ein
Schlüssel, der „fest hinterlegt" und zugleich „nicht auslesbar" sein soll, kann
nur außerhalb des Frontends liegen.

Ablauf:

```
Browser ──{ planId, modus } + JWT──▶ Edge Function ──Secret──▶ Gemini
                                          │
                                     auth.uid(), Rate-Limit,
                                     Daten selbst aus der DB lesen
```

Das Frontend schickt **nur** `{ planId, modus }`. Die Funktion liest Klasse,
Schüler, Merkmale, Notizen, Regeln und Raumgeometrie selbst — mit dem JWT des
Nutzers, sodass die bestehende RLS unverändert greift. Der Prompt entsteht
vollständig serverseitig. Damit ist die Funktion ein Werkzeug und kein
authentifiziertes Weiterreichen beliebiger Prompts auf fremde Rechnung.

Aufrufparameter, alle gemessen und belegt:

| Feld | Wert | Grund |
| --- | --- | --- |
| Endpunkt | `POST https://generativelanguage.googleapis.com/v1beta/interactions` | Interactions API, seit Juni 2026 GA und von Google für neue Projekte empfohlen; `generateContent` gilt als Legacy |
| Kopfzeile | `x-goog-api-key` | |
| `model` | `gemini-3.6-flash` | |
| `generation_config.thinking_level` | `"low"` | Der Default ist `medium` und kostet 22–26 s statt 7 s |
| `store` | `false` | Sonst hält Google die Anfrage im Paid Tier **55 Tage** vor |
| `response_format` | `{ type: "text", mime_type: "application/json", schema }` | |

Der Antworttext liegt in `steps[].content[].text`, **nicht** in `output_text` —
das kostet sonst eine Stunde Suche.

Nachgetragen aus der Umsetzung: Das Feld `input` erwartet die **`step_list`**-Form,
also eine flache Liste `[{ type: "text", text }]`. Die naheliegende
`[{ role: "user", content: [...] }]`-Form ist `turn_list` und wird mit HTTP 400
abgelehnt („use step_list input format instead of turn_list"). Die Token stehen
in `usage.total_input_tokens` und `usage.total_output_tokens`.

Nach der Antwort wird deterministisch nachgeprüft, statt dem Modell zu glauben.
(Umgesetzt nicht in der Funktion, sondern in `src/data/ki-vorschlag.ts` — nur
dort läuft die Prüfung im Gate mit. Begründung im Nachtrag zu
[ADR-0007](../decisions/0007-ki-vorschlaege-ueber-edge-function.md).) Es gilt: unbekannte Sitzplatzkennungen und Doppelbelegungen werden verworfen und
der Platz bleibt leer, vergessene Schüler erscheinen sichtbar als „nicht
zugeordnet", Regelverstöße werden gemeldet und **nicht heimlich korrigiert**.
Kein automatischer zweiter Versuch. Die Oberfläche zeigt immer den wahren Stand.

Der Vorschlag erscheint als Vorschau über dem Plan, mit Begründung je Schüler und
einer Warnleiste. Erst „Übernehmen" schreibt in den Store.

Wartezeit: 7 bis 15 Sekunden. Ein blockierender Dialog benennt das ehrlich und
läßt sich abbrechen — wobei „Abbrechen" nur das Warten beendet; der Aufruf läuft
serverseitig weiter und kostet trotzdem.

Zweite Migration, Rate-Limit:

```sql
CREATE TABLE public.ki_aufrufe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sitzplan_id uuid NULL REFERENCES public.sitzplaene(id) ON DELETE SET NULL,
  modus text NOT NULL CHECK (modus IN ('erzeugen','pruefen')),
  token_ein int NOT NULL DEFAULT 0,
  token_aus int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ki_aufrufe_nutzer_zeit_idx ON public.ki_aufrufe (user_id, created_at DESC);
CREATE INDEX ki_aufrufe_zeit_idx        ON public.ki_aufrufe (created_at DESC);

GRANT SELECT, INSERT ON public.ki_aufrufe TO authenticated;
GRANT ALL ON public.ki_aufrufe TO service_role;
ALTER TABLE public.ki_aufrufe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ki_aufrufe_select" ON public.ki_aufrufe FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ki_aufrufe_insert" ON public.ki_aufrufe FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
```

**Bewusste Abweichung von Regel 3 in [`AGENTS.md`](../../AGENTS.md).** Diese
Tabelle bekommt **kein** `updated_at`, **kein** `deleted_at`, keinen
`set_updated_at`-Trigger und **keine** `UPDATE`- oder `DELETE`-Policy. Sie ist
ein Protokoll, keine Nutzdatentabelle: Wer seine eigenen Zeilen ändern oder
weich löschen darf, setzt damit sein Limit zurück. Die vier Policies der Regel
wären hier genau die Lücke, die sie sonst schließen. Aufgeräumt wird
serverseitig — alles älter als 30 Tage darf weg.

Deckel: **100 Aufrufe pro Tag und Konto, 10 pro Minute, 300 pro Tag global.**
Die Zahlen stehen als Konstanten in der Funktion. Sie sind nötig, weil die
Registrierung offen ist ([`signin.tsx`](../../src/routes/signin.tsx) bietet
`signUp` an) und ein Aufruf rund 1,9 Cent kostet — der globale Deckel greift bei
etwa sechs US-Dollar am Tag.

**Der globale Deckel lässt sich nicht mit dem JWT des Nutzers zählen.** Die
RLS-Policy oben zeigt jedem nur die eigenen Zeilen; eine Abfrage über alle
Konten liefert damit systematisch zu kleine Zahlen, und der Deckel griffe nie.
Er braucht deshalb eine eigene Zählfunktion:

```sql
CREATE FUNCTION public.ki_aufrufe_heute_global() RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FROM public.ki_aufrufe WHERE created_at > now() - interval '1 day';
$$;
REVOKE ALL ON FUNCTION public.ki_aufrufe_heute_global() FROM public;
GRANT EXECUTE ON FUNCTION public.ki_aufrufe_heute_global() TO service_role;
```

Das Ausführungsrecht ging in einer früheren Fassung dieses Plans an
`authenticated`. Das war falsch: Der Supabase-Linter beanstandet eine
`SECURITY DEFINER`-Funktion, die angemeldete Nutzer über `/rest/v1/rpc/`
aufrufen können, und niemand außer der Edge Function braucht die Auslastung
aller Konten. Die Funktion ruft den Zähler mit dem Dienstschlüssel auf.

`SECURITY DEFINER` umgeht RLS gezielt und gibt **nur eine Zahl** zurück — keine
Zeile, keine Kennung, kein fremder Sitzplan. Die nutzerbezogenen Deckel bleiben
dagegen bei der gewöhnlichen Abfrage unter RLS.

### PR 3 — „Plan prüfen"

Zweiter Modus auf demselben Fundament: einen bestehenden Plan bewerten und
einzelne Tausche vorschlagen, die einzeln angenommen werden. Eigenes Schema,
eigener Prompt, gleicher Rückweg über die Nachprüfung.

## Messwerte

Am 2026-08-01 gegen die echte API gemessen, mit erfundenen Namen. Aufgabe:
24 Schüler, 12 Doppeltische, 5 Regeln, 9 Schüler mit Merkmalen, 5 mit Notizen.

| Modell | Zeit | gesetzt | Strukturfehler | Regelverstöße |
| --- | --- | --- | --- | --- |
| `gemini-3.6-flash` (default) | 21,7 / 25,9 s | 24/24 | 0 | 0 |
| `gemini-3.6-flash` `low` | 6,6 / 7,2 / 14,8 s | 24/24 | 0 | 0 |
| `gemini-3.5-flash-lite` (default) | 3,6 / 3,7 / 4,2 s | 24/24 | 0 | 0 |
| `gemini-3.5-flash-lite` `medium` | 8,9 / 9,2 s | 24/24 | 0 | 0 |

Harte Korrektheit trennt die Modelle **nicht** — alle vier halten Regeln und
Sitzplatzkennungen fehlerfrei ein. Der Unterschied liegt in der Freitext-Notiz:

| Modell | Notiz „reizarm, ungern am Fenster" beachtet | Begründungslänge |
| --- | --- | --- |
| `gemini-3.6-flash` `low` | 3 von 3 | 34–36 Zeichen |
| `gemini-3.5-flash-lite` | 1 von 3 | 22–27 Zeichen |

Flash-Lite setzte den Schüler in zwei von drei Läufen genau ans Fenster. Das ist
bei n = 3 kein Beweis, paßt aber zur Modellbeschreibung („simple data
extraction"). Da die Notizfunktion gerade wegen solcher Nuancen existiert, fällt
die Wahl auf `gemini-3.6-flash` mit `thinking_level: "low"` — zum zehnfachen
Preis von Flash-Lite, der bei diesem Volumen trotzdem nicht wehtut.

Kosten pro Aufruf, Paid Tier ($1,50 je 1M Eingabe, $7,50 je 1M Ausgabe
einschließlich Denk-Token):

```
1561 Eingabe-Token          × $1,50/1M  =  $0,0023
1377 Ausgabe + 980 gedacht  × $7,50/1M  =  $0,0177
                                           ────────
                                           $0,020   ≈ 1,9 Cent
```

## Bewusst getroffene Entscheidungen, die unbequem sind

**Klarnamen gehen mit.** Vorname, Nachname, Merkmale und Notizen werden
unpseudonymisiert an Google übertragen. Eine Pseudonymisierung (`S1` … `S24`,
Rückübersetzung nur lokal) wurde vorgeschlagen, mit dem Hinweis, daß ADHS und
Schwerhörigkeit Gesundheitsdaten nach Art. 9 DSGVO sind und es hier um
Minderjährige geht. Die Entscheidung gegen die Pseudonymisierung ist bewusst
gefallen und liegt beim Betreiber, nicht beim Code.

**Nur bezahltes Kontingent.** Das kostenlose Kontingent ist für Anwendungen im
EWR vertraglich ausgeschlossen (*„You may use only Paid Services when making API
Clients available to users in the European Economic Area"*), und Google nutzt
dort eingereichte Inhalte zum Training samt menschlicher Sichtung. Läuft die
Abrechnung aus, darf das Feature nicht auf das kostenlose Kontingent
zurückfallen — es muss abschalten.

**Offene Registrierung bleibt vorerst.** Daß jeder mit der URL ein Konto anlegen
kann, ist ein eigenes Thema und wurde hier nur zum Anlass genommen, die Deckel
nicht wegzulassen.

Damit hängt eine Vertragsfrage zusammen, die vor der Freischaltung von PR 2 zu
klären ist: Die Gemini Additional Terms verlangen ein Mindestalter von 18 Jahren
und untersagen API-Clients, die sich an Minderjährige richten *oder
voraussichtlich von ihnen benutzt werden*. Die App richtet sich an Lehrkräfte,
aber die offene Registrierung stellt das nicht sicher. Entweder die
Registrierung wird geschlossen, oder die KI-Funktion bleibt einem freigegebenen
Personenkreis vorbehalten — die Freigabeliste, die beim Rate-Limit verworfen
wurde, kommt hier als Zugangsfrage zurück.

**Entschieden am 2026-08-01:** Der Betreiber nimmt das Risiko bewusst an. Die
App bleibt ein Werkzeug für eine Handvoll namentlich bekannter Lehrkräfte; eine
technische Altersprüfung wird nicht gebaut. Der Punkt wurde zweimal vorgelegt
und zweimal so entschieden. Er ist damit erledigt, nicht übersehen — wer die
App später breiter öffnet, holt ihn zurück.

## Was außerhalb des Codes zu erledigen ist

1. Abrechnung im Google-Projekt aktiv halten.
2. Auftragsverarbeitung mit Google und schulische Freigabe für die Verarbeitung
   von Gesundheitsdaten Minderjähriger bei einem Anbieter außerhalb der EU.
3. Den Merkmalskatalog gegen den tatsächlichen Schulalltag gegenlesen — er ist
   ein Vorschlag, kein Ergebnis.
