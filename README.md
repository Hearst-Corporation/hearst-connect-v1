# Hearst Connect

Front Next.js — vitrine marketing, écran de connexion, console d'administration.
Interface bâtie sur le kit officiel Tailwind Plus
[Catalyst](https://tailwindcss.com/plus/ui-kit) pour les primitives interactives, et sur
les UI Blocks Marketing pour la vitrine.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  hearst-connect-v1 (CE REPO)                                    │
│  Front Next.js · Vercel projet hearst-connect-v1                │
│  HEARST_API_URL ───────────────────────────────┐                │
└────────────────────────────────────────────────│────────────────┘
                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  hearst-connect-backend (GitHub, repo séparé)                   │
│  Hearst-Corporation/hearst-connect-backend · branche main       │
│  Runtime prod : Railway hearst-connect-backend-production       │
│  Déploiement : push main → Railway (auto)                       │
└─────────────────────────────────────────────────────────────────┘
```

| Composant | Cible canonique |
|---|---|
| Front (ce repo) | Vercel **`hearst-connect-v1`** — jamais `hearst-connect` / `app.hearst.app` |
| Code backend | GitHub **`Hearst-Corporation/hearst-connect-backend`** |
| API prod (`HEARST_API_URL`) | **`https://hearst-connect-backend-production.up.railway.app`** |
| Déploiement backend | Push **`main`** sur GitHub → Railway |

### Règle absolue — GPU1 interdit

**Ne jamais toucher GPU1** pour Hearst Connect : pas de SSH, pas de `connect-api.hearst.app`,
pas de workflow `deploy.yml` GPU1, pas de `deploy-gpu1.sh`. GPU1 n'est pas le runtime de
ce produit. Panne backend → Railway + GitHub uniquement.

Agents : `.cursor/rules/30-no-gpu1.mdc` · humains : `CLAUDE.md` § Architecture.

## Pile

| | |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Langage | TypeScript strict |
| Gestionnaire de paquets | **pnpm** — voir « Piège » ci-dessous |
| Styles | Tailwind CSS v4 (`@theme` dans `src/styles/tailwind.css`) |
| UI | Catalyst UI Kit officiel (`src/components/catalyst/`, vendoré tel quel) |
| Vitrine | Tailwind Plus UI Blocks officiels, portés en TS (`src/components/marketing/`) |
| Dataviz | Frontière `src/components/charts/` (Recharts + MUI X Charts) |
| Session | Cookie httpOnly **chiffré AES-256-GCM** (`src/lib/session.ts`), sans dépendance externe |

## Démarrer

> **Piège — ce dépôt est pnpm-only.** La CI Hearst échoue le job « gate » si un
> `package-lock.json` apparaît. Ne jamais lancer `npm install` ici.

```bash
cp .env.example .env.local          # puis remplir (voir plus bas)
pnpm install --frozen-lockfile
pnpm dev                            # http://localhost:4105
```

### Variables d'environnement

Six clés, celles de `.env.example` et pas une de plus. Toutes sont lues par la porte
unique `src/lib/env.ts` (`import 'server-only'`, validation fail-closed) ; aucune n'est
préfixée `NEXT_PUBLIC_`, donc aucune ne sort du serveur.

| Variable | Rôle |
|---|---|
| `AUTH_SECRET` | Protection du cookie de session (32 caractères minimum — `openssl rand -hex 32`) |
| `HEARST_API_URL` | Base du backend Hearst Connect sur **Railway** — autorité d'authentification (jamais GPU1 / `connect-api.hearst.app`) |
| `ADRIEN_OWNER_EMAIL` | Adresse du compte propriétaire |
| `ADRIEN_OWNER_PASSWORD` | Mot de passe du compte propriétaire |
| `DEV_QUICK_LOGIN_EMAIL` | Connexion rapide, **développement local uniquement** |
| `DEV_QUICK_LOGIN_PASSWORD` | Connexion rapide, **développement local uniquement** |

Aucun secret n'est écrit dans le code. `.env.local` est gitignoré ; la production utilise
les variables du projet Vercel `hearst-connect-v1`.

## Structure

```
src/
├── app/
│   ├── layout.tsx              racine — polices Hearst, métadonnées, thème
│   ├── (marketing)/            vitrine publique
│   ├── (auth)/                 connexion (AuthLayout Catalyst)
│   ├── admin/                  console protégée — shell Catalyst SidebarLayout
│   └── espace/                 espace investisseur (ConsoleShell legacy)
├── components/
│   ├── catalyst/               kit officiel, non modifié sauf link.tsx Next (cf. VENDOR.md)
│   ├── marketing/              blocs vitrine Tailwind Plus
│   ├── admin/                  shell console (`application-layout`), helpers de page
│   ├── vaults/                 tables et cartes du registre de coffres
│   ├── charts/                 frontière dataviz (Recharts, MUI X)
│   ├── compositions/           blocs UI métier réutilisables
│   └── layout/                 shell espace (`console-shell`, hors rebuild console)
├── features/
│   └── admin-home/             tableau de bord accueil console
├── lib/
│   ├── backend/                callBackend, registre d'endpoints, keeper, sondes
│   ├── vaults/                 modèle métier (Availability), registre, agrégats
│   ├── env.ts                  porte unique des variables serveur
│   ├── session.ts              cookie de session chiffré
│   ├── format.ts               formatage centralisé (nombres, %, devises, dates)
│   └── fonts.ts                Satoshi Variable (une seule famille)
└── styles/tailwind.css         tokens `@theme` — surfaces, accent, états sémantiques
```

## Console d'administration

Navigation principale (5 sections, `src/lib/admin-nav.ts`) :
**Accueil · Clients · Conformité · Opérations · Administration**.
Destinations secondaires groupées dans le même module.

Le shell console est le **Catalyst SidebarLayout**
(`src/components/admin/application-layout.tsx`) : rail, navbar mobile et compte
utilisateur. **Toutes les pages `/admin/**` sont en Catalyst pur**
(`Heading`, `DescriptionList`, `Table`, `Badge`, `Text`) — plus de corps
`LegacyAdminBody` / green command center sur la console. Les endpoints et
`callBackend` restent inchangés.

- `/admin/vault` redirige vers `/admin/vaults` : le registre d'endpoints la nomme comme
  `surface` de plusieurs routes backend, la redirection évite d'en faire des 404.
- **31 endpoints** enregistrés dans `src/lib/backend/endpoints.ts` — source unique de vérité (dont `/clients`, `/deployments`, `/compliance`, `/events/rebalancing`, trigger indexeur admin).
- Langue produit : **français** (migration HC-CONSOLE-FR-001), gardée par
  `tests/language-regression.test.ts`.

Point de reprise Git avant le rebuild Catalyst : tag `recovery/pre-catalyst-console`.
Branche de travail courante : **`main`** (plus `rebuild/catalyst-console`).

Revues visuelles : `docs/visual-reviews/`.
Passation agent : `docs/PASSATION-AGENT.md`.

## Ce qui est réel, ce qui ne l'est pas

Le socle d'authentification est réel : le backend Hearst est l'autorité, la session est
un cookie httpOnly chiffré, `/admin` est gardé côté serveur.

Les **données métier admin** proviennent du backend via `callBackend`. Une absence de
source reste une absence : état nommé (`unavailable`, « Indisponible », « Source
attendue »), jamais un zéro ni un exemple fictif. Cette garantie est vérifiée en CI par
`pnpm check:mocks` (job `truthful-data`), qui interdit notamment `Math.random()`, les
jeux de démonstration et la coalescence `?? 0`.

Organisations, dossiers KYC et files d’approbation : lus via `GET /api/v1/clients`,
`/deployments` et `/compliance` (admin). Une réponse `LIVE` avec liste vide reste vide —
jamais un compteur inventé. Les lectures on-chain (vault, mining, btc…) restent
`UNAVAILABLE` tant que le RPC / indexeur ne lit pas.

## Commandes

```bash
pnpm dev                 # développement (port 4105)
pnpm build               # build de production
pnpm check               # gate canonique, en série (voir ci-dessous)
pnpm test                # vitest
pnpm e2e                 # Playwright — exige un backend joignable et .env.local
```

`pnpm check` enchaîne, dans l'ordre et en s'arrêtant au premier rouge :

| Étape | Ce qu'elle garantit |
|---|---|
| `typecheck` | `tsc --noEmit` — TypeScript strict |
| `lint` | `eslint` (`src/components/catalyst/**` volontairement ignoré) |
| `check:no-gpu1` | aucune référence GPU1 / connect-api comme backend dans le code et la config |
| `check:mocks` | aucune donnée simulée dans le runtime (7 règles) |
| `check:ds` | aucune couleur hexadécimale hors token dans les routes et modules |
| `test` | `vitest run` |

Outils de diagnostic, **non bloquants et hors gate** :

```bash
pnpm quality:dead        # knip — code potentiellement mort (indices, pas verdicts)
pnpm quality:dup         # duplication : exit 1 au-dessus du seuil (4 %, cf. scripts/check-duplication.mjs)
pnpm quality:dup:report  # le détail clone par clone
pnpm lint:fast           # oxlint, passe rapide complémentaire d'eslint
```

`quality:dup` **échoue réellement** au-dessus de son seuil ; sa propre preuve est
`node scripts/check-duplication.mjs --selftest`. Quand il rougit, la réponse est
de retirer la duplication, pas de monter le seuil.

Analyse SonarQube (facultative, hors CI) :

```bash
SONAR_TOKEN=… SONAR_HOST_URL=https://… pnpm sonar
```

Les deux variables sont obligatoires — aucune adresse de serveur n'est codée en
dur — et Docker est requis (le scanner est distribué en image). Chaque prérequis
manquant produit un message qui nomme ce qui manque.

## Design system

La source normative des tokens est `src/styles/tailwind.css` (`@theme`).

- **Accent** : un seul vert, la teinte Hearst mint, décliné en rampe
  `--color-accent-50 … --color-accent-950`. La console `/admin` (Catalyst) consomme
  les tokens globaux ; `.cockpit-theme` ne s'applique qu'à `/espace` (ConsoleShell
  legacy).
- **Surfaces** (espace legacy, sombre) : `--color-console-app` < `--color-console-shell` <
  `--color-console-card` < `--color-console-card-top`, plus `--color-console-inset`
  pour l'enfoncé.
- **États sémantiques** : `--color-success-*`, `--color-warning-*`, `--color-danger-*`,
  `--color-info-*` — distincts de l'accent. La couleur ne porte jamais seule un statut :
  chaque état porte aussi un libellé.
- **Polices** : **Satoshi Variable** seule (`src/assets/fonts/`) — interface, titres, mono.
- **Charts** : tokens `--chart-*` (séries et statuts), consommés via `src/lib/chart-theme.ts`.

`pnpm check:ds` interdit tout hexadécimal brut hors `var(--token, #repli)` dans les
routes et modules métier, ce qui empêche la réintroduction d'une couleur littérale.

Catalyst (`src/components/catalyst/`) : kit officiel **non modifié**. Avant de créer une
primitive générique, consulter `src/components/catalyst/VENDOR.md`.

## Remédiation audit données (2026-08)

Fermeture des lots 1–4 de `docs/audits/AUDIT-ENDPOINTS-DATA-DISPLAY-001/REVIEW.md` :

| Lot | Périmètre | État |
|---|---|---|
| 1 | Compteurs honnêtes (F-05), `STALLED` runtime (F-01), type `Runtime` partagé | ✅ |
| 2 | `meta.status` dashboard (F-02), ratio déploiement 0/0 (F-08) | ✅ |
| 3 | Parcours e2e layout/focus (`e2e/audit-closure.spec.ts`) | ✅ |
| 4 | Surfaces registre coffres (F-10), réconciliation mining (F-07) | ✅ |
| — | `strategy-detail` câblé sur `/admin/vaults/[vaultId]` (F-04) | ✅ |

Validation : `pnpm check` · e2e : `pnpm e2e e2e/audit-closure.spec.ts`

## Documentation

| Document | Rôle |
|---|---|
| `CLAUDE.md` | Contrat de travail sur ce dépôt (stack, gates, secrets, pièges, architecture) |
| `docs/PASSATION-AGENT.md` | État opérationnel pour le prochain agent (GPU1 interdit, Railway, main) |
| `.cursor/rules/30-no-gpu1.mdc` | **Règle absolue** — GPU1 interdit ; backend = GitHub + Railway |
| `docs/design-system/HEARST-CONNECT-V1-DESIGN-SYSTEM-DOCTRINE.md` | Doctrine Design System |
| `docs/design-system/DESIGN-SYSTEM-NOTES.md` | État vérifié du design system encodé dans le dépôt |
| `docs/design-system/CONSOLE-FR-GLOSSARY.md` | Glossaire de la langue produit |
| `docs/remediation/` | Suivi de la remédiation d'audit (historique) |
| `docs/audits/` | Audits de propreté et plans de nettoyage |
