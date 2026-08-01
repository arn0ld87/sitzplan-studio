# Runbook: Branch, PR, Merge

## Kein History-Rewrite auf Gepushtem

Verboten auf allem, was gepusht ist:

- `git push --force` und `--force-with-lease`
- `git rebase` auf `main` oder gepushten Branches
- `git commit --amend` nach dem Push
- `git reset --hard` auf Gepushtes

Gepushte Commits sind nicht mehr allein deine: offene Pull Requests hängen an
ihren SHAs, und die Review-Bots kommentieren Zeilen, die es nach einem Rewrite
nicht mehr gibt. Ein falscher Commit wird mit einem weiteren Commit korrigiert,
nicht wegretuschiert.

Bis Juli 2026 war die Regel noch schärfer, weil Lovable `main` in beide
Richtungen synchronisierte. Der Sync ist gekappt — die Regel bleibt, ihre
Begründung ist nur eine mildere geworden.

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

## Wenn `main` unter dem Branch weitergelaufen ist

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
