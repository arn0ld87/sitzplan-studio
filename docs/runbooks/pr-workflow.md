# Runbook: Branch, PR, Merge — und Lovable

Dieses Repo hat eine Besonderheit, die jede Git-Gewohnheit schlägt:

> **Lovable synchronisiert `main` in beide Richtungen.**

Was in Lovable passiert, landet in `main`. Was in `main` liegt, sieht Lovable.
Daraus folgt die härteste Regel des Projekts:

## Kein History-Rewrite. Niemals.

Verboten auf allem, was gepusht ist:

- `git push --force` und `--force-with-lease`
- `git rebase` auf `main` oder gepushten Branches
- `git commit --amend` nach dem Push
- `git reset --hard` auf Gepushtes

Wer die Historie umschreibt, zerlegt die Synchronisierung, und Lovable schreibt
einen Stand zurück, den niemand mehr zuordnen kann. Ein falscher Commit wird mit
einem weiteren Commit korrigiert, nicht wegretuschiert.

## Ablauf

```bash
git switch -c feat/kurzer-name        # nie direkt auf main arbeiten
# ... ändern ...
bun run typecheck && bun run lint && bun run test && bun run build
git add -A && git commit -m "feat: was sich fachlich ändert"
git push -u origin feat/kurzer-name
gh pr create --fill
```

Nach dem Merge:

```bash
git switch main && git pull
```

Merge-Strategie ist **Merge oder Squash**, kein Rebase-Merge. Squash ist in
Ordnung, solange es auf der PR-Seite passiert und nicht lokal auf `main`.

## Commit-Nachrichten

Präfix nach Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`),
Rest auf Deutsch, fachlich statt technisch:

```
feat: Papierkorb stellt gelöschte Sitzpläne wieder her
fix: Sitzplatz-IDs bleiben nach Möbeldrehung stabil
docs: ADR zur eingefrorenen Raumkopie
```

Nicht: „Änderungen", „Update", „WIP".

## Wenn Lovable und lokal auseinanderlaufen

Erst `git pull` auf `main`, dann den eigenen Branch **mergen**, nicht rebasen:

```bash
git switch main && git pull
git switch feat/kurzer-name
git merge main          # nicht: git rebase main
```

Konflikte in generierten Dateien (Routenbaum, Supabase-Typen) werden nicht von
Hand gelöst, sondern neu erzeugt.

## Vor dem Push immer

[Runbook: Gate vor dem Push](pre-push-gate.md) oder kurz `/gate`.
