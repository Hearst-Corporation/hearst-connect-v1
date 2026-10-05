# Runtime Doctrine

## Runtime Stack

- Next.js 16 application runtime
- React 19 rendering layer
- Tailwind v4 and `@hearst/ui` design system package
- Server-side data reads by default

## Runtime Readiness Signals

Runtime configuration health is evaluated from:

- `HEARST_API_URL` for backend reachability and public probe capability
- `AUTH_SECRET` for secure session sealing and login readiness

If one is missing or invalid, UI surfaces must report named configuration gaps instead of fabricating fallback values.

## Current Operational State

- Connect front is intentionally outside Operations Platform handoff architecture.
- Repository scripts provide `dev`, `start`, `check`, `graph:ui`, `graph:check`, `dashboard:open`, and `sonar`.
- There is no lint script and no test script declared in `package.json`.
- End-to-end specs exist in `e2e/` but are not wired to a repository script gate.

## Deployment Footprint

- Front deployment target is Vercel project `hearst-connect-v1`.
- Main backend target is Railway-hosted `hearst-connect-backend`.
- Repository has no committed `vercel.json`, Dockerfile, or CI workflow.

## Security Runtime Notes

- CSP keeps browser `connect-src` at `self`.
- Backend calls stay server-side and use per-call request ids.
- Session secret and backend token never belong to client bundles.
