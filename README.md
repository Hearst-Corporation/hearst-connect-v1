# Hearst Connect

Front Next.js — vitrine marketing, écran de connexion, console d'administration reliée au backend Hearst Connect.
Interface bâtie **exclusivement** sur les kits officiels Tailwind Plus :
[Catalyst](https://tailwindcss.com/plus/ui-kit) pour l'application, les UI Blocks Marketing pour la vitrine.

## Pile

|           |                                                                               |
| --------- | ----------------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, React 19, Turbopack)                                  |
| Langage   | TypeScript strict                                                             |
| Styles    | Tailwind CSS v4 (`@theme` dans `src/styles/tailwind.css`)                     |
| UI        | Catalyst UI Kit officiel (`src/components/catalyst/`, vendoré tel quel)       |
| Vitrine   | Tailwind Plus UI Blocks officiels, portés en TS (`src/components/marketing/`) |
| Session   | Cookie httpOnly signé HMAC-SHA256, sans dépendance externe                    |

## Démarrer

```bash
cp .env.example .env.local     # puis remplir (voir plus bas)
npm install
npm run dev                    # http://localhost:3000
```

### Variables d'environnement

| Variable                                             | Rôle                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `AUTH_SECRET`                                        | Clé de signature des sessions, 32 caractères minimum (`openssl rand -hex 32`) |
| `HEARST_API_URL`                                     | URL du backend canonique qui authentifie et alimente la console               |
| `ADRIEN_OWNER_EMAIL`                                 | Adresse du compte propriétaire — défaut `adrien@hearstcorporation.io`         |
| `ADRIEN_OWNER_PASSWORD`                              | Mot de passe du compte propriétaire                                           |
| `DEV_QUICK_LOGIN_EMAIL` / `DEV_QUICK_LOGIN_PASSWORD` | Compte réel prérempli pour les parcours locaux uniquement                     |

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
│   └── admin/                  console protégée
│       ├── layout.tsx          garde de session côté serveur
│       ├── admin-shell.tsx     navigation institutionnelle à cinq entrées
│       ├── page.tsx            accueil éditorial
│       └── */                  métier, produit, runtime, API et diagnostics
├── components/
│   ├── catalyst/               kit officiel, NON modifié (licence Tailwind Plus incluse)
│   ├── marketing/              blocs officiels portés en TS, palette du projet
│   ├── logo.tsx
│   └── admin/                  composants applicatifs et graphiques Recharts
├── lib/
│   ├── session.ts              création / vérification du cookie signé
│   ├── auth.ts                 annuaire (env) + garde `requireSession`
│   ├── actions.ts              Server Actions login / logout
│   └── backend/                registre et client serveur du backend
└── styles/tailwind.css         tokens du projet alignés sur hearstcorporation.io
```

## Ce qui est réel, ce qui ne l'est pas

Le socle d'authentification est réel : authentification par le backend canonique, session signée
côté serveur, cookie httpOnly, garde serveur sur toutes les routes `admin`, déconnexion effective.

Les valeurs disponibles de la console proviennent du backend. Les surfaces Clients, Conformité et
les files de validation restent explicitement indisponibles tant qu'aucune route ne les expose :
aucun compteur, graphique ou workflow de remplacement n'est inventé.

L'inscription libre n'existe pas : `/register` renvoie vers l'équipe, conformément au modèle
« accès sur invitation ».

## Commandes

```bash
npm run dev              # développement
npm run build            # build de production
npm run check            # typecheck + lint + Catalyst + anti-mocks + tests
npm run check:catalyst   # vérifie qu'aucun design system étranger n'a fui ici
npm run check:mocks      # bloque les fixtures et fallbacks trompeurs
npm run test             # suite Vitest
```

## Design system

Ce workspace déclare **sa propre** palette dans `src/styles/tailwind.css`, relevée sur
`hearstcorporation.io` : noir, blanc minéral `#FCFDFC`, neutres gris et accent officiel
`#A7FB90`. La fonte propriétaire observée sur le site n'est pas copiée : l'application utilise
`Arial`, son fallback officiel. Rien n'est importé d'un autre projet.

Les composants de `src/components/catalyst/` sont le kit officiel **non modifié** : ils se
mettent à jour en recopiant la version à jour du kit, sans réconciliation manuelle.
