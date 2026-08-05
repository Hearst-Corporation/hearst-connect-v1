# Hearst Connect V1 — Aller online : P0 / P1 / P2

> **Périmètre :** frontend (le fork) uniquement. Le back-end et la frontière fork↔back-end
> sont **hors périmètre** (⚪). Déploiement **manuel** sur le projet Vercel **`hearst-connect-v1`**
> uniquement — jamais `hearst-connect` / `app.hearst.app`.
> Base : audit `AUDIT-ENDPOINTS-DATA-DISPLAY-001` + explorations 2026-08-05.

**Légende de portée :** 🟢 frontend (ce repo, dans notre main) · 🟠 config Vercel / GitHub (action Adrien) · ⚪ back-end (externe, hors main).

---

## P0 — Bloque la mise en ligne

| # | Catégorie | Action | Portée | Preuve d'acceptation |
|---|-----------|--------|--------|----------------------|
| 1 | Config | `HEARST_API_URL` (HTTPS) + `AUTH_SECRET` (≥32 c.) définis sur le projet **hearst-connect-v1** (scopes prod/preview/dev) | 🟠 | `checkConfiguration()` → `loginReady=true` ; connexion réelle possible |
| 2 | Charts | Finaliser le travail MUI X non commité + corriger **F-06** (sparkline sans statut) et **F-09** (gauge sans signal de dérive) ; trancher « 2e lib de charts » (frontière isolée = OK) | 🟢 | Tree propre, F-06/F-09 clos, décision doctrine tracée |
| 3 | Véracité | **F-05** faux « live » : dériver l'`Availability` de `bloc.status` via `measuredCount` (~9 sites) | 🟢 | Un compte issu d'une source `STALE` n'affiche jamais « En direct » |
| 4 | Build | `pnpm check` **et** `pnpm build` verts sur le commit final (le build n'est pas dans la gate) | 🟢 | Exit 0 sur les deux |
| 5 | Déploiement | Confirmer le mécanisme : `PROD_AUTODEPLOY: false` → `vercel --prod` manuel ; vérifier `vercel project ls` avant | 🟠 | Déploiement dirigé vers hearst-connect-v1 uniquement |

## P1 — Important, non bloquant

| # | Catégorie | Action | Portée | Preuve d'acceptation |
|---|-----------|--------|--------|----------------------|
| 6 | Véracité | **F-01** `STALLED` → ton critique sur `/admin/runtime` ; **F-03** type `Runtime` unifié ; **F-02** `meta.status` réellement affiché sur `/admin/dashboard` | 🟢 | `STALLED` en rouge ; un seul type `Runtime` ; résumé dashboard = vrai `meta.status` |
| 7 | Build | Épingler Node (`engines` = 22, comme la CI) ou fixer Node dans Vercel | 🟢/🟠 | Version Node verrouillée au déploiement |
| 8 | CI/Git | Branch protection sur `main` : checks `gate` + `truthful-data` requis (OPS-04) | 🟠 | Un build rouge ne peut plus merger |
| 9 | Back-end | Railway / GitHub (`hearst-connect-backend` `main`) : indexeur, révocation session (SEC-07), rate-limit login (BAPI-09). **Pas GPU1.** | ⚪ | Données réelles ; logout révoque côté serveur |

## P2 — Amélioration / dette

| # | Catégorie | Action | Portée | Preuve d'acceptation |
|---|-----------|--------|--------|----------------------|
| 10 | Fonctionnel | `clients` / `conformite` restent honnêtement vides tant que le backend n'expose pas `/api/v1/clients` et `/api/v1/compliance` | ⚪ | États nommés (pas de faux zéro) |
| 11 | Fonctionnel | Actions keeper 501/503 tant que non implémentées côté backend | ⚪ | Rendu tel quel, sans fausse signature |
| 12 | Sécurité | Durcir CSP (nonce, pas de `unsafe-inline`) | 🟢 | CSP prod sans `unsafe-inline` scripts |
| 13 | Cosmétique | **F-10** métadonnée `surface` du registre ; **F-11** renommer `GreenWavePanel` ; **F-12** `formatPercent` | 🟢 | Registre exact ; nom cohérent ; format unifié |
| 14 | A11y | Retest réel clavier / lecteur d'écran / zoom 200 % (navigateur était verrouillé pendant l'audit) | 🟢 | Parcours a11y vérifié en direct |

---

## Livrable 2 — Surface USER (nouveau)

Nouveau segment **`/espace`** (parallèle à `/admin`), gardé par le **même `requireSession()`** — donc **aucun changement de la frontière fork↔back-end** (aujourd'hui toute session connectée est `OWNER` ; l'`investor` est refusé au login, on n'y touche pas). Consomme uniquement des endpoints **session-tier déjà branchés** (`profile`, `btc`, `mining`, `series1-events`, `dashboard`) via `callBackend`. Réutilise intégralement le Design System (ConsoleShell, Panel, MetricCard, AdminSection, ChartFrame, tokens Hearst) — zéro nouveau token, zéro nouvelle lib.

**Navigation (5 entrées) + pages :**

| Route | Page | Source (session-tier) |
|-------|------|-----------------------|
| `/espace` | Cockpit (home) | dashboard / btc (synthèse) |
| `/espace/dashboard` | Tableau de bord (couverture / portefeuille) | dashboard |
| `/espace/bitcoin` | Production Bitcoin | btc (+ mining) |
| `/espace/activite` | Activité (journal des mouvements) | series1-events |
| `/espace/profil` | Profil | profile + session |

Chaque page est construite **véridique dès l'origine** (statuts lus, jamais de faux « live »), donc ne réintroduit pas F-05.

---

## Note de périmètre

Tout ce qui est ⚪ (indexeur, révocation, rate-limit, endpoints `clients`/`compliance`, actions keeper)
est **côté back-end** : signalé ici pour la complétude, **jamais modifié depuis ce fork**.
Les items 🟠 sont des réglages Vercel/GitHub à faire par Adrien.
Notre livraison couvre les items **🟢** + la **surface USER**.
