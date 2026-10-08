# Open Decisions

## HC-OD-001 Demo Backend Governance

Status: OPEN

Question:
Should `DEMO_BACKEND=1` remain allowed on production-shaped deployments, or be restricted to dedicated demo environments only?

Observed state:

- Demo routes are implemented under `/api/demo-backend/*`.
- Demo responses are fictional and can diverge from real backend contracts.
- Quick login can be enabled when demo mode is active.

Options:

- Keep current behavior and rely on environment discipline.
- Restrict demo mode to explicit non-production targets.
- Remove demo backend from this repository and keep only real backend auth flow.

## HC-OD-002 Mining Note Fallback Origin

Status: OPEN

Question:
Should server-side mining-note reads keep defaulting to `http://localhost:3105` when `MINING_NOTE_API_URL` is unset?

Observed state:

- `next.config.mjs` disables production rewrites when unset.
- `src/lib/mining-note.ts` still has localhost fallback for server reads.

Options:

- Keep fallback for local resilience.
- Fail closed when unset in non-local environments.
- Keep fallback only in explicit development mode.

## HC-OD-003 Connect Handoff Contract

Status: OPEN

Question:
Should Connect stay intentionally without `/handoff`, or should a dedicated handoff protocol be introduced later?

Observed state:

- `/handoff` route is absent in current app routes.
- Connect currently runs as an independent account/auth domain.

Options:

- Keep independent auth domain and no handoff.
- Introduce handoff with one-time code validation and explicit tenancy mapping.
