# AGENTS.md

Arbeitsanweisungen für KI-Agenten in diesem Repository. Gilt für alle Agenten
(Claude Code, Codex, Jules, Lovable). Claude-Code-Spezifisches steht zusätzlich
in [`CLAUDE.md`](CLAUDE.md).

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Dokumentationsquellen

| Frage | Quelle |
| --- | --- |
| Was ist das Produkt, wie starte ich es? | [`README.md`](README.md) |
| Wie hängt das System zusammen? | [`docs/architecture.md`](docs/architecture.md) |
| Warum ist etwas so gebaut? | [`docs/decisions/`](docs/decisions/) — ADRs |
| Wie prüfe ich vor dem Push? | [`docs/runbooks/pre-push-gate.md`](docs/runbooks/pre-push-gate.md) |
| Wie kommt Code nach `main`? | [`docs/runbooks/pr-workflow.md`](docs/runbooks/pr-workflow.md) |
| Wie darf es aussehen? | [`docs/designsystem.md`](docs/designsystem.md) — **verbindlich** |
| Wie sieht das Datenmodell aus? | `supabase/migrations/*.sql` |
| Welche Typen gelten in der App? | [`src/data/types.ts`](src/data/types.ts) |
| Generierte DB-Typen | `src/integrations/supabase/types.ts` — **nicht von Hand ändern** |

## Projekt

Sitzplan Studio: Web-App für Lehrkräfte zur Verwaltung von Klassen, Räumen und
Sitzplänen.

- **Stack:** TanStack Start (SSR) · React 19 · TypeScript 5.8 · Tailwind 4 ·
  Radix · Supabase (Postgres + Auth + RLS) · Vite 8 · Bun
- **Sprache:** Oberfläche, Routen und DB-Bezeichner sind deutsch
  (`klassen`, `raeume`, `sitzplaene`, `sitzregeln`, `schueler`).
  Kommentare und Commit-Messages ebenfalls deutsch.
- **Struktur:**
  - `src/routes/_authenticated/` — geschützte Seiten, Auth über `route.tsx`
  - `src/components/plan/RoomPlan.tsx` — die SVG-Zeichnung, Kernstück der App
  - `src/components/ui-kit/` — projekteigene Bausteine, **hier zuerst suchen**
  - `src/components/ui/` — generierte shadcn-Primitives, nur bei Bedarf anfassen
  - `src/store/app.tsx` — Anwendungszustand
  - `src/integrations/supabase/` — Client (Browser + Server), Auth-Middleware

## Verbindliche Arbeitsweise

1. **Designsystem lesen, bevor UI entsteht.** `docs/designsystem.md` ist fertig
   entworfen. Farben, Radien, Schatten, Typografie und Abstände sind exakt
   vorgegeben. Keine eigenen Werte erfinden, keine Tailwind-Defaults einstreuen.
2. **Bestehende Bausteine wiederverwenden.** Vor jeder neuen Komponente
   `src/components/ui-kit/` prüfen. Kein zweiter Button, kein zweiter Chip.
3. **Datenmodell nur über Migrationen ändern.** Neue Datei unter
   `supabase/migrations/` mit Zeitstempel-Präfix. Jede neue Tabelle bekommt
   `user_id`, `created_at`, `updated_at`, `deleted_at`, den Trigger
   `set_updated_at` **und** vier RLS-Policies (select/insert/update/delete) gegen
   `auth.uid()`. Eine Tabelle ohne RLS ist ein Sicherheitsvorfall.
4. **Soft-Delete respektieren.** Es wird `deleted_at` gesetzt, nicht gelöscht.
   Jede Abfrage auf Nutzdaten filtert `deleted_at IS NULL`.
5. **Barrierefreiheit ist Teil der Definition of Done.** Ziel WCAG 2.2 AA:
   Tastaturbedienung gleichwertig zu Drag-and-drop, `aria-label` an
   Icon-only-Buttons, Zustände über Form **und** Farbe, sichtbarer Fokusstil.
6. **Vor dem Abschluss das Gate durchlaufen:** `bun run typecheck`,
   `bun run lint`, `bun run test`, `bun run build` — sequentiell, jeder Schritt
   sauber, kein Auto-Fix-Loop. Ablauf und Sonderfälle:
   [`docs/runbooks/pre-push-gate.md`](docs/runbooks/pre-push-gate.md).
   Wer `src/data/` anfasst, ergänzt die Tests dort, statt sie anzupassen, bis
   sie wieder grün sind.
7. **Kleine Änderungen bleiben klein.** Kein ungefragter Refactor, keine
   Umbenennung großer Flächen, keine Abhängigkeit ohne Begründung.
8. **Widersprich, wenn eine Anforderung dem Designsystem, dem Datenschutz oder
   der RLS widerspricht.** Erst benennen, dann Alternative vorschlagen, dann auf
   Entscheidung warten.

## Verboten

- `git push --force`, Rebase oder Amend auf bereits gepushten Commits
  (zerstört die Lovable-Historie).
- `--no-verify` oder `--no-gpg-sign` ohne ausdrückliche Anweisung.
- Service-Role-Key, echte Schülerdaten oder sonstige Geheimnisse im Repo,
  in Logs oder in Commit-Messages.
- Dark Mode, Farbverläufe, Glassmorphism, Violett/Indigo, Emojis als Icons,
  Hero-Bereiche in der App, `window.confirm`.
- Rot für Auswahl oder Fokus. Rot ist ausschließlich Löschen und Fehler;
  Auswahl und Fokus sind Petrol `#2F5D73`.
- Mehr als **eine** Primäraktion (Terrakotta `#A8501F`) pro Ansicht.
- Handänderungen an `src/routeTree.gen.ts` und
  `src/integrations/supabase/types.ts` — beide sind generiert.
- Platzhalter- oder Fantasiedaten in die Datenbank schreiben.

## Referenzen

- Produktüberblick, Schnellstart, Status: [`README.md`](README.md)
- Architektur und Datenfluss: [`docs/architecture.md`](docs/architecture.md)
- Architekturentscheidungen: [`docs/decisions/`](docs/decisions/)
- Runbooks: [Gate](docs/runbooks/pre-push-gate.md) · [PR-Workflow](docs/runbooks/pr-workflow.md)
- Gestaltung (SSoT): [`docs/designsystem.md`](docs/designsystem.md)
- Claude Code: [`CLAUDE.md`](CLAUDE.md)
- Lovable-Projekt: https://lovable.dev/projects/6f249ae9-eb8e-40db-8f19-9d697518a3df
