# Hearst Connect

Front Next.js — vitrine marketing, connexion, console d'administration.
UI : kit **Catalyst** (Tailwind Plus) + dataviz **richart** (Recharts).

**Landing `/`** — vitrine marketing : récit **dark-only** premium en 4 actes, enrichi d'**interludes Motion**
(2026-08-08). Vend l'accès unifié aux espaces Hearst.

Shell : `src/app/(marketing)/layout.tsx` — `SiteHeader` (sticky, blur, filet bas) · `main` · `SiteFooter` · `bg-console-app`.
Composition : `src/app/(marketing)/page.tsx` (server component) ; un filet `console-line-soft` ouvre chaque section.

| # | Section | Wrapper marketing | Primitive `ui/` |
|---|---------|-------------------|-----------------|
| 1 | **Acte 1 — Hero** (console qui se redresse au scroll) | `hero-scroll-demo.tsx` | `container-scroll-animation.tsx` |
| 2 | Interlude — Vague / ripple | `background-ripple-band.tsx` | `background-ripple-effect.tsx` |
| 3 | Interlude — Carousel 3D scroll-vélocité | `heritage-scroll-demo.tsx` | `scroll-velocity-planes.tsx` · `scramble-text.tsx` |
| 4 | **Acte 2 — Preuve** (4 domaines, cartes shared-layout) | `app-store-demo.tsx` · `section-intro.tsx` | `app-store-cards.tsx` |
| 5 | Interlude — Grille de fond | `grid-background-demo.tsx` | `grid-background.tsx` |
| 6 | Interlude — Pin 3D → `/login` | `3d-pin-demo.tsx` | `3d-pin.tsx` |
| 7 | **Acte 3 — Doctrine** (3 piliers, statique) | `features-doctrine.tsx` | — |
| 8 | Interlude — Bento (5 tuiles animées) | `bento-grid-example-three.tsx` | `bento-grid.tsx` |
| 9 | **Acte 4 — CTA** (aurore mint) → `/login` · `/register` | `closing-cta.tsx` | — |

**Orphelin** : `cards-demo-3.tsx` (`ui/`) restauré mais **non monté** (logos tiers, hors marque Hearst).

**Règles landing** : tokens `console-*` + `accent-*` · `text-white` / `text-white/50` · fond `bg-console-app`.
Interdit dans `src/components/marketing/` et `src/components/ui/` : rampes Tailwind
structurelles `neutral-*` / `slate-*` / `gray-*` (test `tests/marketing-no-zinc.test.ts`)
et toute utilitaire de la palette interdite (gate `pnpm run check:no-zinc`). Police : Satoshi uniquement.
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
| `/admin/clients`, `/admin/compliance`, `/admin/vaults`, `/admin/operations`, `/admin/series-1`, `/admin/runtime`, `/admin/product` | Business pages — same `AdminPageHeader` pattern |

**Navigation** (`src/lib/admin-nav.ts`): sidebar **Dashboard · Vaults · Clients · Compliance · Operations**; hubs **Series 1 journal · Product · Service**. Legacy `/admin/conformite` and `/admin/produit` redirect to English routes.

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
│   ├── marketing/              wrappers landing (copy FR, assets brand)
│   ├── ui/                     primitives Aceternity/Motion tokenisées
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
33 endpoints dans `src/lib/backend/endpoints.ts`. Spec mapping : `docs/ENDPOINT-MAPPING.md`.

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
Header console partagé : `AdminPageHeader` — glow + monogramme H + titre + KPI hero. Fond : `public/brand/console-glow.png`. Monogramme : `public/brand/hearst-h.svg`. Lockup officiel (Hearst-Defi) : `public/brand/hearst-connect.svg` (+ `-dark` / `-official`). Favicon onglet : `src/app/icon.svg` (H mint sur fond graphite).
Gate `check:ds` : pas de hex brut hors token dans le runtime métier.
Gate `check:no-zinc` : palette structurelle interdite — tokens sémantiques `fg` / `ink` / `console-*` uniquement (`.cursor/rules/50-no-zinc.mdc`).

## Documentation

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Contrat agent (gates, secrets, pièges) |
| `docs/ENDPOINT-MAPPING.md` | Contrat backend → front |
| `docs/PASSATION-AGENT.md` | Reprise opérationnelle (Railway, Vercel, priorités) |

Point de reprise : **`main`** — landing `/` = 4 actes dark-only (Hero · Preuve · Doctrine · CTA) + interludes Motion (vague, carousel 3D, grille, pin 3D, bento).
