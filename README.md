# Hearst Connect (front)

Next.js 16, React 19, Tailwind v4, the Catalyst kit (vendored in `src/components/catalyst/`) and Recharts.

The front of Hearst Connect: a public landing page, a sign-in screen, and the administration console for the
Connect vaults (portfolio, vaults, clients, mining, compliance, operations, keeper actions), plus an `/account` view
of the signed-in account's own position. It reads everything from its own backend, `hearst-connect-backend`.

Hearst Connect is set aside for the first go-live. It is not linked to the Operations Platform: it has no `/handoff`
route, does not read `hearst-platform-backend`, does not check the `connect` product entitlement, and no Platform
customer maps to a Connect account. Hearst App's `/enter` knows a `connect` destination, but it stays unavailable
unless Hearst App's `HEARST_CONNECT_URL` is set, and even then this front has no `/handoff` to receive the code.
Connect has its own accounts and its own email + password sign-in.

## Run it

```bash
cp .env.example .env.local     # then set the variables below
pnpm install --frozen-lockfile
pnpm dev                       # http://localhost:4600
```

| Command | What |
|---|---|
| `pnpm dev` | Dev server on 4600 |
| `pnpm start` | Production server on 4600 (after a build) |
| `pnpm check` | `next build && tsc --noEmit`: the build and the typecheck |
| `pnpm graph:ui` | Rebuilds `docs/architecture/ui-graph.json` and `ui-graph.mmd` |
| `pnpm graph:check` | Says whether that graph is current, stale or invalid (does not fail) |
| `pnpm dashboard:open` | Opens Chrome on `/admin` through the quick sign-in button (needs `DEV_QUICK_LOGIN_*`) |
| `pnpm sonar` | SonarQube scan (needs `SONAR_TOKEN` and `SONAR_HOST_URL`) |

There is no lint or test script. `e2e/` holds three Playwright specs (`access-control`, `audit-closure`,
`veracity`); no Playwright config or script runs them, and `tsconfig.json` excludes the folder.

## Environment

Every variable is read on the server; none is `NEXT_PUBLIC_`. `src/lib/env.ts` checks `HEARST_API_URL` and
`AUTH_SECRET` and reports a missing one by name ("not configured" on screen, one warning in the log), never with a
fallback value.

| Variable | What | Local default |
|---|---|---|
| `HEARST_API_URL` | Base URL of `hearst-connect-backend`, the only data source and the sign-in authority. `http` is accepted only for `localhost` / `127.0.0.1`. Unset: no request goes out, sign-in is off. | none; `http://localhost:4610` for the local backend (`.env.example` holds the Railway production URL) |
| `AUTH_SECRET` | Seals the `hearst_session` cookie (32 characters minimum, e.g. `openssl rand -hex 32`). Unset or short: sign-in is off. | none |
| `MINING_NOTE_API_URL` | Origin of the mining-note engine (`hearst-vault-v2`, `nextjs-vault-server`), used by `/admin/mining-note`. | `http://localhost:3105` in dev. In production no rewrite is registered without it, but the server-side reads in `src/lib/mining-note.ts` still fall back to `http://localhost:3105` |
| `DEV_QUICK_LOGIN_EMAIL`, `DEV_QUICK_LOGIN_PASSWORD` | A real backend account for the "Quick owner sign-in (local dev)" button. Ignored when `VERCEL_ENV=production`, or `NODE_ENV=production` outside Vercel, unless `DEMO_BACKEND=1`. | none |
| `DEMO_BACKEND` | `1` turns on `/api/demo-backend/*`, a fictional backend served by this app (404 otherwise), and allows the quick sign-in in production. | unset |

`NODE_ENV` and `VERCEL_ENV` are read too (production guards, the cookie's `secure` flag). The helper scripts read
`E2E_PORT` (`dashboard:open`, default 4600), `SONAR_TOKEN` / `SONAR_HOST_URL` (`sonar`) and `HEARST_BACKEND_DIR`
(`scripts/seed-ui-demo.mjs`, default `../hearst-connect-backend`). `scripts/probe-admin-plug.mjs` reads `.env` and
`.env.local` itself and probes the main admin routes with `DEV_QUICK_LOGIN_*`, or `ADRIEN_OWNER_EMAIL` /
`ADRIEN_OWNER_PASSWORD` when those are empty; the app never reads `ADRIEN_OWNER_*`.

## Sign in locally

Connexion locale : `http://localhost:4600/login`, `adrien@hearstcorporation.io` / `Adrien0334$$`, the admin
`hearst-connect-backend`'s `pnpm dev` seeds on a local database (with `HEARST_API_URL=http://localhost:4610` and an
`AUTH_SECRET` here).

Sign-in is email + password. The login form's server action posts to `POST {HEARST_API_URL}/api/v1/auth/login` and
expects `{ token, tokenType, expiresAt, user: { id, email, role } }`. Only `role: admin` opens a session (shown as
"Space owner"); an `investor` is refused with "This account does not have access to the admin console". The bearer
token is sealed with AES-256-GCM (key derived from `AUTH_SECRET`) into the `hearst_session` cookie: httpOnly,
`SameSite=Lax`, `Secure` in production, and it expires with the backend token. It never reaches the browser.

To sign in on this machine, one of:

- **Local backend.** Run `hearst-connect-backend` with `pnpm dev` (port 4610; it needs its own `.env` and a Postgres
  database, see that repo's `docs/local-development.md`) and set `HEARST_API_URL=http://localhost:4610`. The first
  admin account is created on that backend with its `OWNER_BOOTSTRAP_SECRET` (that repo's `docs/authentication.md`,
  "Owner bootstrap"). The backend's `SESSION_SIGNING_KEY` is the backend's own; this front does not need it.
- **Demo backend.** Set `DEMO_BACKEND=1` and `HEARST_API_URL=http://localhost:4600/api/demo-backend`, then sign in
  with the mock admin account defined in `src/app/api/demo-backend/mock-data.js`. Every value it serves is invented.

With `DEV_QUICK_LOGIN_*` set, the sign-in screen shows a quick button that runs the same backend login with those
credentials, without typing them.

This is not the Hearst Platform's email-code sign-in: a Platform session (`ha_session`, `pa_session`…) does not open
Connect, and signing out of Connect only deletes its own cookie.

## Who lands here and what they may do

- `/`, `/login` and `/register` are public. `/register` opens no account: it says access is by invitation and links
  to an email to `connect@hearstcorporation.io`.
- `/admin/**`, `/account` and the legacy `/espace/**` check the session in their server layout. No cookie sends to
  `/login?reason=required`; a cookie that fails to decrypt or has expired sends to `/login?reason=expired`. There is no
  middleware.
- Since only backend admins can sign in, everyone signed in is an administrator: they see the whole console, and
  `/account` shows that account's own investor view (portfolio, movements, deposit request).
- Before each backend call, `src/lib/backend/client.ts` checks the route's level in the registry (`public`, `session`,
  `admin`) against the session, then sends `Authorization: Bearer <token>`. The backend enforces its own roles again.
- Actions with side effects are POSTs to the backend: `/admin/keeper`, "Rebalance now", the indexer trigger and the
  mining "report" button ask for a confirmation first; the mining approve, trigger-calculation and pay-electricity
  buttons post on the click.

## Pages

| Route | What |
|---|---|
| `/` | Landing page: hero, console domains, features, platform, "product doctrine", closing call to action |
| `/login`, `/register` | Sign-in; invitation request |
| `/admin` | Dashboard: KPIs, market, portfolio exposure, rebalancing and alerts, recent activity, rebalancing drift, activity series |
| `/admin/vaults`, `/admin/vaults/[vaultId]` | Vaults: AUM, strategies, exposure vs target, drift, history; "Rebalance now" |
| `/admin/clients` | Client directory (exposure, vault relationships, KYC, activity) |
| `/admin/client-simulator/new`, `/admin/client-simulator/[id]` | Creates an application user (`POST /api/v1/admin/users`); reads one client |
| `/admin/mining` | Mining reads, calculations and distributions; approve, trigger, report and pay actions |
| `/admin/mining-note` | Note simulations from the mining-note engine (presets, Monte-Carlo, mining vs holding) |
| `/admin/compliance` | KYC, read only |
| `/admin/operations` | Rebalancing operations and history, indexer status |
| `/admin/series-1` | Series 1 event journal with filters |
| `/admin/product` | Factsheet, BTC reserve, mining, backtests |
| `/admin/runtime` | Service: health, readiness, runtime, data coverage, indexer trigger |
| `/admin/api-explorer` | Every registered backend route with its method, access level and a curl |
| `/admin/keeper` | Keeper actions |
| `/admin/profile` | The signed-in administrator's session |
| `/account` | The signed-in account's position, movements, BTC view and deposit form |

Old addresses redirect: `/admin/dashboard` → `/admin`; `/admin/btc`, `/admin/backtest`, `/admin/produit`,
`/admin/administration/produit` → `/admin/product`; `/admin/conformite` → `/admin/compliance`; `/admin/vault` →
`/admin/vaults`; `/espace/**`, `/espace-utilisateur` and `/account/{dashboard,bitcoin,activity,profile}` → `/account`
(`next.config.mjs` and the pages themselves).

## Backends it reads

| Backend | Variable | How |
|---|---|---|
| `hearst-connect-backend` (4610 locally) | `HEARST_API_URL` | Server side only, through `callBackend` (`src/lib/backend/client.ts`): 10 s timeout, the backend's `{ data, meta }` status passed through as is, an error shown as a named state, never a substitute value. One JSON log line per call, without token or body. The 55 routes it knows are in `src/lib/backend/endpoints.ts`. |
| `hearst-vault-v2` mining-note engine (3105 locally) | `MINING_NOTE_API_URL` | Server components call the origin directly; the browser calls `/api/mining-note/*`, `/api/mining/*` and `/api/simulation/*`, which `next.config.mjs` rewrites to it. |

The backend is never called from the browser, so the Content-Security-Policy keeps `connect-src 'self'`.
`next.config.mjs` also sets the security headers (CSP, `X-Frame-Options`, HSTS in production).

## Layout

```
src/
├── app/            routes: (marketing) /, (auth) login + register, admin/**, account, api/demo-backend
├── components/     catalyst/ (vendored kit), admin/, marketing/, charts/, compositions/, actions/, layout/, vaults/
├── features/       admin-dashboard/, admin-runtime/, user-dashboard/ (/account)
└── lib/            env.ts, session.ts, auth.ts, actions.ts, backend/ (client, registry, auth, keeper…),
                    admin-dashboard/, vaults/, mining/, mining-note.ts
```

## Deployment

The repository defines none: no `vercel.json`, Dockerfile or CI workflow (`.vercel/` is gitignored).

## Docs

| File | What |
|---|---|
| `docs/ENDPOINT-MAPPING.md` | Backend routes → console pages |
| `docs/BACKEND-ALIGNMENT-2026-09-08.md` | Gaps measured against the real backend and the fixes they need |
| `docs/PASSATION-AGENT.md` | Hand-over notes: Railway backend, EVM fork, vault, what remains |
| `docs/architecture/UI-GRAPH.md` | The generated UI graph |
| `src/components/catalyst/VENDOR.md` | What is vendored from Catalyst |
