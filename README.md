# Hearst Connect

Front Next.js — vitrine marketing, écran de connexion, console d'administration.
Interface bâtie sur le kit officiel Tailwind Plus
[Catalyst](https://tailwindcss.com/plus/ui-kit) pour les primitives interactives, et sur
les UI Blocks Marketing pour la vitrine.

## Pile

| | |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Langage | TypeScript strict |
| Gestionnaire de paquets | **pnpm** — voir « Piège » ci-dessous |
| Styles | Tailwind CSS v4 (`@theme` dans `src/styles/tailwind.css`) |
| UI | Catalyst UI Kit officiel (`src/components/catalyst/`, vendoré tel quel) |
| Vitrine | Tailwind Plus UI Blocks officiels, portés en TS (`src/components/marketing/`) |
| Dataviz | Recharts (moteur unique) |
| Session | Cookie httpOnly **chiffré AES-256-GCM** (`src/lib/session.ts`), sans dépendance externe |

## Démarrer

> **Piège — ce dépôt est pnpm-only.** La CI Hearst échoue le job « gate » si un
> `package-lock.json` apparaît. Ne jamais lancer `npm install` ici.

```bash
cp .env.example .env.local          # puis remplir (voir plus bas)
pnpm install --frozen-lockfile
pnpm dev                            # http://localhost:3000
```

### Variables d'environnement

Six clés, celles de `.env.example` et pas une de plus. Toutes sont lues par la porte
unique `src/lib/env.ts` (`import 'server-only'`, validation fail-closed) ; aucune n'est
préfixée `NEXT_PUBLIC_`, donc aucune ne sort du serveur.

| Variable | Rôle |
|---|---|
| `AUTH_SECRET` | Protection du cookie de session (32 caractères minimum — `openssl rand -hex 32`) |
| `HEARST_API_URL` | Base du backend Hearst Connect — autorité d'authentification |
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
│   ├── (auth)/                 connexion
│   ├── admin/                  console d'administration protégée (garde de session)
│   └── design-lab/             bac à sable visuel — 404 en production (ARCH-02)
├── components/
│   ├── catalyst/               kit officiel, NON modifié (cf. VENDOR.md)
│   ├── marketing/              blocs vitrine Tailwind Plus
│   ├── admin/                  surfaces, typographie et charts de la console
│   ├── vaults/                 tables et cartes du registre de coffres
│   └── design-lab/
│       └── green-command-center/   composition de la console (shell, rail, primitives)
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

La console est rendue par le **Green Command Center**
(`src/components/design-lab/green-command-center/`) : `GreenCommandCenterShell` et
`GreenCommandRail` habillent toutes les routes admin. Elle est **sombre par
construction** — le contrat de thème est documenté dans
`docs/design-system/DESIGN-SYSTEM-NOTES.md`.

- `/admin/vault` redirige vers `/admin/vaults` : le registre d'endpoints la nomme comme
  `surface` de plusieurs routes backend, la redirection évite d'en faire des 404.
- **26 endpoints** enregistrés dans `src/lib/backend/endpoints.ts` — source unique de vérité.
- Langue produit : **français** (migration HC-CONSOLE-FR-001), gardée par
  `tests/language-regression.test.ts`.

Revues visuelles : `docs/visual-reviews/`.

## Ce qui est réel, ce qui ne l'est pas

Le socle d'authentification est réel : le backend Hearst est l'autorité, la session est
un cookie httpOnly chiffré, `/admin` est gardé côté serveur.

Les **données métier admin** proviennent du backend via `callBackend`. Une absence de
source reste une absence : état nommé (`unavailable`, « Indisponible », « Source
attendue »), jamais un zéro ni un exemple fictif. Cette garantie est vérifiée en CI par
`pnpm check:mocks` (job `truthful-data`), qui interdit notamment `Math.random()`, les
jeux de démonstration et la coalescence `?? 0`.

Organisations, dossiers KYC et files d'approbation : **pas encore exposés** par le backend.

## Commandes

```bash
pnpm dev                 # développement (port 3000)
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
  `--color-accent-50 … --color-accent-950`. La console (`.cockpit-theme`) et le thème
  global n'attribuent pas les mêmes paliers — c'est voulu, la valeur d'accent perçue
  reste la même.
- **Surfaces** (console, sombre) : `--color-console-app` < `--color-console-shell` <
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

## Documentation

| Document | Rôle |
|---|---|
| `CLAUDE.md` | Contrat de travail sur ce dépôt (stack, gates, secrets, pièges) |
| `docs/design-system/HEARST-CONNECT-V1-DESIGN-SYSTEM-DOCTRINE.md` | Doctrine Design System |
| `docs/design-system/DESIGN-SYSTEM-NOTES.md` | État vérifié du design system encodé dans le dépôt |
| `docs/design-system/CONSOLE-FR-GLOSSARY.md` | Glossaire de la langue produit |
| `docs/remediation/` | Suivi de la remédiation d'audit (historique) |
| `docs/audits/` | Audits de propreté et plans de nettoyage |
