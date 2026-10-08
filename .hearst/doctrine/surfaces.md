# Surface Doctrine

## Public Surfaces

- `/` marketing landing for Hearst Connect
- `/login` email and password sign-in
- `/register` invitation request surface

## Session-Protected Surfaces

- `/admin/**` administration console (dashboard, vaults, clients, mining, runtime, operations, keeper, API explorer)
- `/account` signed-in account position and movements
- `/espace/**` and legacy account paths redirect to `/account`

## Access Enforcement Shape

- Session checks are enforced server-side in layouts and server actions.
- No middleware layer is used for auth gating in this repo.
- Backend route auth levels (`public`, `session`, `admin`) are declared in `src/lib/backend/endpoints.ts`.

## Route Stability Notes

- Legacy aliases redirect to canonical routes in `next.config.mjs`.
- `/admin/api-explorer` is a declared operational surface used to inspect registry-backed endpoints.
