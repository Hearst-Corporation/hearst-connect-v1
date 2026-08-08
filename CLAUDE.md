<!-- BEGIN:deploy-policy -->
PROD_AUTODEPLOY: false
<!-- END:deploy-policy -->

# CLAUDE.md — Hearst Connect (`/Users/adrienbeyondcrypto/Desktop/Herst Connect V1`)

> Adapter local du socle global `~/.claude/CLAUDE.md`.
> En cas de conflit : instruction d'Adrien > mission > CE fichier > socle global.

## Ce que c'est

Front Next.js de Hearst Connect : vitrine marketing publique, écran de connexion, console
d'administration protégée (journal d'accès, membres, connexions, paramètres). Utilisateurs :
les propriétaires et administrateurs d'espaces Hearst.

**Voisinage à ne pas confondre** (état au 2026-07-27) :
- `Hearst-Corporation/hearst-connect-backend` — service back-end séparé, existant.
- Projet Vercel `hearst-connect` (→ `app.hearst.app`) — **application de production tierce**,
  aucun rapport avec ce repo. Ne jamais y déployer depuis ici.
- Ce repo déploie sur le projet Vercel **`hearst-connect-v1`** et lui seul.

## Architecture front ↔ back (canonique)

| Couche | Cible |
|---|---|
| **Ce repo** | Front Next.js → Vercel **`hearst-connect-v1`** |
| **Code backend** | GitHub `Hearst-Corporation/hearst-connect-backend` (`main`) |
| **Runtime backend** | **Railway** `https://hearst-connect-backend-production.up.railway.app` via `HEARST_API_URL` |
| **Déploiement backend** | Push `main` sur GitHub → Railway (auto) ; secours CLI : `railway` projet `radiant-recreation`, service `hearst-connect-backend` |

### RÈGLE ABSOLUE — GPU1 INTERDIT

**Ne jamais toucher GPU1** depuis ce dépôt ni pour le compte de Hearst Connect :
pas de SSH (`gpu1`, `comput3@`, Tailscale/LAN), pas de workflow `deploy.yml` GPU1,
pas de `connect-api.hearst.app` comme URL backend, pas de `deploy-gpu1.sh`.
GPU1 n'est **pas** le runtime de ce produit. En cas de panne backend : Railway +
GitHub uniquement. Détail : `.cursor/rules/30-no-gpu1.mdc`.

## Stack & environnement

- Next.js 16.2.12 (App Router, Turbopack) · React 19.2.6 · TypeScript strict · Tailwind CSS v4.
- Package manager : **pnpm** (`pnpm-lock.yaml`, `packageManager: pnpm@11.9.0`) · dev :
  `pnpm dev` · **port : 4105**. Aucun `package-lock.json` : n'en régénère pas un (voir
  « Pièges connus » — la CI Hearst est pnpm-only).
- Aucune base de données ici, et **aucune donnée de démonstration** : le contenu vient du backend
  Hearst Connect via `src/lib/backend/` (client serveur unique, `HEARST_API_URL`). Une absence
  reste une absence — état nommé (`NOT_CONFIGURED`, `UNAVAILABLE`…), jamais une valeur de repli.
- Session : cookie httpOnly chiffré AES-256-GCM maison (`src/lib/session.ts`). Il porte l'identité
  ET le jeton porteur émis par le backend — donc jamais lisible côté client.
- Variables d'environnement serveur : **une seule porte**, `src/lib/env.ts` (`import 'server-only'`,
  validation fail-closed). Aucun autre module ne lit `process.env` pour ces clés.

## Gates & tests

- Gate canonique : `pnpm check` = `typecheck` → `lint` → `check:no-gpu1` → `check:no-zinc` → `check:mocks` → `check:truthful-data` → `check:ds` → `check:ui` → `test`, en
  série (le premier rouge arrête tout). Pas de build dans la gate (le build vit dans le
  déploiement).
- **Pas de gate de design *imposée* (décision du 2026-07-31).** Pas de Storybook obligatoire,
  pas de captures ni de revue visuelle imposées, aucune bibliothèque de composants imposée. Le
  kit Catalyst (`src/components/catalyst/`) reste un **outil disponible**, jamais une
  obligation ; il n'est pas modifié quand on l'utilise. La gate `check:catalyst` et son script
  ont été supprimés à cette date.
  **Nuance ajoutée depuis (UI-04, 2026-08-03) :** une gate de *convergence des couleurs*
  existe bel et bien, `check:ds` (`scripts/check-design-system.mjs`), et elle est bloquante en
  CI. Elle n'impose pas un design : elle interdit un hexadécimal brut hors `var(--token, #repli)`
  dans les routes et modules métier, pour qu'une couleur passe toujours par un token.
- Ce que chaque étape garantit :
  - `typecheck` (`tsc --noEmit`) — TypeScript strict, aucune erreur de type.
  - `lint` (`eslint`) — `src/components/catalyst/**` volontairement ignoré.
  - **`check:no-gpu1` (`scripts/check-no-gpu1.mjs`) — interdit GPU1 / connect-api comme
    cible backend dans le code et la config opérationnelle. Backend = GitHub + Railway.**
  - **`check:no-zinc` (`scripts/check-no-zinc.mjs`) — interdit toute occurrence de la
    palette structurelle Tailwind interdite (utilities, tokens, variantes, identifiants). Neutrals =
    tokens sémantiques `fg` / `ink` / `console-*`. Règle : `.cursor/rules/50-no-zinc.mdc`.**
  - **`check:mocks` (`scripts/check-no-mocks.mjs`) — gate anti-données-simulées, garantie
    centrale du produit.** 7 règles sur le runtime (`src/app`, `components`, `features`, `hooks`,
    `lib`, `services` ; les tests sont exclus, commentaires et littéraux retirés avant analyse) :
    `RANDOM` (pas de `Math.random()` — une valeur affichée ne se tire pas au sort) · `FAKER`
    (pas de dépendance faker) · `IMPORT_FROM_TESTS` (un fichier runtime n'importe pas une fixture
    / un jeu de démo) · `DECLARED_FIXTURE` (pas de `const mockData` / `demoData` / `chartData`…)
    · **`NULL_TO_ZERO`** (pas de `?? 0` ni `|| 0` : une valeur absente ne vaut pas zéro — passer
    par `formatCount` ou afficher « — »). Deux règles supplémentaires ajoutées au Lot 3 :
    **`FORCED_AVAILABLE`** (pas d'objet `Availability` construit à la main en `available/manual`
    — cause racine des P0 de véracité, cf. VER-10) · **`COUNT_FROM_EMPTY_FALLBACK`** (pas de
    `?? [].length` : une source absente ne devient pas « 0 mesuré »). Si tu es tenté de
    contourner une de ces règles, c'est presque toujours le code qu'il faut corriger, pas la gate.
  - **`check:truthful-data` (`scripts/check-truthful-data.mjs`) — aucun faux live, seuil
    hardcodé ni `stale:false` forcé dans le runtime.**
  - `check:ds` (`scripts/check-design-system.mjs`) — aucun hexadécimal brut hors token dans
    `src/app`, `components/admin`, `components/vaults`, `components/marketing`. Sa propre preuve :
    `node scripts/check-design-system.mjs --selftest`.
  - `check:ui` (`scripts/check-ui-boundaries.mjs`) — frontières compositions / charts / Catalyst.
  - `test` (`vitest run`) — suite dans `tests/` (40 fichiers / 315 tests, mesuré au 2026-08-05),
    dont `truthful-rendering`, `auth-doctrine`, `session`, `login-flow`, `admin-surfaces`,
    `veracity-p0`, `language-regression`.
- En complément de la gate, avant livraison : parcours réel (connexion → dashboard → déconnexion).

## Secrets

- `AUTH_SECRET`, `HEARST_API_URL`, `ADRIEN_OWNER_EMAIL`, `ADRIEN_OWNER_PASSWORD`,
  `DEV_QUICK_LOGIN_EMAIL`/`_PASSWORD` (dev local uniquement) — six clés, celles de
  `.env.example` et pas une de plus — jamais en dur, jamais dans un prompt. Noms seuls dans ce fichier, jamais de
  valeur. En local : `.env.local` (gitignoré, `chmod 600`) ; `.env.example` liste les clés sans
  secret. En production : variables du projet Vercel `hearst-connect-v1` (production + preview +
  development).
- Aucune de ces clés n'est préfixée `NEXT_PUBLIC_` : elles ne sortent pas du serveur.
  `src/lib/env.ts` ne journalise JAMAIS une valeur — uniquement le NOM d'une variable et son
  état (présente / absente / invalide).
- Un mot de passe jetable distinct sert aux parcours pilotés au navigateur : le mot de passe réel
  n'est jamais saisi dans un navigateur automatisé.

## Pièges connus

- **La CI Hearst est pnpm-only.** Un repo passé en npm échoue le job « gate » en quelques
  secondes, avant même de lancer un test. Ne jamais faire `npm install` ici : ça crée un
  `package-lock.json` qui casse la CI. Toujours `pnpm install` / `pnpm <script>`.
- `vercel link --project <nom>` **rattache un projet existant** s'il porte ce nom : vérifier
  `vercel project ls` avant, sous peine de viser une production tierce (cas rencontré avec
  `hearst-connect` / `app.hearst.app` le 2026-07-27).
- Le dossier s'appelle « Herst Connect V1 » (sans le `a`) ; le produit, le repo et le projet
  Vercel s'écrivent **Hearst**.
- **GPU1 est hors périmètre** pour Hearst Connect (front et backend vu depuis ici). Voir
  « RÈGLE ABSOLUE — GPU1 INTERDIT » ci-dessus.

## Git

- Racine git réelle : ce dossier. Remote : `Hearst-Corporation/hearst-connect-v1`.
- Worktrees : plusieurs sont utilisés pour faire travailler des missions en parallèle sans
  qu'elles se marchent dessus (au 2026-08-04 : le dossier principal, plus des worktrees de
  sandbox, d'audit et de nettoyage). Vérifier l'état réel avec `git worktree list` avant
  d'intervenir — ne jamais écrire dans le worktree d'une autre mission.
