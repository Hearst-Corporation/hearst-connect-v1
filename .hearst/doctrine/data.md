# Data Doctrine

## Primary Data Source

The canonical business source is `hearst-connect-backend` via `HEARST_API_URL`.

- Calls are server-side through `src/lib/backend/client.ts`
- Endpoint catalog is centralized in `src/lib/backend/endpoints.ts`
- Unknown endpoint usage is blocked by registry lookup

## Transport And Exposure

- Frontend sends backend auth as `Authorization: Bearer <token>` from server session
- Backend base URL is never exposed through `NEXT_PUBLIC_` variables
- Browser traffic remains same-origin; direct browser calls to backend are not required

## Secondary Engine

`MINING_NOTE_API_URL` is used for mining-note numeric workloads.

- Browser calls use same-origin rewrites (`/api/mining-note/*`, `/api/mining/*`, `/api/simulation/*`)
- Server components can call the configured mining-note origin directly

## State Integrity

- Missing or invalid config is represented as named not-configured states
- Unreachable upstream is represented as unavailable states
- No synthetic business fallback values are injected in normal runtime paths

## Demo Isolation

- Demo backend routes exist behind `DEMO_BACKEND=1`
- Demo payloads are fictional and non-canonical
- Demo paths are not a substitute for production data truth
