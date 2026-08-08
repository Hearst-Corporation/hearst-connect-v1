# Hearst Connect

Front Next.js — vitrine marketing, connexion, console d'administration.
UI : kit **Catalyst** (Tailwind Plus) + dataviz **richart** (Recharts).

**Landing `/`** — vitrine marketing (HC-LANDING-REFRESH-027, 2026-08-08). Structure Tailwind Plus
adaptée Hearst : navbar → hero split (copy + preview `console-preview.png`) → domaines → 3 features →
plateforme (6 points) → doctrine 3 piliers → CTA → footer. Preview unique en hero (`ConsolePreviewShot`,
`aspect-16/10`). Contenu centralisé dans `landing-content.ts` ; CTAs partagés dans `marketing-cta.tsx`.
Server component (`landing-page.tsx`) — pas de scroll hijack, pas de métriques inventées.
Captures : `E2E_PORT=4105 node scripts/capture-landing-026.mjs`.

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

**Règles landing** : tokens `console-*` + `accent-*` · `text-white` / `text-white/50` · fond `bg-console-app`.
Interdit dans `src/components/marketing/` : rampes Tailwind structurelles `neutral-*` / `slate-*` / `gray-*`
(test `tests/marketing-no-zinc.test.ts`) et toute utilitaire de la palette interdite (gate `pnpm run check:no-zinc`).
Police : Satoshi uniquement.
Assets : `public/brand/console-preview.png`, `console-glow.png`, lockups SVG — pas d’URLs externes.

## Architecture

| Couche | Cible |
|---|---|
| **Ce repo** | Vercel **`hearst-connect-v1`** — jamais `hearst-connect` / `app.hearst.app` |
| **Backend** | GitHub `Hearst-Corporation/hearst-connect-backend` (`main`) |
| **API prod** | `https://hearst-connect-backend-production.up.railway.app` via `HEARST_API_URL` |
| **Déploiement back** | Push `main` → Railway |

**GPU1 interdit** pour ce produit (pas de SSH, pas de `connect-api.hearst.app`). Détail : `.cursor/rules/30-no-gpu1.mdc`, `CLAUDE.md`.

## Démarrer

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev                    # http://localhost:4105
```

Six variables serveur — voir `.env.example`, porte unique `src/lib/env.ts`. Jamais de `NEXT_PUBLIC_*` pour les secrets.

## Language (2026-08-08)

Product UI is **English-only** (`lang="en"`). Canonical routes use English paths (`/admin/compliance`, `/admin/product`, `/account/*`). Legacy French URLs redirect permanently via `next.config.mjs`. Gate: `pnpm run check:english-ui`.

## Console admin — reference (2026-08-08)

**Target style**: single dashboard at **`/admin`** + business pages aligned on
`AdminPageHeader` — glow + H monogram + title + description + horizontal KPIs (`AdminHeroKpi`, max 4). Dark theme enforced.

| Route | Role |
|---|---|
| `/admin` | **Dashboard** — KPIs, portfolio exposure, rebalancing, activity, market, vaults, recent clients, data health |

**Dashboard truth contract** (`src/lib/admin-dashboard/`): backend `Resolved` status and provenance preserved in `load.ts` (`STALE`/`PARTIAL`/`NOT_CONFIGURED`/`EMPTY` — no automatic LIVE on value presence). Empty lists render as empty, not unavailable. Atomic amounts use overview `asset`/`decimals`. Data health slots keyed by stable backend `key`. Market `NOT_CONFIGURED` keeps local widget state. Gate: `tests/admin/dashboard-truth-contract.test.ts`.
| `/admin/vaults`, `/admin/vaults/[vaultId]` | **Vaults** — AUM, deployed, available capital, strategies, exposure, target, drift, last rebalance, recent activity (no source panels; Service hub for coverage) |
| `/admin/clients`, `/admin/compliance`, `/admin/operations`, `/admin/series-1`, `/admin/runtime`, `/admin/product` | Business pages — same `AdminPageHeader` pattern |

**Clients** (`/admin/clients`) — searchable directory (exposure, vault relationships, Som KYC read-only, created/last activity). Rich read: `GET /api/v1/admin/clients/recent`; thin fallback: `GET /api/v1/clients`. No “Create client” — `POST /api/v1/admin/users` creates an application user, not a client record.

**Profile** (`/admin/profile`) — signed-in administrator session only (name, email, role, identifier, session end). Not an investor/subscription dossier.

**Navigation** (`src/lib/admin-nav.ts`): sidebar **Dashboard · Vaults · Clients · Compliance · Operations**; hubs **Series 1 journal · Product · Service**. Legacy `/admin/conformite` and `/admin/produit` redirect to English routes. **Compliance** kept as Som KYC read-only (distinct from Clients directory). **Service** (`/admin/runtime`) is the only technical observability hub.

**Orchestrator HC-ADMIN-CONSOLIDATION-ORCHESTRATOR-023** (2026-08-08): seven scoped branches merged locally — guardrails, dashboard truth, clients/profile (Mission 014 recovered), vaults, compliance, operations, product/service/journal/nav. Gates: `pnpm check` + `next build` green on integrated `main`.

**Mission HC-BROWSER-PRODUCTION-PARITY-024** (2026-08-08): authenticated browser QA on local `main` (all admin routes × viewports including reduced-motion); hydration fixes on dashboard motion widgets and Series 1 table filters. Scripts: `scripts/capture-browser-parity-024.mjs`, `scripts/probe-production-parity-024.mjs`. Drift history **not wired** — production `GET /api/v1/rebalancing/history` responds 200 but payload is `UNAVAILABLE` (`db_error`); contract not ready for UI. `PROD_AUTODEPLOY: false` — Vercel prod may lag GitHub `main`; probe compares SHAs without deploying. HEAD regression cleanup (`95172b` vault chart): English + no-zinc + hooks + endpoint test — re-validated browser QA green.

**Action boundary**: `src/components/actions/` (Catalyst buttons + disabled/loading states).

Open the dashboard locally (Chrome, signed in, dark theme):

```bash
E2E_PORT=4105 node scripts/open-dashboard-chrome.mjs
```

## Structure

```
src/
├── app/
│   ├── (marketing)/            landing `/` + layout header/footer
│   └── admin/                  routes console
├── components/
│   ├── catalyst/               kit officiel (non modifié sauf link Next)
│   ├── marketing/              landing shell (content, CTAs, preview, layout)
│   ├── admin/                  page-header, hero-kpi, surfaces + dashboard/
│   ├── actions/                boutons d'action partagés
│   ├── charts/                 richart + cartesian
│   └── compositions/           panels, SectionCard… (StatGrid hors hero)
├── features/admin-dashboard/   tableau de bord `/admin`
└── lib/
    ├── backend/                callBackend, endpoints
    └── vaults/                 Availability, registry, pilotage, cockpit
```

## Données

Aucune donnée inventée : `Availability<T>`, gates `check:mocks` et `check:truthful-data`.
44 endpoints dans `src/lib/backend/endpoints.ts`. Spec mapping : `docs/ENDPOINT-MAPPING.md`.

## Commandes

```bash
pnpm check               # gate canonique (typecheck → lint → checks → check:english-ui → test)
pnpm test                # vitest
pnpm e2e                 # Playwright (access-control, audit-closure, veracity)
pnpm exec next build     # build prod (hors gate)
```

`PROD_AUTODEPLOY: false` — déploiement Vercel prod manuel : `vercel --prod` (projet `hearst-connect-v1`).

## Design system

Tokens dans `src/styles/tailwind.css` (`@theme`). Canon surfaces (`src/components/admin/surface.tsx`) — tableau de bord = référence :
`surfaceBox` (cards verre) · `surfaceNav` (menu verre) · `surfaceInset` (puits) · `surfaceSelect` (voile mint sélection).
Header console partagé : `AdminPageHeader` — glow + monogramme H + titre + KPI hero. Fond : `public/brand/console-glow.png` (`consoleGlowLayer` — `fixed` + `bg-fixed`, HC-ADMIN-FIXED-BACKGROUND-027). Monogramme : `public/brand/hearst-h.svg`. Lockup officiel (Hearst-Defi) : `public/brand/hearst-connect.svg` (+ `-dark` / `-official`). Favicon onglet : `src/app/icon.svg` (H mint sur fond graphite).
Gate `check:ds` : pas de hex brut hors token dans le runtime métier.
Gate `check:no-zinc` : palette structurelle interdite — tokens sémantiques `fg` / `ink` / `console-*` uniquement (`.cursor/rules/50-no-zinc.mdc`).

## Documentation

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Contrat agent (gates, secrets, pièges) |
| `docs/ENDPOINT-MAPPING.md` | Contrat backend → front |
| `docs/PASSATION-AGENT.md` | Reprise opérationnelle (Railway, Vercel, priorités) |

Point de reprise : **`main`** — landing `/` = hero Tailwind Plus + domaines + features + plateforme + doctrine + CTA (tokens `console-*` / `accent-*`, assets `public/brand/`).
