# Hearst Connect

Front Next.js — vitrine marketing, connexion, console d'administration.
UI : kit **Catalyst** (Tailwind Plus) + dataviz **richart** (Recharts).

**Landing `/`** — vitrine marketing (HC-LANDING-REFRESH-027, 2026-08-08). Structure Tailwind Plus
adaptée Hearst : navbar → hero split (copy + preview `console-preview.png`) → domaines → 3 features →
plateforme (6 points) → doctrine 3 piliers → CTA → footer. Preview unique en hero (`ConsolePreviewShot`,
`aspect-16/10`). Contenu centralisé dans `landing-content.ts` ; CTAs partagés dans `marketing-cta.tsx`.
Server component (`landing-page.tsx`) — pas de scroll hijack, pas de métriques inventées.
Captures : `pnpm e2e` (Playwright, port 4600) ou QA manuelle sur `http://localhost:4600`.

Shell : `src/app/(marketing)/layout.tsx` — `SiteHeader` (sticky, blur, filet bas) · `main` · `SiteFooter` · `bg-console-app`.
Composition : `src/app/(marketing)/page.tsx` → `src/components/marketing/landing-page.tsx`.

| # | Section | Fichier |
|---|---------|---------|
| 1 | **Hero** split (copy + preview) | `landing-page.tsx` |
| 2 | **Domaines** (badges Access · Vaults · …) | `landing-page.tsx` |
| 3 | **Features** (3 colonnes) | `landing-page.tsx` · `section-intro.tsx` |
| 4 | **Plateforme** (6 points) | `landing-content.ts` · `landing-page.tsx` |
| 5 | **Doctrine** (3 piliers) | `landing-page.tsx` |
| 6 | **CTA** → `/login` · `/register` | `closing-cta.tsx` |

## Architecture

| Couche | Cible |
|---|---|
| **Ce repo** | Vercel **`hearst-connect-v1`** — jamais `hearst-connect` / `app.hearst.app` |
| **Backend** | GitHub `Hearst-Corporation/hearst-connect-backend` (`main`) |
| **API prod** | `https://hearst-connect-backend-production-1da1.up.railway.app` via `HEARST_API_URL` |
| **Déploiement back** | Push `main` → Railway |

**GPU1 interdit** pour ce produit (pas de SSH, pas de `connect-api.hearst.app`).

## Démarrer

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev                    # http://localhost:4600
```

Six variables serveur — voir `.env.example`, porte unique `src/lib/env.ts`. Jamais de `NEXT_PUBLIC_*` pour les secrets.

## Language (2026-08-08)

Product UI is **English-only** (`lang="en"`). Routes use English paths (`/admin/compliance`, `/admin/product`, `/account`). User hub is a single `/account` command center (`src/features/user-dashboard/`). Legacy French URLs (`/espace/*`, `/espace-utilisateur`, legacy `/account/*` subpaths) redirect permanently via `next.config.mjs`.

## Console admin — reference (2026-08-08)

| Route | Role |
|---|---|
| `/admin` | **Dashboard** — KPIs, portfolio exposure, rebalancing, activity, market, vaults, recent clients, data health |

**Dashboard truth contract** (`src/lib/admin-dashboard/`): backend `Resolved` status and provenance preserved in `load.ts` (`STALE`/`PARTIAL`/`NOT_CONFIGURED`/`EMPTY` — no automatic LIVE on value presence). Empty lists render as empty, not unavailable. Atomic amounts use overview `asset`/`decimals`. Data health slots keyed by stable backend `key`. Market `NOT_CONFIGURED` keeps local widget state. Gate: `tests/admin/dashboard-truth-contract.test.ts`.
| `/admin/vaults`, `/admin/vaults/[vaultId]` | **Vaults** — AUM, deployed, available capital, strategies, exposure, target, drift, last rebalance, recent activity (no source panels; Service hub for coverage) |
| `/admin/clients`, `/admin/compliance`, `/admin/operations`, `/admin/series-1`, `/admin/runtime`, `/admin/product` | Business pages — same `AdminPageHeader` pattern |
| `/admin/api-explorer`, `/admin/keeper`, `/admin/client-simulator/new`, `/admin/client-simulator/[id]` | Service hub tools — probes, Keeper actions, client simulator |

**Clients** (`/admin/clients`) — searchable directory (exposure, vault relationships, Som KYC read-only, created/last activity). Rich read: `GET /api/v1/admin/clients/recent`; thin fallback: `GET /api/v1/clients`. No “Create client” — `POST /api/v1/admin/users` creates an application user, not a client record.

**Profile** (`/admin/profile`) — signed-in administrator session only (name, email, role, identifier, session end). Not an investor/subscription dossier.

**Navigation** (`src/lib/admin-nav.ts`): sidebar **Dashboard · Vaults · Clients · Compliance · Operations**; hubs **Series 1 journal · Product · Service** (Runtime, API explorer, Keeper). Legacy `/admin/conformite` and `/admin/produit` redirect to English routes. **Compliance** kept as Som KYC read-only (distinct from Clients directory).

**Orchestrator HC-ADMIN-CONSOLIDATION-ORCHESTRATOR-023** (2026-08-08): seven scoped branches merged locally — guardrails, dashboard truth, clients/profile (Mission 014 recovered), vaults, compliance, operations, product/service/journal/nav. Gates: `pnpm check` + `next build` green on integrated `main`.

**Mission HC-BROWSER-PRODUCTION-PARITY-024** (2026-08-08): authenticated browser QA on local `main` (all admin routes × viewports including reduced-motion); hydration fixes on dashboard motion widgets and Series 1 table filters. Drift history **not wired** — production `GET /api/v1/rebalancing/history` responds 200 but payload is `UNAVAILABLE` (`db_error`); contract not ready for UI. Vercel prod may lag GitHub `main`. HEAD regression cleanup (`95172b` vault chart): English + no-zinc + hooks + endpoint test — re-validated browser QA green.

**Action boundary**: `src/components/actions/` (Catalyst buttons + disabled/loading states).

Open the dashboard locally (Chrome, signed in, dark theme):

```bash
E2E_PORT=4600 node scripts/open-dashboard-chrome.mjs
```

## Structure

```
src/
├── app/
│   ├── (marketing)/            landing `/` + layout header/footer
│   ├── (auth)/                 login / register
│   ├── account/                hub user `/account` (+ legacy subpath redirects)
│   ├── espace*/                legacy FR → `/account`
│   └── admin/                  routes console
├── components/
│   ├── catalyst/               primitives Catalyst
│   ├── marketing/              landing shell (content, CTAs, preview, layout)
│   ├── admin/                  page-header, hero-kpi, surfaces + dashboard/
│   ├── actions/                boutons d'action partagés
│   ├── charts/                 richart + cartesian
│   └── compositions/           panels, SectionCard… (StatGrid hors hero)
├── features/
│   ├── admin-dashboard/        tableau de bord `/admin`
│   └── user-dashboard/         command center `/account`
└── lib/
    ├── backend/                callBackend, endpoints
    └── vaults/                 Availability, model, registry, overview
```

## Données

Aucune donnée inventée : `Availability<T>`, gates `check:mocks` et `check:truthful-data`.
45 endpoints dans `src/lib/backend/endpoints.ts`. Spec mapping : `docs/ENDPOINT-MAPPING.md`.

## Commandes

```bash
pnpm check               # next build && tsc --noEmit
pnpm e2e                 # Playwright (si installé)
pnpm exec next build     # build prod
```

Déploiement Vercel prod : `vercel --prod` (projet `hearst-connect-v1`).

## Documentation

| Fichier | Rôle |
|---|---|
| `docs/ENDPOINT-MAPPING.md` | Contrat backend → front |
| `docs/PASSATION-AGENT.md` | Reprise opérationnelle (Railway, Vercel, priorités) |

Point de reprise : **`main`** — landing `/` = hero Tailwind Plus + domaines + features + plateforme + doctrine + CTA (tokens `console-*` / `accent-*`, assets `public/brand/`).
