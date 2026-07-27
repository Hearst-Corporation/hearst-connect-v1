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
│   ├── layout.tsx              racine — police, métadonnées, thème sombre
│   ├── not-found.tsx           404 (bloc officiel Tailwind Plus)
│   ├── (marketing)/            vitrine publique : header, landing, footer
│   ├── (auth)/                 connexion et demande d'accès (AuthLayout Catalyst)
│   └── (app)/                  console protégée (SidebarLayout Catalyst)
│       ├── layout.tsx          garde de session côté serveur
│       ├── application-layout.tsx
│       └── dashboard/          vue d'ensemble, journal, membres, connexions, paramètres
├── components/
│   ├── catalyst/               kit officiel, NON modifié (licence Tailwind Plus incluse)
│   ├── marketing/              blocs officiels portés en TS, palette du projet
│   ├── logo.tsx
│   └── demo-notice.tsx
├── lib/
│   ├── session.ts              création / vérification du cookie signé
│   ├── auth.ts                 annuaire (env) + garde `requireSession`
│   ├── actions.ts              Server Actions login / logout
│   └── demo-data.ts            données de DÉMONSTRATION du dashboard
└── styles/tailwind.css         design system du projet (accent bleu, H≈217°)
```

## Ce qui est réel, ce qui ne l'est pas

Le socle d'authentification est réel : session signée côté serveur, cookie httpOnly,
garde serveur sur toutes les routes `(app)`, déconnexion effective.

Le **contenu du dashboard** (journal d'accès, membres, connexions, interrupteurs de sécurité)
vient de `src/lib/demo-data.ts` et est annoncé comme tel dans l'interface par le bandeau
`DemoNotice`. Aucune de ces valeurs n'est une mesure réelle. Le branchement d'une source de
données est le chantier suivant.

L'inscription libre n'existe pas : `/register` renvoie vers l'équipe, conformément au modèle
« accès sur invitation ».

## Commandes

```bash
npm run dev              # développement
npm run build            # build de production
npm run check            # typecheck + lint + catalyst-doctor
npm run check:catalyst   # vérifie qu'aucun design system étranger n'a fui ici
```

## Design system

Ce workspace déclare **sa propre** palette dans `src/styles/tailwind.css` : un accent unique
(`accent-50` → `accent-950`, bleu H≈217°) posé sur l'échelle `zinc` de Catalyst. Rien n'est
importé d'un autre projet — `npm run check:catalyst` le vérifie et échoue sinon.

Les composants de `src/components/catalyst/` sont le kit officiel **non modifié** : ils se
mettent à jour en recopiant la version à jour du kit, sans réconciliation manuelle.
