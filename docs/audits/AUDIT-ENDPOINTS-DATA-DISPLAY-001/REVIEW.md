# AUDIT-ENDPOINTS-DATA-DISPLAY-001 — Backend → Frontend → Layout

Branche `audit/endpoints-data-display-2026-08-05`, créée depuis `main` à `df5d910`
(= `origin/main`), laissée intacte. Aucune écriture backend, aucune donnée inventée,
aucun placeholder rempli.

## VERDICT GLOBAL

- **Conformité backend/frontend** : bonne. Le registre `endpoints.ts` (25 endpoints)
  fait autorité, tous les consommateurs le respectent, aucun endpoint hardcodé ailleurs.
- **Vérité des données** : globalement solide (doctrine `Availability`/`Resolved`
  mature, gate `check-no-mocks` verte) mais **un défaut systémique confirmé** : les
  compteurs dérivés (`.length`, `.filter().length`, `.size`) badgent `provenance:'live'`
  en dur, sans jamais lire le `status` réel du champ source — un compte issu d'une
  donnée `STALE` s'affiche comme aussi frais qu'une donnée `LIVE`.
- **Couverture des endpoints** : 23/25 consommés et branchés ; 1 mort côté frontend
  (`strategy-detail`), 1 mapper canonique mort (`resolved-mapper.ts`, jamais importé).
- **Qualité du layout** : bonne, mesurée en DOM lors du sweep du 2026-08-04 (0 défaut
  résiduel sur 6 indicateurs, relecture humaine faite le lendemain, corrigée, captures
  régénérées sur le HEAD actuel).
- **Qualité du display** : globalement honnête (distinctions "indisponible" / "pas
  encore ouvert" / "obsolète" bien présentes dans la plupart des pages) avec une
  incohérence notable entre `/admin/runtime` et `/admin/operations` sur le même
  statut backend (`STALLED`).
- **Responsive** : sain sur les captures disponibles (desktop/laptop/tablette/mobile),
  aucun débordement, aucune troncature, aucun texte verticalisé résiduel. Non revérifié
  en direct au clavier/lecteur d'écran (navigateur indisponible pendant cette mission,
  voir Limites).
- **Accessibilité** : structure H1 unique (sr-only) + H2 visuel par page, contraste
  déjà corrigé lors d'un audit antérieur. Non testée au lecteur d'écran réel.
- **Risque de déploiement** : **modéré**. Rien de destructif ni de dangereux, mais le
  P0 de véracité (faux "live") touche une dizaine de fichiers et peut induire une
  confiance excessive dans des données obsolètes sur plusieurs pages business.
- **Recommandation** : traiter le LOT 1 (vérité des statuts dérivés) avant toute
  autre chose ; le reste est de la dette raisonnable, déjà largement traitée par les
  sweeps précédents.

---

## 1. Contexte exact du projet

```
PROJET CIBLE CONFIRMÉ
- projet        : hearst-connect (Hearst Connect V1)
- chemin        : /Users/adrienbeyondcrypto/Desktop/Herst Connect V1
- remote        : origin → https://github.com/Hearst-Corporation/hearst-connect-v1.git
- branche       : audit/endpoints-data-display-2026-08-05 (créée pour cette mission)
- SHA de base   : df5d9104e8b68bdca6b2414c18a2a713d14cd493 (= main = origin/main)
- frontend      : Next.js 16.2.6 (App Router, Turbopack), React 19.2.6, TS strict, Tailwind v4
- backend       : service Hearst Connect distant (hors dépôt), via HEARST_API_URL
- port frontend : 3000 par défaut ; serveur dev vérifié sur 4105 pour cette session
- port backend  : externe, non local
- commande front: pnpm dev / pnpm build / pnpm start
- environnement : .env.local (chmod 600) + .env.example, lecture exclusive via src/lib/env.ts
```

**Occupation de `main` au démarrage** : des modifications non commitées existaient
dans le dossier principal (package.json, pnpm-lock.yaml, `src/app/admin/operations/page.tsx`,
`src/app/admin/series-1/page.tsx`, `src/components/charts/index.ts`,
`src/components/charts/polar/allocation-chart.tsx`, `src/components/compositions/metric.tsx`,
+ dossier non suivi `src/components/charts/mui-x/`). Ce travail en cours a été
**préservé intact** : une branche d'audit dédiée a été créée depuis le même HEAD
plutôt que d'écrire sur `main`. Ces fichiers apparaissent dans ce rapport comme
`(diff en cours)` — analysés en lecture seule, jamais modifiés.

**Autres worktrees actifs constatés** (non touchés) : `hearst-connect-v1-cleanup`,
`hearst-connect-v1-green-lab`, `hearst-connect-v1-hygiene`, `hearst-connect-v1-main`
(HEAD détaché), `hearst-connect-v1-sweep`, `hearst-connect-v1-ui`.

---

## 2. Liste complète des endpoints (source : `src/lib/backend/endpoints.ts`)

Registre unique, 25 endpoints, 4 catégories. Aucun endpoint n'est déclaré ailleurs
dans le code (vérifié — `endpoints.ts` est bien la seule source).

| id | Méthode | Path | Catégorie | Auth | Enveloppé | Surface déclarée | Classification |
|---|---|---|---|---|---|---|---|
| `health` | GET | `/health` | probe | public | non | `/admin/runtime` | ACTIF_ET_CONSOMMÉ |
| `ready` | GET | `/ready` | probe | public | non | `/admin/runtime` | ACTIF_ET_CONSOMMÉ |
| `runtime` | GET | `/api/v1/runtime` | probe | public | non | `/admin/runtime` | ACTIF_ET_CONSOMMÉ (+ `operations`) |
| `dashboard` | GET | `/api/v1/dashboard` | business | session | oui | `/admin/dashboard` | ACTIF_ET_CONSOMMÉ (3 consommateurs) |
| `profile` | GET | `/api/v1/profile` | business | session | oui | `/admin/profile` | ACTIF_ET_CONSOMMÉ |
| `series1-events` | GET | `/api/v1/series1/events` | business | session | oui | `/admin/series-1` | ACTIF_ET_CONSOMMÉ (4 consommateurs) |
| `vault` | GET | `/api/v1/vault` | business | session | oui | `/admin/vaults`* | ACTIF_ET_CONSOMMÉ |
| `vault-strategies` | GET | `/api/v1/vault/strategies` | business | session | oui | `/admin/vaults`* | ACTIF_ET_CONSOMMÉ |
| `strategy-detail` | GET | `/api/v1/strategies/:index` | business | session | oui | `/admin/vaults`* | **CONSOMMÉ_MAIS_CASSÉ** (mort — voir §11 F-04) |
| `rwa-vault` | GET | `/api/v1/rwa-vault` | business | session | oui | `/admin/vaults`* | ACTIF_ET_CONSOMMÉ |
| `rebalancing-status` | GET | `/api/v1/rebalancing/status` | business | admin | oui | `/admin/vaults`* | ACTIF_ET_CONSOMMÉ (+ `operations`) |
| `mining` | GET | `/api/v1/mining` | business | session | oui | `/admin/mining` | ACTIF_ET_CONSOMMÉ |
| `mining-onchain` | GET | `/api/v1/mining/metrics/onchain` | business | session | oui | `/admin/mining` | ACTIF_ET_CONSOMMÉ (raw JSON only) |
| `mining-electricity` | GET | `/api/v1/mining/electricity` | business | session | oui | `/admin/mining` | ACTIF_ET_CONSOMMÉ (raw JSON, jamais réconcilié — voir F-07) |
| `btc` | GET | `/api/v1/btc` | business | session | oui | `/admin/btc` | ACTIF_ET_CONSOMMÉ (3 consommateurs) |
| `product-factsheet` | GET | `/api/v1/product/factsheet` | business | session | oui | `/admin/product` | ACTIF_ET_CONSOMMÉ |
| `backtest-historical` | GET | `/api/v1/backtest/historical` | business | session | oui | `/admin/backtest` | ACTIF_ET_CONSOMMÉ (registre vide en prod) |
| `ai-context-dashboard` | GET | `/api/v1/ai/context/dashboard` | ai-context | session | non | `/admin/api-explorer` | ACTIF_ET_CONSOMMÉ (debug only) |
| `ai-context-btc` | GET | `/api/v1/ai/context/btc` | ai-context | session | non | `/admin/api-explorer` | ACTIF_ET_CONSOMMÉ (debug only) |
| `ai-context-mining` | GET | `/api/v1/ai/context/mining` | ai-context | session | non | `/admin/api-explorer` | ACTIF_ET_CONSOMMÉ (debug only) |
| `keeper-mining-report` | POST | `/api/v1/mining/metrics/report` | keeper | admin | non | `/admin/keeper` | ACTIF_ET_CONSOMMÉ |
| `keeper-electricity-pay` | POST | `/api/v1/mining/electricity/pay` | keeper | admin | non | `/admin/keeper` | ACTIF_ET_CONSOMMÉ |
| `keeper-rebalancing-execute` | POST | `/api/v1/rebalancing/execute` | keeper | admin | non | `/admin/keeper` | ACTIF_ET_CONSOMMÉ |
| `keeper-rwa-vault` | POST | `/api/v1/rwa-vault` | keeper | admin | non | `/admin/keeper` | ACTIF_ET_CONSOMMÉ (501 documenté) |
| `keeper-btc-deposit-initiate` | POST | `/api/v1/btc-deposit/initiate` | keeper | admin | non | `/admin/keeper` | ACTIF_ET_CONSOMMÉ (501 documenté) |
| `keeper-btc-deposit-complete` | POST | `/api/v1/btc-deposit/complete` | keeper | admin | non | `/admin/keeper` | ACTIF_ET_CONSOMMÉ (501 documenté) |

`*` **Incohérence de métadonnée relevée** : `endpoints.ts` déclare `surface:
'/admin/vault'` (singulier) pour ces 5 entrées, mais la donnée s'affiche réellement
sur `/admin/vaults` (pluriel) et `/admin/vaults/[vaultId]` — `/admin/vault` n'est
qu'une redirection pure (`src/app/admin/vault/page.tsx`) vers `/admin/vaults`. Le
champ `surface` du registre est **obsolète pour ces 5 lignes**, sans impact fonctionnel
(l'API Explorer reste correct grâce au routage réel), mais trompeur pour quiconque
lit le registre comme documentation.

### Test réel des endpoints (backend direct, en lecture seule, sans secret)

| Test | Résultat |
|---|---|
| `GET /health` | `HTTP 200` en 0.66s |
| `GET /ready` | `HTTP 200` — `{"ready":true,"db":"ok","latencyMs":4}` |
| `GET /api/v1/runtime` (public) | `HTTP 200` — révèle `indexerStatus:"STALLED"`, `indexerScheduler.consecutiveErrors:3983`, `lastSuccessAt:null`, `contract.codePresence:"unverified"` |
| `GET /api/v1/dashboard` sans session | `HTTP 401` — Problem+JSON propre (`code:"UNAUTHORIZED"`, `requestId` présent) |
| `GET /api/v1/vault` sans session | `HTTP 401` — idem |
| `GET /api/v1/rebalancing/status` sans session | `HTTP 401` — idem (le caveat "403 qui annonce 401" concerne le cas *session non-admin*, non testé ici sans risquer une élévation) |
| `GET /api/v1/route-inexistante` | `HTTP 404` — Problem+JSON propre |
| Frontend `/admin/dashboard` sans session | `HTTP 307` → `Location: /login?reason=expired` (pas de fuite de structure) |
| Frontend `/route-inexistante-404` | `HTTP 404` |
| Frontend `/`, `/login`, `/register` | `HTTP 200` |

Aucune mutation (POST keeper) exécutée — hors périmètre d'un audit read-only, contrat
déjà vérifié par lecture de code (voir §11 F-08, conforme).

---

## 3. Matrice endpoint → route → composant (extraits significatifs)

Matrice complète des 25 lignes produite par l'agent d'exploration ; voici les
entrées qui portent une anomalie ou méritent l'attention du lecteur (le détail
fichier:ligne de chaque ligne est repris tel quel dans §11) :

| Endpoint | Mapper réel | Type frontend | Anomalie |
|---|---|---|---|
| `runtime` | aucun (lecture directe) | **`Runtime` redéfini 2×** différemment (`runtime/page.tsx` vs `operations/page.tsx`) | F-01 |
| `dashboard` | `fromResolu` (local à `registry.ts`, **pas** `resolved-mapper.ts`) | 3 types locaux différents | F-02 (`meta.status` jamais affiché) |
| `vault-strategies` | `construireStrategies` | `Strategy` | caveat "fournit les vrais index" jamais vérifiable — personne ne les consomme (F-04) |
| `strategy-detail` | aucun | aucun | mort, jamais appelé (F-04) |
| `series1-events` | `construireMouvements` (vaults) ; lecture directe ailleurs (series-1, mining, operations) | `Mouvement`/`Movement` — types locaux différents par page | compteurs dérivés en faux-live (F-05, P0) |
| `mining-onchain` / `mining-electricity` | aucun (raw JSON) | `unknown` | jamais réconciliés avec `mining.electricity` (F-07) |
| `btc` | `buildBitcoinViewModel` | `Btc` redéfini dans **3 fichiers** différents | incohérence de schéma latente |
| `keeper-*` (6) | `runKeeperAction` + `stateForHttpFailure` | `KeeperActionResult` | conforme — `reason` toujours lu, jamais `code` |

---

## 4. Inventaire des pages (20 routes)

Voir tableau complet produit par l'agent d'exploration — repris intégralement,
vérifié cohérent avec le registre d'endpoints et avec les captures. Point structurel
valable pour **toutes** les pages `/admin/*` : le H1 sémantique est injecté par
`ConsoleShell` (`src/components/layout/console-shell.tsx:44`), `sr-only`, à partir
de la prop `label` — ce qui est visuellement pris pour un titre de page est un `h2`
dans la carte hero. Choix délibéré et documenté (commentaire du fichier), pas un défaut.

| Route | Objectif | Endpoints | Défaut observé |
|---|---|---|---|
| `(auth)/login` | Authentification | aucun (Server Action) | aucun |
| `(auth)/register` | Accès sur invitation | aucun | aucun |
| `(marketing)/page` | Vitrine | aucun | aucun |
| `admin/administration` | Portail de navigation | aucun direct | aucun |
| `admin/administration/produit` | Vue produit consolidée | mining, btc, product-factsheet, backtest-historical | 3 `ChartFrame` vides nommés (états gérés, pas des TODO) |
| `admin/api-explorer` | Explorateur des 25 endpoints | les 25 | aucun |
| `admin/backtest` | Historique de backtests | backtest-historical | registre vide en prod (donnée insuffisante, pas un bug) |
| `admin/btc` | Bitcoin | btc | aucun structurel |
| `admin/clients` | Annuaire clients | **aucun** (`/api/v1/clients` inexistant) | ENDPOINT_MANQUANT documenté |
| `admin/conformite` | File KYC/KYB | **aucun** (`/api/v1/compliance` inexistant) | ENDPOINT_MANQUANT documenté |
| `admin/dashboard` | Couverture des 18 surfaces business | dashboard | `meta.status` jamais affiché (F-02) |
| `admin/keeper` | 6 actions Keeper | les 6 keeper | aucun |
| `admin/mining` | Rentabilité minage | mining, btc, series1-events | aucun structurel |
| `admin/operations` | Rééquilibrage, journal, fraîcheur | series1-events, rebalancing-status, dashboard, runtime | traite `STALLED` correctement (mieux que `runtime`) |
| `admin/page` (racine) | Vue d'ensemble | dashboard (via registry) | `GreenWavePanel` mal nommé (affiche une table, pas une "vague" — résiduel cosmétique) |
| `admin/product` | Fiche produit | product-factsheet | aucun |
| `admin/profile` | Identité admin vs dossier investisseur | profile | aucun |
| `admin/runtime` | État technique du service | runtime, health, ready | `STALLED` sous-représenté (F-01, P1) |
| `admin/series-1` | Journal Series 1 | series1-events | compteurs en faux-live (F-05, P0) |
| `admin/vault` | Redirection historique | aucun | `surface` obsolète dans le registre (cosmétique documentaire) |
| `admin/vaults` | Registre des coffres | vault (+3 autres via registry) | aucun |
| `admin/vaults/[vaultId]` | Détail d'un coffre | vault, vault-strategies, rwa-vault, rebalancing-status | aucun |

---

## 5. KPIs, tableaux, graphiques — synthèse

**KPIs** : partout où un KPI est un compte dérivé (`.length`), le défaut F-05
s'applique potentiellement — voir §11. Les KPIs de statut binaire (santé, prêt,
environnement) sont corrects par construction (dérivés d'un vrai health-check).

**Tableaux** : 20+ tableaux inventoriés (registre des coffres, journal des
mouvements, file de rééquilibrage, exceptions clients, matrice d'état runtime…).
Aucune troncature ni débordement mesuré sur les captures disponibles. Alignement
texte/nombre cohérent.

**Graphiques** : catalogue de 12 composants (`src/components/charts/`), moteur
Recharts pour l'essentiel, MUI X Charts pour 3 composants (`MuiDistributionChart`,
`MuiSparkline`, `MuiAllocationGauge` — **non commités**, déjà intégrés au catalogue
`charts/index.ts` avec frontière documentée, déjà consommés dans 3 fichiers). Aucun
graphique donut/camembert (choix documenté). Pas de nouvelle librairie installée
pendant cet audit, conformément à l'interdiction.

**Placeholders** : aucun placeholder "muet" ou trompeur trouvé. 17 états d'absence
recensés, tous nommés et motivés (`NOT_EXPOSED`, `DONNÉES_INSUFFISANTES`,
`ENDPOINT_MANQUANT`) ; 2 faux positifs (`placeholder` HTML de formulaire, négation
du mot "mock" dans un commentaire).

---

## 6. Audit de véracité — findings détaillés

Voir tableau complet §11. Point structurel : la gate `check-no-mocks` (mécanique)
est verte et le reste — mais elle ne peut pas détecter un `provenance: 'live'`
codé en dur indépendamment du statut réel de la source, ce qui est précisément le
défaut trouvé ici. C'est un rappel utile : **une gate mécanique verte n'est pas une
preuve de véracité totale**, seulement l'absence des motifs qu'elle sait chercher.

---

## 7. Layout et responsive

Basé sur `docs/visual-reviews/HC-PAGES-SWEEP-2026-08-04/` — sweep DOM mesuré (pas
juste visuel) sur 23 routes × 4 viewports (1440/1280/768/375px), relecture humaine
faite le lendemain (6 défauts trouvés, corrigés), captures régénérées sur le HEAD
actuel (`df5d910`, confirmé par `git show --stat`).

| Indicateur | Relevé initial | Final |
|---|---:|---:|
| Anglais visible | 9 | 0 |
| Textes verticalisés | 9 | 0 |
| Troncatures | 74 | 0 |
| Débordements horizontaux | 1 | 0 |
| Défilements imbriqués | 0 | 0 |
| Panneaux vides anormaux | 0 | 0 |

Deux causes racines documentées et corrigées : un conteneur de requête qui
s'interrogeait lui-même (`AdminGrid`), et des paliers responsive mesurant le
viewport au lieu du conteneur réel (`console.module.css`).

**Échantillon revérifié manuellement pendant cet audit** (captures existantes,
lues et confrontées au code) :
- `/admin/runtime` desktop/mobile : layout propre, `STALLED` visible mais tonalité
  "Partiel" (orange) plutôt que "Critique" (rouge) — voir F-01.
- `/admin/operations` desktop : `STALLED` correctement en rouge "Indisponible" avec
  contexte riche ("31,001 erreurs consécutives") — traitement plus honnête qu'à `/admin/runtime`.
- `/admin/dashboard` desktop : tableau de couverture lisible, aucune troncature,
  distinction claire "Partiellement servi" / "Non ouvert".
- `/admin/vaults` desktop/mobile : tableau de coffres propre, un seul coffre réel
  affiché honnêtement ("Illisible", pas de faux zéro).

## LIMITE DE CETTE PHASE

Le navigateur Playwright partagé (`hearst-pro`) était verrouillé par une autre
session/mission pendant toute la durée de cet audit — impossible d'ouvrir une
session interactive pour vérifier le scroll horizontal réel, la navigation clavier,
ou un test de zoom 200 % en direct. L'analyse s'appuie donc sur : (a) les captures
DOM-mesurées du sweep du 2026-08-04, confirmées régénérées sur le HEAD exact audité
ici, et (b) une lecture structurelle du CSS/grid. Aucun test VoiceOver/NVDA réel
n'a été exécuté — voir §9.

---

## 8. Hiérarchie H1/H2/H3 et langue

- **H1 unique par page**, `sr-only`, contrat de design documenté et intentionnel
  (`console-shell.tsx:35-44`, corrige un défaut d'accessibilité antérieur où le
  plan démarrait au niveau H2).
- **0 anglais visible résiduel** mesuré sur le dernier sweep (hors codes techniques
  contractuels : `LIVE`, `STALLED`, `GET`/`POST`, identifiants — exclusion assumée
  et documentée).
- Locale financière `en-US` sur 5 fichiers : **décision produit non tranchée**,
  documentée comme telle dans le REVIEW.md du sweep (changement tenté puis annulé,
  7 tests dont `language-regression.test.ts` l'interdisent explicitement). Classé
  **décision produit**, pas dette technique — hors périmètre de correction ici.

## 9. Accessibilité observable

- Structure de titres : conforme (H1 sr-only + H2 par section).
- Contraste : audité et corrigé lors d'une mission antérieure (39 échecs mesurés
  puis résolus via le `dark` du `ConsoleShell` — commentaire du fichier en fait foi).
- Statut jamais porté par la seule couleur : les badges `AdminStatusMatrix`
  associent toujours un texte au ton (ex. "Partiel", "Indisponible").
- **Non testé dans cette mission** : navigation clavier réelle, lecteur d'écran
  réel (VoiceOver/NVDA), zoom 200 % en direct — navigateur indisponible (voir §7).
  Ne pas déclarer ces tests faits serait mentir ; ils sont classés limite connue.

## 10. Performance et sécurité — observations rapides

- Aucun appel dupliqué évident détecté dans le code lu ; `dynamic = 'force-dynamic'`
  partout (Server Components), cohérent avec l'architecture fail-closed documentée.
- `mining-onchain`/`mining-electricity` sont deux lectures isolées jamais
  réconciliées avec l'agrégat `mining` déjà utilisé par la même page (F-07,
  redondance sans garde de cohérence, pas un risque de sécurité).
- Routes admin protégées correctement (307 sans session, pas de fuite de structure).
- Aucune clé secrète journalisée ou affichée pendant les tests (vérifié à chaque
  commande curl — sorties inspectées avant citation dans ce rapport).
- Aucune tentative d'élévation de privilège ni de mutation destructive effectuée.

---

## 11. FINDINGS

### P0 — CRITIQUE

**F-05 — Faux "live" systémique sur les compteurs dérivés d'une source `Resolved`**
- **Route(s)** : `/admin/series-1`, `/admin/backtest`, `/admin/btc`, `/admin/mining`,
  `/admin/product`, `/admin/operations`, `/admin/administration/produit`,
  `/admin/dashboard`.
- **Fichiers** : [series-1/page.tsx:125-132](src/app/admin/series-1/page.tsx#L125),
  [backtest/page.tsx:92](src/app/admin/backtest/page.tsx#L92),
  [btc/page.tsx:628,632](src/app/admin/btc/page.tsx#L628),
  [mining/page.tsx:641](src/app/admin/mining/page.tsx#L641),
  [product/page.tsx:182](src/app/admin/product/page.tsx#L182),
  [operations/page.tsx:879,885](src/app/admin/operations/page.tsx#L879),
  [administration/produit/page.tsx:185,191](src/app/admin/administration/produit/page.tsx#L185),
  [vaults/pockets.ts:60](src/lib/vaults/pockets.ts#L60),
  [dashboard/page.tsx:155,164](src/app/admin/dashboard/page.tsx#L155).
- **Preuve** : `series-1/page.tsx:125-126` — `mouvements.length` badgé
  `available(String(...), { provenance: 'live', asOf: null })` dès que
  `mouvements !== null/undefined` (ligne 124), **sans jamais lire** `bloc.status`
  (ligne 118 : `bloc = reponse.data.events`, un objet qui porte un `status` réel
  potentiellement `STALE`/`PARTIAL` d'après le contrat `BackendResolved` de
  `resolved-mapper.ts:20`).
- **Impact** : un compte dérivé d'une donnée que le backend a lui-même signalée
  comme obsolète s'affiche à l'écran avec la même autorité visuelle qu'une donnée
  fraîche — exactement l'interdiction "stale présenté comme live" de la mission.
- **Cause** : le mapper canonique censé faire cette traduction (`fromBackendResolved`,
  `resolved-mapper.ts`) existe, est bien conçu (gère `LIVE`/`STALE`/`PARTIAL`/etc.
  correctement), mais **n'est importé nulle part** dans le code de production
  (vérifié par grep global). Chaque page a réimplémenté sa propre garde
  "response.ok && value non-null", qui ne capture qu'une dimension (présence) et
  perd l'autre (fraîcheur).
- **Recommandation** : câbler `fromBackendResolved` (ou équivalent) à la construction
  de ces compteurs, pour que `signalOf` puisse réellement retourner `'stale'` quand
  c'est le cas. Ne pas inventer de nouvelle logique — le mapper correct existe déjà.
- **Risque de correction** : faible à moyen — changement mécanique répété sur ~9
  sites, testable unitairement, mais touche des pages business à fort trafic admin.
- **Propriétaire probable** : équipe frontend (véracité des données), en lien avec
  la doctrine `VER-*` déjà établie dans le projet.

**F-06 — Sparklines de tendance sans propagation du statut (diff en cours, non commité)**
- **Route(s)** : `/admin/series-1`, `/admin/operations`.
- **Fichiers** : `series-1/page.tsx` (diff non commité, lignes ~136-153),
  `operations/page.tsx` (diff non commité, lignes ~887-899).
- **Preuve** : `movementTrend` est calculé à partir de `mouvements` (groupement par
  jour) puis rendu par `MuiSparkline`, sans vérifier le `status` de la source — même
  défaut que F-05 appliqué à une visualisation. La carte "État du journal" juste à
  côté affiche, elle, le vrai statut — l'incohérence est donc visible à l'écran :
  un badge "obsolète" à côté d'un sparkline à l'air frais.
- **Impact** : identique à F-05, avec une dimension visuelle aggravante (une courbe
  qui a l'air "vivante" est plus trompeuse qu'un simple chiffre).
- **Statut** : ce code n'est pas encore commité — à traiter par la mission qui le
  finalisera, pas par ce lot d'audit. Signalé pour vigilance avant merge.

### P1 — GRAVE

**F-01 — Statut backend `STALLED` mal mappé sur `/admin/runtime`, incohérent avec `/admin/operations`**
- **Route** : `/admin/runtime`.
- **Fichier** : [src/app/admin/runtime/page.tsx:62-73](src/app/admin/runtime/page.tsx#L62).
- **Preuve** : `statusTone()` et `statusFromRaw()` connaissent `'ready'`, `'CONFIGURED'`,
  `'RUNNING'`, `'running'`, `'NOT_CONFIGURED'`, `'disabled'`, `'unreachable'` — mais
  **pas `'STALLED'`**, valeur réellement renvoyée par le backend en production
  (confirmé par `curl` direct : `indexerStatus:"STALLED"`,
  `indexerScheduler.consecutiveErrors:3983`, `lastSuccessAt:null`). `'STALLED'` tombe
  dans le défaut de ces deux fonctions → ton **`'neutre'`** et statut **`'PARTIAL'`**,
  alors qu'un indexeur qui n'a jamais réussi une synchronisation avec des milliers
  d'erreurs consécutives est un état **critique**, pas partiel.
  Capture à l'appui : `docs/visual-reviews/HC-PAGES-SWEEP-2026-08-04/final/admin-runtime-desktop.png`
  montre la ligne "Indexeur" en badge **orange "Partiel"**, pas rouge.
- **Comparaison** : `/admin/operations` (capture `admin-operations-desktop.png`)
  traite le même champ backend avec un badge **rouge "Indisponible"** et le contexte
  complet ("31,001 erreur(s)") — le même statut backend est donc représenté
  différemment selon la page, à cause des deux types `Runtime` dupliqués et
  incompatibles (voir F-03).
- **Impact** : un opérateur consultant uniquement `/admin/runtime` sous-estime la
  gravité d'une panne d'indexation réelle et prolongée.
- **Recommandation** : ajouter `'STALLED'` (et toute autre valeur du contrat réel)
  aux tables `statusTone`/`statusFromRaw`, avec ton `'critique'`.
- **Risque de correction** : très faible — ajout d'un cas dans une fonction pure,
  testable immédiatement.

**F-02 — `meta.status` du dashboard jamais lu ni affiché, malgré son propre caveat**
- **Route** : `/admin/dashboard`.
- **Fichier** : [src/app/admin/dashboard/page.tsx:204-205](src/app/admin/dashboard/page.tsx#L204).
- **Preuve** : le registre documente pour `dashboard`
  (`endpoints.ts:116`) : *"`meta.status` is computed worst-field-first: a single
  degraded field lowers the whole aggregate."* Mais la carte de résumé
  n'affiche que `aggregate === null ? 'indisponible' : 'joignable'` — un booléen de
  réussite HTTP, jamais `response.meta.status`. Le texte adjacent ("Champ le plus
  dégradé d'abord, selon l'état du backend") est une légende **générique**, pas une
  valeur dynamiquement dérivée de `meta.status` — elle *sonne* comme si elle
  reflétait ce champ, sans le faire.
- **Impact** : un agrégat dont le backend a explicitement calculé un statut dégradé
  (`PARTIAL`/`DEGRADED`, etc.) peut afficher "joignable" sans nuance, faute de
  lecture du bon champ. Le détail par-surface plus bas dans la page compense
  partiellement (chaque `ResolvedField.status` individuel est bien affiché), mais
  le résumé haut-de-page ne porte pas l'information que son propre libellé promet.
- **Recommandation** : soit lire réellement `response.meta.status` et l'afficher,
  soit reformuler la légende pour ne pas suggérer une lecture qui n'a pas lieu.
- **Risque de correction** : faible.

**F-03 — Deux types `Runtime` incompatibles pour le même endpoint**
- **Fichiers** : [runtime/page.tsx:30-52](src/app/admin/runtime/page.tsx#L30) vs
  [operations/page.tsx:154-167](src/app/admin/operations/page.tsx#L154).
- **Preuve** : `runtime/page.tsx` déclare `contract.codePresent?: boolean` ;
  `operations/page.tsx` déclare `contract.codePresence?: string | null` (nom ET
  type différents pour un concept voisin), et ajoute `indexerLagBlocks` absent de
  l'autre. Aucun des deux fichiers ne référence le type de l'autre.
- **Impact** : si le backend renomme ou change un de ces champs, rien ne garantit
  que les deux pages restent synchronisées — cause racine probable de F-01.
- **Recommandation** : extraire un type `Runtime` partagé (ex. dans
  `src/lib/backend/` aux côtés du registre), utilisé par les deux pages.
- **Risque de correction** : moyen — toucher deux pages, mais mécanique et testable.

**F-04 — Endpoint `strategy-detail` mort, mapper canonique `resolved-mapper.ts` mort**
- **Fichiers** : [endpoints.ts:152-159](src/lib/backend/endpoints.ts#L152),
  [resolved-mapper.ts](src/lib/backend/resolved-mapper.ts).
- **Preuve** : grep global sur `strategy-detail` et `fromBackendResolved` ne
  retourne aucun appel en dehors de leur propre définition. Le caveat documenté
  ("`:index` comes exclusively from the `vault/strategies` response") est donc
  invérifiable : aucun code ne construit cet `:index` pour appeler la route.
  L'API Explorer bloque correctement le bouton faute de paramètre saisissable.
- **Impact** : dette documentaire plus que danger actif — mais deux pièces
  d'infrastructure "canoniques" au sens de leurs propres commentaires ne sont pas
  utilisées, ce qui a directement permis F-05 (un mapper alternatif et incomplet
  a été réinventé à la place).
- **Recommandation** : soit brancher `strategy-detail` sur un vrai sélecteur de
  détail dans `/admin/vaults`, soit retirer l'endpoint du registre si la
  fonctionnalité est abandonnée — décision produit, pas une correction technique
  unilatérale.

### P2 — MOYEN

**F-07 — `mining-onchain`/`mining-electricity` jamais réconciliés avec l'agrégat `mining`**
- **Fichier** : [mining/page.tsx:590-602,621](src/app/admin/mining/page.tsx#L590).
- **Preuve** : ces deux endpoints sont affichés en JSON brut via `EndpointSection`,
  sous "Lectures de minage dédiées", pendant que `mining.electricity` (déjà lu par
  la même page) alimente `ElectricitySection`. Rien ne compare les deux lectures.
- **Impact** : si les deux sources divergent (cache différent, staleness), rien
  dans l'UI ne le signale — redondance sans garde de cohérence.
- **Recommandation** : soit ajouter une comparaison explicite, soit documenter que
  ces deux routes sont volontairement isolées (debug only) — actuellement ambigu.

**F-08 — Incohérence de traitement du ratio 0/0 (déployé/total)**
- **Fichiers** : [vaults/overview.ts:284-288](src/lib/vaults/overview.ts#L284) vs
  [deployment-queue.tsx:138-147](src/components/vaults/deployment-queue.tsx#L138).
- **Preuve** : le premier renvoie un vrai `0%` quand `total === 0` ; le second
  traite le même calcul en `unavailable({status:'EMPTY'})`. Même opération,
  deux comportements différents à deux endroits du produit.
- **Impact** : incohérence de doctrine plutôt qu'un vrai faux-zéro (les deux
  entrées sont réellement `available`), mais un `0/0` affiché comme `0%` reste
  mathématiquement indéfini, pas un vrai zéro mesuré.
- **Recommandation** : aligner les deux sur le traitement `EMPTY`/`unavailable`.

**F-09 — Perte du signal de dérive d'allocation dans le remplacement du graphique (diff en cours, non commité)**
- **Fichiers** : `allocation-chart.tsx` / `allocation-gauge.tsx` (mui-x, non commités).
- **Preuve** : l'ancien composant affichait l'écart signé vs seuil
  (`SEUIL_ECART_SIGNALE_PT`, `formatEcartPoints`) ; le nouveau `MuiAllocationGauge`
  n'affiche que `actual%`/`Target: target%`, sans écart ni alerte de seuil — import
  désormais mort dans `allocation-chart.tsx`.
- **Impact** : une information de risque réelle disparaît de l'écran (pas une
  donnée fausse, une perte d'information vraie).
- **Statut** : code non commité — à corriger avant merge par la mission concernée,
  pas par ce lot d'audit.

**F-10 — `surface` obsolète dans le registre pour 5 endpoints coffres**
- **Fichier** : [endpoints.ts:130-179](src/lib/backend/endpoints.ts#L130).
- **Preuve** : `surface: '/admin/vault'` (singulier, redirection pure) déclaré pour
  `vault`, `vault-strategies`, `strategy-detail`, `rwa-vault`, `rebalancing-status`,
  alors que ces données s'affichent réellement sur `/admin/vaults`/`[vaultId]`.
- **Impact** : aucun impact fonctionnel (le routage réel fonctionne), mais
  documentation trompeuse pour quiconque lit le registre comme source de vérité
  de navigation — ce qu'il prétend être.
- **Recommandation** : corriger la métadonnée `surface` sur ces 5 lignes.

**F-11 — Composant `GreenWavePanel` mal nommé**
- **Fichier** : [src/features/admin-home/wave-panel.tsx:15-28](src/features/admin-home/wave-panel.tsx#L15).
- **Preuve** : le commentaire du fichier confirme que la "vague" (graphique
  Recharts) a été retirée et remplacée par une table — le nom du composant/fichier
  n'a pas suivi. Résiduel cosmétique, aucun impact fonctionnel.

### P3 — FAIBLE

**F-12 — Format de pourcentage incohérent sur une cellule de tableau produit**
- **Fichier** : [product-charts.tsx:122](src/components/charts/cartesian/product-charts.tsx#L122).
- **Preuve** : `p.taux.toFixed(2) + ' %'` au lieu de `formatPercent` utilisé
  ailleurs — divergence déjà documentée dans un commentaire comme "hors périmètre
  d'une passe de propreté". Pas de risque de véracité.

**F-13 — Locale financière `en-US` non tranchée**
- Déjà documenté dans le sweep précédent (5 fichiers, tentative de passage `fr-FR`
  annulée par 7 tests dont un l'interdit explicitement). Classé décision produit à
  rendre, pas dette technique — ne pas y toucher sans arbitrage explicite d'Adrien.

---

## 12. Décisions produit requises (pas des corrections techniques)

1. **Locale financière** (F-13) : `en-US` vs `fr-FR` pour les montants — arbitrage
   déjà documenté comme en attente, confirmé toujours ouvert.
2. **`strategy-detail`** (F-04) : brancher un vrai sélecteur, ou retirer l'endpoint
   du registre si abandonné.
3. **MUI X Charts** (déjà dans `charts/index.ts`, non commité) : ce travail en
   cours introduit une deuxième librairie de graphiques dans le catalogue officiel.
   Ce n'est pas nécessairement une violation si c'est une décision assumée du
   propriétaire du Design System — mais ce point mérite une confirmation explicite
   avant merge, car il touche à la doctrine "aucune abstraction chart opaque /
   aucun second Design System concurrent" que ce même produit s'impose ailleurs.

---

## 13. Plan de correction séquencé

### LOT 1 — Vérité et contrats (priorité immédiate)
- **Périmètre** : F-05 (câbler `fromBackendResolved` sur les ~9 sites de compteurs
  dérivés), F-01 (ajouter `'STALLED'` aux tables de `runtime/page.tsx`), F-03
  (unifier le type `Runtime`).
- **Fichiers** : `series-1/page.tsx`, `backtest/page.tsx`, `btc/page.tsx`,
  `mining/page.tsx`, `product/page.tsx`, `operations/page.tsx`,
  `administration/produit/page.tsx`, `vaults/pockets.ts`, `dashboard/page.tsx`,
  `runtime/page.tsx`.
- **Dépendances** : aucune — `resolved-mapper.ts` existe déjà et n'a pas besoin
  d'être réécrit.
- **Tests** : ajouter un cas `STALE` avec valeur non nulle dans les tests de
  chaque page concernée ; ajouter `'STALLED'` aux tests de `runtime/page.tsx`.
- **Risque** : faible à moyen (nombreux sites, mécanique, testable un par un).
- **Critère d'acceptation** : un compte dérivé d'un champ `STALE` affiche un badge
  "Données obsolètes", jamais "En direct" ; `STALLED` s'affiche en ton critique sur
  `/admin/runtime`.

### LOT 2 — États et composants
- **Périmètre** : F-02 (afficher réellement `meta.status` ou reformuler la
  légende), F-08 (aligner le traitement du ratio 0/0).
- **Fichiers** : `dashboard/page.tsx`, `vaults/overview.ts`, `deployment-queue.tsx`.
- **Tests** : cas `meta.status` dégradé avec agrégat par ailleurs joignable ; cas
  `total === 0` sur les deux sites, résultat identique attendu.
- **Risque** : faible.

### LOT 3 — Layout critique
- **Périmètre** : aucun défaut de layout critique trouvé au moment de l'audit (le
  sweep du 2026-08-04 est déjà à 0 sur tous les indicateurs). Ce lot se limite à
  **revérifier en direct** (navigateur) dès qu'il sera disponible : scroll
  horizontal réel sur les tableaux denses en mobile, focus clavier.
- **Risque** : nul si le sweep reste valide ; à confirmer.

### LOT 4 — Display des données
- **Périmètre** : F-10 (corriger `surface` dans `endpoints.ts` pour les 5
  entrées coffres), F-07 (documenter ou réconcilier `mining-onchain`/`mining-electricity`).
- **Fichiers** : `endpoints.ts`, `mining/page.tsx`.
- **Risque** : trivial pour F-10 ; F-07 nécessite une décision (comparer ou documenter).

### LOT 5 — Hiérarchie éditoriale
- **Périmètre** : F-11 (renommer `GreenWavePanel`), F-12 (aligner `formatPercent`).
- **Risque** : trivial, purement cosmétique.

### LOT 6 — Accessibilité et performance
- **Périmètre** : test clavier réel, lecteur d'écran réel (VoiceOver/NVDA), zoom
  200 % en direct — dès que le navigateur Playwright sera disponible. Aucun défaut
  de performance identifié nécessitant correction immédiate.
- **Risque** : inconnu tant que non testé — c'est précisément l'objet du lot.

---

# Checklist fonctionnelle actuelle

## Fonctionnel
- Les 25 endpoints du registre backend répondent et sont tous consommés par au
  moins une page (sauf `strategy-detail`, mort côté frontend — voir F-04),
  vérifié par lecture de code et par appel réel (`curl`) sur les endpoints publics
  et sur les 401 attendus en l'absence de session.
- Authentification et protection des routes admin fonctionnelles : accès sans
  session redirigé (307 → `/login?reason=expired`), aucune fuite de données.
- Doctrine de véracité (`Availability`/`Resolved`, gate `check-no-mocks`) en place
  et globalement respectée — absence distinguée de zéro sur la quasi-totalité des
  pages inspectées.
- Layout responsive sain sur les 23 routes du dernier sweep mesuré (0 défaut sur
  6 indicateurs DOM), confirmé sur captures régénérées sur le HEAD exact audité.
- H1 unique par page (sr-only), structure de titres cohérente.

## Testé
- **Gates** : `pnpm run typecheck` (exit 0), `pnpm run lint` (exit 0),
  `pnpm run check:mocks` (exit 0, 138 fichiers/7 règles), `pnpm run check:ds`
  (exit 0, 59 fichiers/1 règle), `pnpm run check:ui` (exit 0, 138 fichiers/4
  règles), `pnpm run test` (exit 0, **293/293 tests, 31 fichiers**).
- **Endpoints backend réels testés en lecture seule** : `/health` (200),
  `/ready` (200), `/api/v1/runtime` (200, révèle `STALLED`), `/api/v1/dashboard`
  sans session (401), `/api/v1/vault` sans session (401),
  `/api/v1/rebalancing/status` sans session (401), route inexistante (404).
- **Routes frontend testées** : `/`, `/login`, `/register` (200) ;
  `/admin`, `/admin/dashboard`, `/admin/vaults`, `/admin/btc`, `/admin/mining`,
  `/admin/product`, `/admin/runtime`, `/admin/api-explorer`, `/admin/keeper`,
  `/admin/profile`, `/admin/backtest`, `/admin/series-1`, `/admin/clients`,
  `/admin/conformite`, `/admin/operations`, `/admin/administration`,
  `/admin/administration/produit`, `/admin/vault`, `/admin/vaults/1` (307 sans
  session, redirection correcte) ; `/route-inexistante-404` (404).
- **Captures revérifiées manuellement** : `/admin/runtime` (desktop, mobile),
  `/admin/operations` (desktop), `/admin/dashboard` (desktop), `/admin/vaults`
  (desktop, mobile) — issues du sweep du 2026-08-04, régénérées sur le HEAD
  exact audité (`df5d910`, confirmé par `git show --stat`).

## Mergé
- Rien mergé pendant cette mission (audit read-only par construction).
- HEAD de `main` au moment de l'audit : `df5d9104e8b68bdca6b2414c18a2a713d14cd493`.
- Cette mission a travaillé sur la branche `audit/endpoints-data-display-2026-08-05`,
  créée depuis ce même HEAD, non poussée.
- Du travail non commité préexistant a été préservé intact dans le dossier
  principal (voir §1) — non touché, non analysé comme faisant partie de `main`.

## Déployé
- Aucun déploiement effectué ni déclenché par cette mission.
- État de production non vérifié directement (hors périmètre : accès au projet
  Vercel `hearst-connect-v1` non sollicité pendant cet audit).

## Non fonctionnel
- `strategy-detail` (endpoint backend) : jamais appelé côté frontend — mort (F-04).
- `resolved-mapper.ts` (mapper canonique) : jamais importé en production — mort,
  remplacé par des gardes locales incomplètes qui causent F-05 (P0).
- Compteurs dérivés sur ~9 sites (`series-1`, `backtest`, `btc`, `mining`,
  `product`, `operations`, `administration/produit`, `dashboard`) : badgent
  "live" sans lire le statut réel de fraîcheur de la source — F-05 (P0).
- `/admin/runtime` : statut `STALLED` sous-représenté en tonalité neutre/partielle
  au lieu de critique — F-01 (P1).
- `/admin/dashboard` : `meta.status` de l'agrégat jamais lu ni affiché malgré son
  propre caveat documenté — F-02 (P1).

## Limites connues
- **Navigateur Playwright indisponible** pendant toute la mission (verrouillé par
  une autre session active sur le même profil `hearst-pro`) — aucun test
  interactif réel (clavier, lecteur d'écran, scroll tactile, zoom 200 % en direct)
  n'a pu être exécuté ; l'audit layout/responsive s'appuie sur les captures
  DOM-mesurées du sweep du 2026-08-04, confirmées à jour sur le HEAD exact audité.
- Aucun test VoiceOver/NVDA réel effectué — à ne jamais présenter comme fait.
- Endpoints d'écriture (6 routes keeper) vérifiés par lecture de contrat
  uniquement, aucune mutation exécutée (hors périmètre d'un audit read-only).
- Le caveat "403 dont le corps annonce 401" sur `rebalancing-status` n'a été
  vérifié que par lecture de code (`http-failure.ts`) — non reproduit en
  conditions réelles (nécessiterait une session non-admin authentifiée, hors
  périmètre de cette passe).
- Trois findings (F-06, F-09, et la question MUI X Charts) portent sur du code
  **non commité**, appartenant à une autre mission en cours dans ce même
  dossier — signalés pour vigilance avant merge, non corrigés ici (hors mandat
  de cet audit, qui ne devait pas toucher au travail d'autrui).

## Prochaines étapes
1. **LOT 1** (P0/P1 core) — câbler `fromBackendResolved` sur les ~9 sites de
   compteurs dérivés (F-05) ; ajouter `'STALLED'` aux tables de statut de
   `runtime/page.tsx` (F-01) ; unifier le type `Runtime` dupliqué (F-03).
2. **LOT 2** — afficher ou reformuler `meta.status` sur `/admin/dashboard` (F-02) ;
   aligner le traitement du ratio 0/0 (F-08).
3. **LOT 3** — revérifier layout/a11y en navigateur réel dès disponibilité.
4. **LOT 4** — corriger la métadonnée `surface` obsolète (F-10) ; documenter ou
   réconcilier les lectures minage isolées (F-07).
5. **LOT 5** — nettoyage cosmétique (F-11, F-12).
6. **LOT 6** — accessibilité et performance réelles, une fois le navigateur libre.
7. **Décisions produit à rendre** : locale financière (F-13), avenir de
   `strategy-detail` (F-04), statut de l'intégration MUI X Charts en cours.

## Preuves
- **SHA audité** : `df5d9104e8b68bdca6b2414c18a2a713d14cd493` (branche d'audit
  créée depuis ce HEAD : `audit/endpoints-data-display-2026-08-05`).
- **Routes** : 20 fichiers `page.tsx` sous `src/app`, toutes listées §4.
- **Endpoints** : 25 dans `src/lib/backend/endpoints.ts`, tous listés §2.
- **Fichiers clés cités** : `src/lib/backend/{client,endpoints,resolved-mapper,http-failure,keeper}.ts`,
  `src/lib/vaults/{model,registry,overview,pockets}.ts`,
  `src/app/admin/{runtime,dashboard,series-1,operations,btc,mining,product,backtest,administration/produit}/page.tsx`,
  `src/components/vaults/deployment-queue.tsx`,
  `src/components/charts/{index.ts,polar/allocation-chart.tsx,mui-x/*}` (diff en cours),
  `src/features/admin-home/wave-panel.tsx`.
- **Captures** : `docs/visual-reviews/HC-PAGES-SWEEP-2026-08-04/final/` (92
  fichiers, 23 routes × 4 viewports), régénérées sur le HEAD audité.
- **Commandes et exit codes** : voir "Testé" ci-dessus (tous exit 0).
- **Requêtes réseau réelles** : voir §2, section "Test réel des endpoints" —
  aucun secret, cookie, token ou header d'authentification inclus dans ce rapport.
