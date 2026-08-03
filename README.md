# Hearst Connect

Front Next.js — vitrine marketing, écran de connexion, console d'administration.
Interface bâtie **exclusivement** sur les kits officiels Tailwind Plus :
[Catalyst](https://tailwindcss.com/plus/ui-kit) pour l'application, les UI Blocks Marketing pour la vitrine.

## Pile

| | |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Langage | TypeScript strict |
| Styles | Tailwind CSS v4 (`@theme` dans `src/styles/tailwind.css`) |
| UI | Catalyst UI Kit officiel (`src/components/catalyst/`, vendoré tel quel) |
| Vitrine | Tailwind Plus UI Blocks officiels, portés en TS (`src/components/marketing/`) |
| Session | Cookie httpOnly signé HMAC-SHA256, sans dépendance externe |

## Démarrer

```bash
cp .env.example .env.local     # puis remplir (voir plus bas)
npm install
npm run dev                    # http://localhost:3000
```

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `AUTH_SECRET` | Clé de signature des sessions, 32 caractères minimum (`openssl rand -hex 32`) |
| `ADRIEN_OWNER_EMAIL` | Adresse du compte propriétaire — défaut `adrien@hearstcorporation.io` |
| `ADRIEN_OWNER_PASSWORD` | Mot de passe du compte propriétaire |

Aucun secret n'est écrit dans le code : tout passe par `process.env`. `.env.local` est gitignoré,
la production utilise les variables d'environnement du fournisseur.

## Structure

```
src/
├── app/
│   ├── layout.tsx              racine — polices Hearst, métadonnées, thème
│   ├── (marketing)/            vitrine publique
│   ├── (auth)/                 connexion
│   └── admin/                  console d'administration protégée
│       ├── page.tsx            Accueil — Green Command Center (cockpit validé)
│       ├── clients/            annuaire (source en attente)
│       ├── conformite/         file KYC/KYB (source en attente)
│       ├── operations/         mouvements + rééquilibrage
│       ├── administration/     hub produit et outils techniques
│       ├── runtime/            matrice d'état infrastructure
│       ├── api-explorer/       registre des 26 endpoints
│       └── keeper/             actions maintenance admin
├── components/
│   ├── catalyst/               kit officiel, NON modifié
│   ├── marketing/              blocs vitrine Tailwind Plus
│   └── admin/                  design system cockpit (surfaces, sections, charts)
├── lib/
│   ├── backend/                callBackend, registre endpoints, keeper
│   ├── session.ts              cookie session signé
│   └── fonts.ts                Satoshi Variable (règle absolue — une seule famille)
└── styles/tailwind.css         tokens zinc + accent (Catalyst), états sémantiques
```

## Console d'administration

Navigation principale (5 sections) : **Accueil · Clients · Conformité · Opérations · Administration**.

Chrome UI unifié (registre Qatar / Hearst Cockpit) sur toutes les pages admin :
`PageHeader` · `CockpitSection` / `AdminSection` (bandeau sunken) · `Panel` / `AdminSurface` / `Card` (cartes raised) · typo zinc + accent.

État de migration cockpit green (`src/app/admin`), au 2026-07-30 :
- **Shell green actif sur toutes les routes admin** via `GreenCommandCenterShell`/`GreenCommandRail`.
- **Composition green complétée** : `/admin`, `/admin/clients`, `/admin/conformite`, `/admin/vaults`, `/admin/vaults/[vaultId]`, `/admin/administration`, `/admin/dashboard`, `/admin/operations`, `/admin/product`, `/admin/series-1`, `/admin/mining`, `/admin/btc`, `/admin/backtest`, `/admin/administration/produit`, `/admin/runtime`, `/admin/api-explorer`, `/admin/keeper`, `/admin/profile`.
- **Composition contenu legacy** : terminée sur le périmètre `/admin` actuellement routé.
- **Route legacy conservée** : `/admin/vault` redirige vers `/admin/vaults` (pas de rendu legacy maintenu).
- **Layout de compatibilité** : `AdminShell` reste en fallback pour d'éventuelles routes admin futures non encore déclarées.
- **26 endpoints** enregistrés dans `src/lib/backend/endpoints.ts` — source unique de vérité

Revue visuelle : `docs/visual-reviews/HC-ADMIN-DASHBOARD-002/`

## Ce qui est réel, ce qui ne l'est pas

Le socle d'authentification est réel : session signée, cookie httpOnly, garde `/admin`.

Les **données métier admin** proviennent du backend Railway via `callBackend`. Absence de source =
état nommé (`SourceAttendue`, `UnavailableState`) — jamais un zéro ni un exemple fictif
(`npm run check:mocks`).

Organisations, dossiers KYC et files d'approbation : **pas encore exposés** par le backend.


## Commandes

```bash
npm run dev              # développement
npm run build            # build de production
npm run check            # typecheck + lint + catalyst-doctor
npm run check:catalyst   # vérifie qu'aucun design system étranger n'a fui ici
```

## Design system

Palette dans `src/styles/tailwind.css` :

- **Tokens produit** : `brand-background`, `brand-surface`, `brand-accent` (or Hearst H≈45°), etc.
- **États** : `success`, `warning`, `danger`, `info`, `neutral` — distincts de la marque
- **Polices** : **Satoshi Variable** seule (`src/assets/fonts/`, Fontshare) — interface, titres, mono
- **Composants admin** : `src/components/admin/surfaces.tsx` (AdminSurface, AdminMetric, AdminTable…)

Catalyst (`src/components/catalyst/`) : kit officiel **non modifié**. `npm run check:catalyst` vérifie l'absence de fuites de design system étranger.
