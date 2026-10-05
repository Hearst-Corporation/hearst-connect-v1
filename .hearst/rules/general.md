# General Rules

## Doctrine Handling

- Keep repository doctrine under `.hearst/` only.
- Keep pointer files short and doctrine-free.
- Update doctrine files when runtime, auth, data contracts, or route topology changes.

## Integrity Rules

- Do not represent demo payloads as production truth.
- Do not add silent data fallbacks that hide upstream failure.
- Do not bypass endpoint registry boundaries for backend calls.

## Scope Rules

- Keep Connect front assumptions separate from Operations Platform assumptions.
- Treat `/handoff` as absent until a dedicated feature mission defines and implements it.
- Preserve independent Connect session semantics unless a tenancy change is explicitly approved.
