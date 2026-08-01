# ADR-0005: Dateibasierte Routen mit einem Wächtersegment

- Status: **Accepted**
- Datum: 2026-08-01 (rückwirkend festgehalten)
- Betrifft: `src/routes/`

## Kontext

Die Anwendung hat wenige, klar getrennte Seiten: Übersicht, Klassen, Räume,
Sitzpläne, Drucken, Papierkorb, Einstellungen, Anmeldung. Bis auf die Anmeldung
setzt jede eine Sitzung voraus.

Eine Rechteprüfung, die jede Seite einzeln vornimmt, ist so verlässlich wie die
Disziplin beim Anlegen der nächsten Seite.

## Entscheidung

TanStack Start mit dateibasiertem Routing. Die Ordnerstruktur **ist** die
Seitenstruktur:

```
src/routes/
  __root.tsx                          Rahmen
  signin.tsx                          Anmeldung — ohne Sitzung erreichbar
  _authenticated/
    route.tsx                         der einzige Wächter
    index.tsx                         Übersicht
    klassen.index.tsx  klassen.$id.tsx
    raeume.index.tsx   raeume.$id.tsx
    sitzplaene.index.tsx  sitzplaene.$id.tsx  sitzplaene.$id_.drucken.tsx
    papierkorb.tsx     einstellungen.tsx
```

Der Zugang wird an **einer** Stelle bewacht: `_authenticated/route.tsx`. Eine
neue geschützte Seite entsteht durch Ablegen einer Datei in diesem Ordner — sie
ist dadurch geschützt, ohne dass jemand daran denken muss.

`sitzplaene.$id_.drucken.tsx` nutzt den Unterstrich, um aus dem Layout des
Elternsegments auszubrechen: Die Druckansicht trägt keine Navigation.

## Folgen

**Gut.** Vergessene Zugriffsprüfung ist strukturell ausgeschlossen, solange die
Datei im richtigen Ordner liegt.

**Gut.** Wer die Anwendung kennenlernt, liest `src/routes/` und weiß, was es gibt.
Deshalb steht dieser Einstieg in [`CLAUDE.md`](../../CLAUDE.md).

**Teuer.** Dateinamen tragen Bedeutung. `$id` gegen `$id_`, `.index` gegen
Verzeichnis — Tippfehler äußern sich als merkwürdiges Layout, nicht als
Fehlermeldung. Die generierte Routenbaum-Datei gehört nicht von Hand bearbeitet.

**Regel.** Neue geschützte Seiten kommen nach `_authenticated/`. Wer eine Seite
daneben legt, hebt den Schutz auf, ohne es zu sehen.

## Verworfen

*Zentrale Routentabelle.* Ein Ort mehr, der zur Ordnerstruktur passen muss.

*Prüfung je Seite.* Funktioniert, bis jemand eine Seite hinzufügt und die Prüfung
vergisst. Genau dieser Fall soll nicht möglich sein.
