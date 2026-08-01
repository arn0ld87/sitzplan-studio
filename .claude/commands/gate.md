---
description: Gate vor dem Push — typecheck, lint, test, build sequentiell
allowed-tools: Bash(bun run *), Bash(npx tsc *)
---

Führe das Gate aus [`docs/runbooks/pre-push-gate.md`](../../docs/runbooks/pre-push-gate.md)
aus — sequentiell, in dieser Reihenfolge:

```bash
bun run typecheck && bun run lint && bun run test && bun run build
```

Regeln:

- **Kein Auto-Fix-Loop.** Fällt ein Schritt, benenne die Ursache und halte an.
  Nicht wiederholt raten, bis es zufällig grün wird.
- **Keine Regel abschalten**, um einen Schritt zu bestehen. Wenn eine
  ESLint-Regel im Weg steht, ist meist der Code das Problem.
- **Bericht knapp**: welcher Schritt fiel, welche Datei, welche Zeile. Bei
  vollständigem Durchlauf ein Satz.

Bei Schemaänderungen zusätzlich die vier Punkte aus dem Runbook prüfen:
Wegwerf-Instanz, Typen neu generieren, RLS-Policies vollständig, `deleted_at`
vorhanden.
