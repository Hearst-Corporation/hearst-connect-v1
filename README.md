# Hearst Connect

Front Next.js — vitrine marketing, connexion, console d'administration.
UI : kit **Catalyst** (Tailwind Plus) + dataviz **richart** (Recharts).

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

## Console admin — état de référence (2026-08-07)

**Style cible** : tableau de bord unique sur **`/admin`** + pages métier alignées sur
`AdminPageHeader` (`src/components/admin/page-header.tsx`) — glow + monogramme H + titre +
description + KPI horizontaux (`AdminHeroKpi`, max 4). Thème sombre forcé.

| Route | Rôle | Référence code |
|---|---|---|
| `/admin` | **Tableau de bord unique** — header (glow + monogramme H + KPI + CTA), stepper, « À traiter », charts | `src/features/admin-dashboard/`, `src/components/admin/dashboard/` |
| `/admin/clients`, `/admin/conformite`, `/admin/vaults`, `/admin/operations`, `/admin/series-1`, `/admin/runtime` | Pages métier — même hero `AdminPageHeader` + KPIs | `src/app/admin/*/page.tsx` |

**Navigation** (`src/lib/admin-nav.ts`) : sidebar **Tableau de bord · Coffres · Clients · Conformité · Opérations** ; hubs **Journal Série 1 · Produit · Service**. L’ancienne URL `/admin/dashboard` redirige vers `/admin`.

**Frontière d'actions** réutilisable : `src/components/actions/` (boutons Catalyst + états disabled/loading).

Ouvrir le dashboard en local (Chrome connecté, thème sombre) :

```bash
E2E_PORT=4105 node scripts/open-dashboard-chrome.mjs
```

## Structure

```
src/
├── app/admin/                  routes console
├── components/
│   ├── catalyst/               kit officiel (non modifié sauf link Next)
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
pnpm check               # gate canonique (typecheck → lint → checks → test)
pnpm test                # vitest
pnpm e2e                 # Playwright (access-control, audit-closure, veracity)
pnpm exec next build     # build prod (hors gate)
```

`PROD_AUTODEPLOY: false` — déploiement Vercel prod manuel : `vercel --prod` (projet `hearst-connect-v1`).

## Design system

Tokens dans `src/styles/tailwind.css` (`@theme`). Canon surfaces (`src/components/admin/surface.tsx`) — tableau de bord = référence :
`surfaceBox` (cards verre) · `surfaceNav` (menu verre) · `surfaceInset` (puits) · `surfaceSelect` (voile mint sélection).
Header console partagé : `AdminPageHeader` — glow + monogramme H + titre + KPI hero. Fond : `public/brand/console-glow.png`. Monogramme : `public/brand/hearst-h.svg`. Lockup officiel (Hearst-Defi) : `public/brand/hearst-connect.svg` (+ `-dark` / `-official`). Favicon onglet : `src/app/icon.svg` (H mint sur fond zinc).
Gate `check:ds` : pas de hex brut hors token dans le runtime métier.

## Documentation

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Contrat agent (gates, secrets, pièges) |
| `docs/ENDPOINT-MAPPING.md` | Contrat backend → front |
| `docs/PASSATION-AGENT.md` | Reprise opérationnelle (Railway, Vercel, priorités) |

Point de reprise : **`main`** @ `899833c`.
