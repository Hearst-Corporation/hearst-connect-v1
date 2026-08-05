# AGENTS.md — hearst-connect-v1

<!-- HEARST-GOVERNANCE:START -->
## Gouvernance — ordre de lecture obligatoire
Ce projet est rattaché à la gouvernance centrale Hearst via `.hearst/governance.json`
(repo `Hearst-Corporation/governance`, ref figée au SHA canonique). Avant toute intervention,
lire dans cet ordre :

1. `.hearst/governance.json`
2. doctrine globale
3. règles globales
4. doctrine projet (`doctrine/projects/hearst-connect.md` dans le repo governance)
5. règles projet (`rules/projects/hearst-connect.md` dans le repo governance)
6. AGENTS.md / CLAUDE.md local (ce fichier)
7. mission active

Les règles locales complètent — sans les affaiblir — la doctrine et les règles globales.
<!-- HEARST-GOVERNANCE:END -->

## Règle absolue — GPU1 interdit

Ce dépôt (**hearst-connect-v1**) ne touche **jamais** GPU1 : pas de SSH, pas de
`connect-api.hearst.app`, pas de déploiement via le workflow GPU1 du backend.

**Backend canonique** : code sur GitHub `Hearst-Corporation/hearst-connect-backend`,
runtime sur **Railway** (`HEARST_API_URL` dans `.env.example`). Déploiement backend
= push `main` GitHub → Railway.

**Front** : Vercel `hearst-connect-v1` uniquement.

Détail opérationnel : `.cursor/rules/30-no-gpu1.mdc` et section Architecture du `README.md`.
