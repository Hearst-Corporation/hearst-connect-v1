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

## Stack & environnement

- Next.js 16.2.6 (App Router, Turbopack) · React 19.2.6 · TypeScript strict · Tailwind CSS v4.
- Package manager : **pnpm** (`pnpm-lock.yaml`, `packageManager: pnpm@11.9.0`) · dev :
  `pnpm dev` · **port : 3000**. Aucun `package-lock.json` : n'en régénère pas un (voir
  « Pièges connus » — la CI Hearst est pnpm-only).
- Aucune base de données ici, et **aucune donnée de démonstration** : le contenu vient du backend
  Hearst Connect via `src/lib/backend/` (client serveur unique, `HEARST_API_URL`). Une absence
  reste une absence — état nommé (`NOT_CONFIGURED`, `UNAVAILABLE`…), jamais une valeur de repli.
- Session : cookie httpOnly signé HMAC-SHA256 maison (`src/lib/session.ts`). Il porte l'identité
  ET le jeton porteur émis par le backend — donc jamais lisible côté client.
- Variables d'environnement serveur : **une seule porte**, `src/lib/env.ts` (`import 'server-only'`,
  validation fail-closed). Aucun autre module ne lit `process.env` pour ces clés.

## Design system

- Source : **Catalyst officiel**, vendoré non modifié dans `src/components/catalyst/`
  (licence Tailwind Plus incluse). Les composants s'importent entre eux en relatif : une mise à
  jour du kit se fait en recopiant les fichiers, sans réconciliation.
- Vitrine : UI Blocks officiels Tailwind Plus portés en TS dans `src/components/marketing/`,
  chacun avec en commentaire le bloc d'origine. Palette adaptée, structure conservée.
- Accent : **un seul**, échelle `accent-50`→`accent-950` déclarée dans le `@theme` de
  `src/styles/tailwind.css`. Famille chromatique : **mint vert Hearst** (aligné sur
  hearstcorporation.io), pas de bleu. `--color-accent-ink` porte le texte posé SUR un accent
  clair — utilise ce token, ne redevine pas une couleur de texte au cas par cas.
  Les hex échelon par échelon ne sont volontairement pas recopiés ici : la rampe s'ajuste
  (luminance, contraste AA), l'intention ne bouge pas. Source de vérité = le fichier.
- **Zinc : deux étages, c'est le piège n°1 quand on débugue une couleur.** Les fichiers du kit
  Catalyst ne sont pas modifiés — ce sont les *valeurs des tokens sous eux* qui changent selon
  le contexte :
  1. `@theme` global réécrit `--color-zinc-50`→`950` en **navy Hearst** (vitrine, connexion) ;
  2. la classe `.cockpit-theme` **re-réécrit ces mêmes tokens en zinc Tailwind canonique**, pour
     la console admin uniquement (`src/app/admin/admin-shell.tsx`, `<div className="cockpit-theme
     dark contents">`). L'accent mint n'y est PAS redéclaré : il est hérité tel quel.
  Donc un `bg-zinc-900` ne rend pas la même couleur dans la vitrine et dans `/admin`, à classe
  identique. Vérifie toujours de quel côté de cette frontière tu te trouves.
- Rien n'est hérité d'un autre projet — `pnpm check:catalyst` le vérifie et échoue sinon.

## Gates & tests

- Gate canonique : `pnpm check` = `typecheck` → `lint` → `check:catalyst` → `check:mocks` →
  `test`, en série (le premier rouge arrête tout). Pas de build dans la gate (le build vit dans
  le déploiement).
- Ce que chaque étape garantit :
  - `typecheck` (`tsc --noEmit`) — TypeScript strict, aucune erreur de type.
  - `lint` (`eslint`) — `src/components/catalyst/**` volontairement ignoré.
  - `check:catalyst` (`catalyst-doctor`) — aucun design system n'a fui d'un autre projet.
  - **`check:mocks` (`scripts/check-no-mocks.mjs`) — gate anti-données-simulées, garantie
    centrale du produit.** 5 règles sur le runtime (`src/app`, `components`, `features`, `hooks`,
    `lib`, `services` ; les tests sont exclus, commentaires et littéraux retirés avant analyse) :
    `RANDOM` (pas de `Math.random()` — une valeur affichée ne se tire pas au sort) · `FAKER`
    (pas de dépendance faker) · `IMPORT_FROM_TESTS` (un fichier runtime n'importe pas une fixture
    / un jeu de démo) · `DECLARED_FIXTURE` (pas de `const mockData` / `demoData` / `chartData`…)
    · **`NULL_TO_ZERO`** (pas de `?? 0` ni `|| 0` : une valeur absente ne vaut pas zéro — passer
    par `formatCount` ou afficher « — »). Si tu es tenté de contourner une de ces règles, c'est
    presque toujours le code qu'il faut corriger, pas la gate.
  - `test` (`vitest run`) — suite dans `tests/` (14 fichiers au 2026-07-28), dont
    `truthful-rendering`, `auth-doctrine`, `session`, `login-flow`, `admin-surfaces`.
- En complément de la gate, avant livraison : parcours réel (connexion → dashboard → déconnexion).

## Zones no-touch

- `src/components/catalyst/**` — kit officiel. On ne le modifie pas : on l'utilise, ou on le
  remplace en bloc par une version plus récente du kit. `eslint` l'ignore volontairement.

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
- **La console `/admin` est verrouillée en sombre** (constat 2026-07-28) :
  `src/app/admin/admin-shell.tsx` force la classe `dark`, et `ThemeToggle` n'est rendu que sous
  la vitrine (`site-header`) et l'écran de connexion (`(auth)/layout`) — jamais sous `/admin`.
  Conséquence : dans les pages admin, la branche claire des paires `text-zinc-950 dark:text-white`
  est **du code mort**. Seule la moitié `dark:` est réellement rendue. Ne perds pas une heure à
  ajuster une couleur claire qui ne s'affichera jamais.
- **`check:catalyst` délègue à un outil PERSONNEL, hors du repo.** Le script pointait autrefois
  `node ~/catalyst-doctor.mjs .` — un chemin absolu machine-locale qui rendait la gate entière
  inexécutable en CI. Il passe désormais par l'adaptateur `scripts/check-catalyst.mjs` (état au
  2026-07-28), qui cherche l'outil dans `$CATALYST_DOCTOR`, puis `~/catalyst-doctor.mjs`, puis
  `~/.claude/catalyst-doctor.mjs`. **Outil absent (CI, autre machine) → « VÉRIFICATION SAUTÉE »,
  exit 0** : la gate ne casse plus, mais elle ne vérifie rien non plus. Un `check` vert sur une
  machine sans `catalyst-doctor` ne prouve donc PAS l'absence de fuite de design system — lis la
  sortie, pas seulement le code de retour.
- `vercel link --project <nom>` **rattache un projet existant** s'il porte ce nom : vérifier
  `vercel project ls` avant, sous peine de viser une production tierce (cas rencontré avec
  `hearst-connect` / `app.hearst.app` le 2026-07-27).
- Le dossier s'appelle « Herst Connect V1 » (sans le `a`) ; le produit, le repo et le projet
  Vercel s'écrivent **Hearst**.

## Git

- Racine git réelle : ce dossier. Remote : `Hearst-Corporation/hearst-connect-v1`.
- Worktrees déclarés : aucun au 2026-07-27.
