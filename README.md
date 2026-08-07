# Hearst Connect

Front Next.js — vitrine marketing, connexion, console d'administration.
UI : kit **Catalyst** (Tailwind Plus) + dataviz **richart** (Recharts).

**Landing `/`** — vitrine marketing, refonte artistique (2026-08-07) : récit **dark-only en 4 actes**,
premium et calme, qui vend l'accès unifié aux espaces Hearst (fin de l'empilement de démos Aceternity).

Shell : `src/app/(marketing)/layout.tsx` — `SiteHeader` (sticky, blur, filet bas) · `main` · `SiteFooter` · `bg-console-app`.

| Acte | Bloc | Wrapper marketing | Primitive `ui/` |
|---|------|-------------------|-----------------|
| 1 — Hero | La console réelle se redresse au défilement | `hero-scroll-demo.tsx` | `container-scroll-animation.tsx` |
| 2 — Preuve | Quatre domaines, cartes qui s'ouvrent sur des captures | `app-store-demo.tsx` | `app-store-cards.tsx` |
| 3 — Doctrine | Trois piliers de gouvernance (statique) | `features-doctrine.tsx` | — |
| 4 — CTA | Clôture calme → `/login` · `/register` | `closing-cta.tsx` | — |

Composition : `src/app/(marketing)/page.tsx` (server component). En-tête de section partagé : `section-intro.tsx`.
Deux moments de motion seulement (hero scroll-reveal + expansion shared-layout des cartes) ; le bas de page est immobile.
Les démos non retenues (carousel 3D, grille de fond, pin 3D, ripple, bento, `cards-demo-3`) ont été retirées.

**Règles landing** : tokens `console-*` + `accent-*` · `text-white` / `text-white/50` · fond `bg-console-app`.
Interdit dans `src/components/marketing/` et `src/components/ui/` : classes `zinc-*`, `neutral-*`,
`slate-*`, `gray-*` (gate `tests/marketing-no-zinc.test.ts`). Police : Satoshi uniquement.
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

Point de reprise : **`main`** — landing `/` refondue en 4 actes dark-only (Hero · Preuve · Doctrine · CTA).
