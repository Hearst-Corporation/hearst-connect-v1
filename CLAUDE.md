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
- Package manager : npm (`package-lock.json`) · dev : `npm run dev` · **port : 3000**.
- Aucune base de données. Le contenu du dashboard vient de `src/lib/demo-data.ts` (démonstration
  assumée, annoncée dans l'UI par `DemoNotice`). Brancher une source réelle = chantier suivant.
- Session : cookie httpOnly signé HMAC-SHA256 maison (`src/lib/session.ts`), sans dépendance auth.

## Design system

- Source : **Catalyst officiel**, vendoré non modifié dans `src/components/catalyst/`
  (licence Tailwind Plus incluse). Les composants s'importent entre eux en relatif : une mise à
  jour du kit se fait en recopiant les fichiers, sans réconciliation.
- Vitrine : UI Blocks officiels Tailwind Plus portés en TS dans `src/components/marketing/`,
  chacun avec en commentaire le bloc d'origine. Palette adaptée, structure conservée.
- Accent : **un seul**, `accent-50`→`accent-950` (bleu, H≈217°), déclaré dans
  `src/styles/tailwind.css`. Le reste de l'UI est sur l'échelle `zinc` de Catalyst.
- Rien n'est hérité d'un autre projet — `npm run check:catalyst` le vérifie et échoue sinon.

## Gates & tests

- Gate canonique : `npm run check` = `typecheck` + `lint` + `check:catalyst`. Pas de build dans
  la gate (le build vit dans le déploiement). Cible < 30 s.
- Pas de suite de tests automatisés à ce jour. Les vérifications se font par parcours réel
  (connexion → dashboard → déconnexion) avant livraison.

## Zones no-touch

- `src/components/catalyst/**` — kit officiel. On ne le modifie pas : on l'utilise, ou on le
  remplace en bloc par une version plus récente du kit. `eslint` l'ignore volontairement.

## Secrets

- `AUTH_SECRET`, `ADRIEN_OWNER_EMAIL`, `ADRIEN_OWNER_PASSWORD` — jamais en dur, jamais dans un
  prompt. En local : `.env.local` (gitignoré, `chmod 600`). En production : variables du projet
  Vercel `hearst-connect-v1` (production + preview + development).
- Un mot de passe jetable distinct sert aux parcours pilotés au navigateur : le mot de passe réel
  n'est jamais saisi dans un navigateur automatisé.

## Pièges connus

- `vercel link --project <nom>` **rattache un projet existant** s'il porte ce nom : vérifier
  `vercel project ls` avant, sous peine de viser une production tierce (cas rencontré avec
  `hearst-connect` / `app.hearst.app` le 2026-07-27).
- Le dossier s'appelle « Herst Connect V1 » (sans le `a`) ; le produit, le repo et le projet
  Vercel s'écrivent **Hearst**.

## Git

- Racine git réelle : ce dossier. Remote : `Hearst-Corporation/hearst-connect-v1`.
- Worktrees déclarés : aucun au 2026-07-27.
