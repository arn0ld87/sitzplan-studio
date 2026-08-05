# Domain Docs

How the engineering skills should consume this repo's domain documentation when
exploring the codebase. This is a **single-context** repo.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/decisions/`** — read ADRs that touch the area you're about to work in.
  Note the path: this repo keeps its ADRs under `docs/decisions/`, not the
  `docs/adr/` the skills' default template assumes.

If any of these files don't exist, **proceed silently**. Don't flag their absence;
don't suggest creating them upfront. The `/domain-modeling` skill (reached via
`/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when
terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT.md
├── docs/decisions/
│   ├── 0001-supabase-als-backend.md
│   └── 0002-dokumenten-jsonb-fuer-geometrie.md
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal,
a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift
to synonyms the glossary explicitly avoids.

Domain terms in this repo are German (`sitzregeln`, `raster_cm`,
`canvas_document`, `sitzplatz`); [`src/data/types.ts`](../../src/data/types.ts)
is the working reference until `CONTEXT.md` exists.

If the concept you need isn't in the glossary yet, that's a signal — either
you're inventing language the project doesn't use (reconsider) or there's a real
gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than
silently overriding:

> _Contradicts ADR-0003 (eingefrorene Raumkopie im Plan) — but worth reopening because…_
