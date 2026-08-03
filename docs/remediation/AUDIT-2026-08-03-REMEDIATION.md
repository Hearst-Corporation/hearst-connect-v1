# Remédiation audit 2026-08-03 — liste d'exécution

> Backlog validé (audit Luc, SHA `4b49dbc`). Ceci n'est PAS un nouvel audit :
> suivi d'implémentation uniquement. Les identifiants et gravités de l'audit
> sont conservés tels quels. Vérification ponctuelle autorisée avant correction
> (retrouver le fichier, tenir compte d'un déplacement, éviter d'écraser un fix).
>
> États : `TODO` · `FIXED` · `ALREADY_FIXED` · `BLOCKED_EXTERNAL` · `REJECTED`
> Branche : `remediation/audit-2026-08-03` — départ `4b49dbc`.

## Lot 1 — P0 véracité + cause commune  ✅ TERMINÉ

SHA du correctif : `6de5275`.
Gate finale : `typecheck` ✓ · `lint` ✓ · `check:mocks` ✓ (145 fichiers) · `test` ✓ **206 tests (21 fichiers)**.
Nouveau fichier de tests comportementaux : `tests/vaults/veracity-p0.test.ts` (15 tests). Preuve que les
tests mordent : sur l'ancienne logique VER-05, `activeVaults` d'un register `[UNREADABLE]` renvoyait
`available "0"` (badgé Live) — le test l'exige `unavailable`, donc il échouait avant le fix.

| ID | Correction appliquée | Fichier | Preuve | État |
|----|----------------------|---------|--------|------|
| VER-05 | Nouvelle fonction `activeVaultCount()` : `unavailable` si un vault `UNREADABLE`, si register vide, ou si liste absente ; sinon compte réel (0 mesuré autorisé). Duplication de `vaults/page.tsx` supprimée (utilise la fonction canonique). | `src/lib/vaults/overview.ts` (activeVaultCount) ; `src/app/admin/vaults/page.tsx` | `veracity-p0.test.ts` 6 tests VER-05 + 1 overview | **FIXED** |
| VER-01 | `aggregate === null` ⇒ Served/Partial/NotOpen/Total/Coverage = `unavailable`, jamais `[]`→0 ; agrégat lu mais vide ⇒ 0 mesuré. | `src/app/admin/dashboard/page.tsx` | typecheck+lint ; logique `asCount()`/`coverageCell` | **FIXED** |
| VER-02 | Movements et Pockets measured = `Availability` gâchée sur `reponse.ok`/`dashboard.ok` ; statuts (Rebalancing/Indexer/Ledger) = `editorial`. | `src/app/admin/operations/page.tsx` | typecheck+lint | **FIXED** |
| VER-03 | Pockets/Curve = `unavailable` si factsheet KO ou allocation/curve absente ; figures = `editorial` si source lue. | `src/app/admin/product/page.tsx` | typecheck+lint | **FIXED** |
| VER-04 | Reserve split / Curve points honnêtes sur `btc.ok`/`factsheet.ok` ; figures `editorial`. (même famille, corrigé en même temps) | `src/app/admin/administration/produit/page.tsx` | typecheck+lint | **FIXED** |
| VER-10 | **Racine commune éliminée** : les 13 helpers `manual()` (+ 1 typé dans `[vaultId]`) supprimés. Deux constructeurs honnêtes ajoutés : `editorial()` (valeur assumée, jamais « Live ») et `measuredCount()` (compte propageant l'absence). 0 `manual(` restant dans `src/app`. | `src/lib/vaults/model.ts` + 14 pages | `grep -rn manual( src/app` = 0 ; `veracity-p0.test.ts` 3 tests VER-10 | **FIXED** |
| VER-09 | Badge découplé de la présence : `signalOf()` classe `live`/`stale`/`editorial`/`absent` selon provenance + `stale`. « Live » réservé aux lectures backend fraîches ; éditorial ⇒ « Reference » (marqueur creux) ; périmé ⇒ « Stale ». | `src/lib/vaults/model.ts` (signalOf) ; `green-metric-strip.tsx` ; `.module.css` | `veracity-p0.test.ts` 5 tests VER-09 | **FIXED** |
| VER-11/12 | series-1 « Types » et runtime : cartes de comptage passées en `Availability` honnête (VER-12 traité avec series-1) ; VER-11 (runtime lit chainId/version au mauvais niveau) = **lot 8** (contrat backend), pas encore traité. | `src/app/admin/series-1/page.tsx` | typecheck | VER-12 **FIXED** · VER-11 TODO(lot 8) |

## Lot 2 — Sécurité & contrôle d'accès  ✅ TERMINÉ

Gate finale : `typecheck` ✓ · `lint` ✓ · `check:mocks` ✓ · `test` ✓ **216 tests (23 fichiers)** ·
`build` prod ✓ (10,7 s, Next 16.2.12) · en-têtes CSP+HSTS **vérifiés en prod réelle**.

| ID | Correction appliquée | Fichier | Preuve | État |
|----|----------------------|---------|--------|------|
| ARCH-01 / BAPI-01 | Garde de session explicite + validation FormData en tête de `probeEndpoint` (refus fail-closed `PERMISSION_DENIED`, comme `keeper.ts`). Audit des 3 modules `'use server'` : keeper déjà gardé, actions=login pré-session par nature. | `src/lib/backend/probe.ts` | `tests/probe-guard.test.ts` (3 tests : anonyme refusé, `fetch` jamais appelé, File non coercé) ; HTTP 307 en prod | **FIXED** |
| SEC-04 | CSP + HSTS(prod) + Permissions-Policy ajoutés (X-CTO/Referrer/X-Frame conservés). `unsafe-eval` dev-only, `upgrade-insecure-requests` prod-only, HSTS prod-only. URL backend absente de `connect-src`. | `next.config.mjs` | curl en prod : CSP + HSTS + Permissions-Policy présents ; `/login` sans violation | **FIXED** |
| OPS-05 / ARCH-05 | `process.env` métier ramené à `env.ts` : accesseurs `devQuickLogin()`/`devQuickLoginAvailable()` ; `session.ts` délègue à `authSecret()` (code mort réactivé). | `env.ts`, `actions.ts`, `login/page.tsx`, `session.ts` | `grep process.env hors env.ts` = ∅ (hors NODE_ENV) ; 31 tests session/login/auth ✓ | **FIXED** |
| SEC-02 | Cookie **chiffré AES-256-GCM** (auth. encryption) au lieu de signé seul : jeton porteur backend plus lisible. Clé dérivée SHA-256 d'AUTH_SECRET ; token versionné `v1` ; IV aléatoire ; tag GCM = anti-falsification. Rotation documentée. | `src/lib/session.ts` | preuve crypto (jeton absent en clair, tamper rejeté) + `tests/session-encryption.test.ts` (7 tests) | **FIXED** |
| SEC-03 | Next.js **16.2.6 → 16.2.12** : 0 vuln Next restante (dont SSRF Server Actions). `brace-expansion` forcé aux versions corrigées via override workspace. Vulns **20 → 6**, toutes dev/build-only et transitives (playwright, next>sharp, next>postcss). | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | `pnpm audit` 20→6 ; build prod ✓ ; 216 tests ✓ | **FIXED** (résiduel dev-only documenté) |
| SEC-07 | Révocation serveur impossible depuis le frontend : le backend n'expose ni logout ni revoke. | — | sondes réelles : `/auth/logout` **404**, `/auth/revoke` **404** ; contrat requis dans `BACKEND-FOLLOWUPS.md` | **BLOCKED_EXTERNAL** |

### Résiduel SEC-03 (documenté, non masqué)
6 vulns restantes, **toutes hors runtime de production** : `playwright` (test), `next>sharp` (build/image-optim),
`next>postcss` (build CSS, 4 advisories). Épinglées par Next 16.2.12 ; un override forcé casserait l'arbre Next.
À lever à la prochaine montée mineure de Next. Aucune n'est atteignable par une requête utilisateur en production.

## Lot 3 — Chaîne qualité & tests  ✅ TERMINÉ

Gate finale : `typecheck` ✓ · `lint` ✓ · `check:mocks` ✓ (7 règles) · `test` ✓ **216 vitest** ·
`e2e` ✓ **17 tests Playwright** (chromium, backend réel).

| ID | Correction appliquée | Fichier | Preuve | État |
|----|----------------------|---------|--------|------|
| OPS-01 | Job CI **repo-local `truthful-data`** qui lance `pnpm check:mocks`, bloquant, indépendant de la gate d'organisation. | `.github/workflows/ci.yml` | YAML valide, 2 jobs (`ci`, `truthful-data`) | **FIXED** |
| OPS-02 | Rapport vitest **JSON** émis sous CI (`/tmp/vitest-report.json`) → le garde-fou « 0 test » peut enfin se déclencher. `check` repassé en `pnpm` (OPS-17). | `vitest.config.mts`, `package.json` | `CI=1 vitest` écrit le JSON avec `numTotalTests` ; dev inchangé | **FIXED** |
| OPS-04 | Protection de branche = réglage GitHub externe. Job CI ajouté côté dépôt ; reste à déclarer `gate`+`truthful-data` required. | — | action externe documentée | **BLOCKED_EXTERNAL** (`BACKEND-FOLLOWUPS.md`) |
| TEST-03 | Couverture élargie : + `actions.ts`, `env.ts`, `overview.ts`, `probe.ts` (surface véracité/sécu, au lieu de 12 fichiers lib seulement). | `vitest.config.mts` | include étendu | **FIXED** |
| check:mocks+ | 2 règles ajoutées : **FORCED_AVAILABLE** (objet `available/manual` inline hors model.ts) et **COUNT_FROM_EMPTY_FALLBACK** (`?? [].length`). A détecté un résiduel réel (`clients/page.tsx:93`, corrigé en `editorial()`). | `scripts/check-no-mocks.mjs`, `clients/page.tsx` | règles prouvées « mordantes » ; `kind:'available'` n'existe plus que dans model.ts | **FIXED** |
| TEST-02 | e2e comportementaux : chaque route admin rend 200 sans erreur console ; dashboard n'étiquette pas une absence « Live » ; Server Action anonyme ne renvoie pas de sonde live. | `e2e/veracity.spec.ts` | 3 tests ✓ | **FIXED** |
| TEST-04 | e2e contrôle d'accès : anonyme refusé (6 routes), login valide/invalide, cookie forgé/mauvais-secret/expiré rejetés, IDOR/injection. | `e2e/access-control.spec.ts` | 13 tests ✓ | **FIXED** |
| TEST-05 | e2e : logout efface la session, le bouton retour ne ressuscite pas le contenu protégé. | `e2e/access-control.spec.ts` | 1 test ✓ | **FIXED** |

Harnais : `@playwright/test@1.51.1` ajouté (dev), `playwright.config.ts` (webServer auto sur :3200,
auth via dev quick-login, backend réel), script `pnpm e2e`. Specs hors du glob vitest (`.spec.ts` sous `e2e/`).

## Lot 6 — Responsive, mobile & accessibilité  🟡 EN COURS

| ID | Correction appliquée | Fichier | Preuve | État |
|----|----------------------|---------|--------|------|
| UI-02 | Déconnexion mobile rétablie : le pied du rail ne fait plus `display:none` sous 760 px ; il rejoint la barre horizontale, l'action « Sign out » reste tactile (cible 111×44). | `green-command-center.module.css` | e2e + mesure navigateur : visible @375/390/760 px, clic → /login | **FIXED** |
| UI-01 | Défilement vertical du workspace : `overflow-y:auto` au lieu de `hidden` — le contenu au-delà du viewport (écran bas, zoom) devient atteignable ; cockpit inchangé sur écran haut. | `green-command-center.module.css` | mesure : routes coupées @1440×600 → atteignables après fix | **FIXED** |
| UI-06 | Frontières ajoutées : `admin/loading.tsx` (état « loading » nommé), `admin/error.tsx` (erreur nommée + retry, `digest` non exposé), `global-error.tsx` (erreur de layout racine). | `src/app/admin/loading.tsx`, `error.tsx`, `src/app/global-error.tsx` | typecheck ✓ ; e2e « renders 200 no console error » ✓ | **FIXED** |
| UI-07 | `<html lang="fr">` déjà en place. La console est en anglais : la migration FR complète (LANGUE PRODUIT) est le **Lot 4** — les nouveaux fichiers sont alignés sur l'anglais pour ne pas casser `language-regression`. | — | — | PARTIEL → Lot 4 |
| UI-04/10/12/14/16 | (reste du lot) cohérence verts, WideTableScroll, barre de défilement, sémantique tables, bascule de thème. | — | — | TODO |

## Lot 7 — Nettoyage architectural (code mort)  🟡 EN COURS

Gate finale : typecheck ✓ lint ✓ check:mocks ✓ (131 fichiers) test ✓ (217) · build/e2e ✓.
knip : **30 → 18 fichiers morts** (les 18 restants = 17 Catalyst vendorés conservés + 1 script docs hors périmètre).

| ID | Correction appliquée | Preuve | État |
|----|----------------------|--------|------|
| DEAD-05 | `chart.js` + `react-chartjs-2` retirés de package.json (0 import prouvé). | knip « unused dependencies » disparu ; 3 paquets retirés | **FIXED** |
| DEAD-02 / ARCH-03 | Branche `AdminShell` inatteignable supprimée : les 18 routes admin sont toutes dans `GREEN_SHELL_ROUTES`. `admin-layout-client.tsx` + `admin-shell.tsx` + `cockpit-sidebar-layout.tsx` supprimés ; `layout.tsx` simplifié (garde `requireSession()` conservée). | e2e : garde /admin toujours 307 ; `admin-nav.ts` conservé (encore utilisé) | **FIXED** |
| DEAD-01/09 (partiel) | 14 composants orphelins supprimés sous `components/admin` + `components/vaults` (grep de preuve : 0 import réel). | knip -12 | **FIXED** |
| DEAD-06 | Kit Catalyst : **conservé** (vendoré, décision produit) même si 17 fichiers inutilisés — à documenter (`VENDOR.md`, Lot 4). | — | GARDÉ (voulu) |

| ARCH-02 | `/design-lab/admin-home-green` (sandbox dupliquant `/admin`) : garde `if (NODE_ENV==='production') notFound()` avant tout. Dev inchangé, prod = 404. | **prouvé en prod réelle** : user authentifié → 404 | **FIXED** |
| DEAD-04 / BAPI-07 | `resolved-mapper.ts` : 0 import runtime (seul `resolved.test.ts` l'exerce). Module cohérent et testé, **conçu** comme mapper canonique mais non branché. Décision : **conservé + documenté** plutôt que supprimé — le supprimer optimiserait le compteur knip au prix d'une abstraction délibérée. À brancher ou retirer sur décision produit. | grep : 0 import hors test | DOCUMENTÉ |

Reste Lot 7 : brancher/retirer `resolved-mapper` (décision produit), assets/PNG (16 Mo docs).

## Lot 8 — Backend, contrats & observabilité  🟡 EN COURS

| ID | Correction appliquée | Preuve | État |
|----|----------------------|--------|------|
| BAPI-03 | Type `Runtime` + accès alignés sur le payload réel : `serviceVersion`, `contract.chainId`. | navigateur : Version 0.1.0, Chain 31 337 (étaient « — ») | **FIXED** |
| BAPI-04 | `resolvePath` construit une query string pour les params hors chemin (`limit`) au lieu de les jeter ; segments encodés. | test endpoint-registry ✓ | **FIXED** |
| OPS-06 | Journalisation structurée par appel backend (`console.info` JSON) : requestId, route, statut, durée, raison nommée. **Jamais** de jeton/Authorization/cookie/payload. | `tests/backend-logging.test.ts` (2 tests prouvant l'absence de fuite) | **FIXED** |
| BAPI-08 | `strategy-detail` (`/api/v1/strategies/:index`) est déclaré au registre mais atteignable par aucun chemin UI (l'API explorer refuse les chemins paramétrés). Pas cassé, pas exposé — pas de feature inventée. | — | DOCUMENTÉ (limitation connue) |
| BAPI-12/13/16 | normalisation Bearer/headers, retry/timeout idempotent. | — | TODO |

## Lot 4/5 — Design System & langue produit  🔴 CONDITIONNÉ À LA DOCTRINE

Le document `HEARST-CONNECT-V1-DESIGN-SYSTEM-DOCTRINE.md` **n'est pas présent dans le dépôt**
(cherché : absent de `src/`, racine, docs/). Il définit le contrat cible (tokens exacts, contrats
des compositions PageShell/KpiRow/ChartPanel, glossaire FR, structure de dossiers). Ce qui suit est
donc soit **fait sans dépendance**, soit **conditionné** — sans inventer un design system ni un
glossaire de traduction.

| ID | État | Détail |
|----|------|--------|
| Catalyst VENDOR.md | **FIXED** | `src/components/catalyst/VENDOR.md` créé : source, licence, 27 fichiers / 9 importés, adaptations, dette. Exigé par le prompt. |
| LANGUE PRODUIT (FR) | **BLOQUÉ (décision requise)** | Le prompt demande le **français canonique**. Or la console a été **délibérément migrée en anglais** (mission HC-UI-NORMALIZATION-001, gardée par `tests/language-regression.test.ts` : les libellés métier de `mouvements.ts` sont en anglais). Traduire = **inverser une décision testée** ET deviner la terminologie que la doctrine absente doit fixer. `<html lang="fr">` est en place ; la traduction complète des 25 surfaces + inversion du test est conditionnée à la doctrine (glossaire). Ne pas deviner. |
| Tokens centralisés, compositions canoniques, Recharts wrappers, Aceternity | TODO (conditionné) | `layout-tokens.ts`, `chart-theme.ts` existent ; la consolidation en `PageShell/KpiRow/ChartPanel` et la structure de dossiers suivent la doctrine. |

## Lots suivants (résumé — détaillés à l'ouverture de chaque lot)

| ID | Sujet | État |
|----|-------|------|
| TEST-02/04/05 | Playwright comportemental | TODO |
| UI-01/02/04/06/07/10/12/14/16 | responsive, mobile, a11y, langue | TODO |
| DEAD-01…10 | code mort, chart.js, `/design-lab` | TODO |
| BAPI-03/04/08/12/13/16 | contrats backend côté front | TODO |
| OPS-06 | observabilité (requestId) | TODO |
| VER-06/07/08/11…, P2/P3 | reliquat véracité + mineurs | TODO |
