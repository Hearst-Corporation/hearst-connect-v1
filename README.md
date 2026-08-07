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

**Style cible** : tableau de bord unique sur **`/admin`** (commit `899833c`+).
Les autres pages admin seront alignées **une par une** sur ce modèle (Catalyst + compositions, thème sombre forcé).

| Route | Rôle | Référence code |
|---|---|---|
| `/admin` | **Tableau de bord unique** — pilotage souscriptions (stepper, « À traiter », KPI, charts) | `src/features/admin-dashboard/`, `src/components/admin/dashboard/` |
| `/admin/vaults`, `/admin/clients`, … | Pages métier | à rapprocher du tableau de bord |

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
│   ├── admin/dashboard/        blocs du dashboard référence
│   ├── actions/                boutons d'action partagés
│   ├── charts/                 richart + cartesian
│   └── compositions/           panels, StatGrid, SectionCard…
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
`surfaceBox` (KPI verre) · `surfaceNav` (menu verre) · `surfaceInset` (puits) · `surfaceSelect` (voile mint). Boxes translucides + blur — fond lumineux peut transparaître.
Gate `check:ds` : pas de hex brut hors token dans le runtime métier.

## Documentation

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Contrat agent (gates, secrets, pièges) |
| `docs/ENDPOINT-MAPPING.md` | Contrat backend → front |
| `docs/PASSATION-AGENT.md` | Reprise opérationnelle (Railway, Vercel, priorités) |

Point de reprise : **`main`** @ `899833c`.
