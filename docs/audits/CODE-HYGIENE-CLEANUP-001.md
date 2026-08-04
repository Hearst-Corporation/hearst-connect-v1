# Nettoyage de propreté — HC-CODE-HYGIENE-CLEANUP-001

> Exécution des lots à faible et moyen risque du plan
> `CODE-HYGIENE-CLEANUP-PLAN.md`. Les lots D (convergence UI), E (tokens) et A
> (arbitrages produit) n'ont **pas** été exécutés — ils restent ouverts.

## Traçabilité des SHA

| Rôle | SHA | Ce qui y a été fait |
|---|---|---|
| **Analyse initiale** | `6c5507f` | Audit complet : toutes les commandes (gates, build, knip, jscpd, graphe d'imports, tokens, hachage des assets) exécutées à ce SHA. |
| **Revalidation** | `8029d85` | Les constats de l'audit y avaient été re-vérifiés par `grep`/`ls` ciblés, **mais les commandes complètes n'y avaient pas été rejouées**. C'est fait dans cette mission : baseline mesurée avant toute correction (§ Baseline). |
| **Nettoyage** | `8029d85` → `d47af1a` | Branche `cleanup/code-hygiene-safe-2026-08-04`, worktree dédié `/Users/adrienbeyondcrypto/Desktop/hearst-connect-v1-cleanup`. |

Le worktree de l'audit (`hearst-connect-v1-hygiene`) et celui de la mission
produit (`Herst Connect V1`) n'ont **pas** été touchés.

## Baseline mesurée sur `8029d85` (avant toute correction)

Ces chiffres n'étaient pas connus avant cette mission : l'audit les avait
mesurés sur `6c5507f`.

| Commande | Exit | Résultat |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | lockfile respecté |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm check:mocks` | 0 | 7 règles |
| `pnpm check:ds` | 0 | — |
| `pnpm test` | 0 | **231 tests / 24 fichiers** (et non 219 : le commit FR en avait ajouté 12) |
| `pnpm build` | 0 | **25 routes** |
| `pnpm exec knip` | 1 | 18 fichiers · **54 exports** · **12 types** |
| `pnpm audit` | 1 | **6 vulnérabilités** (2 moderate, 4 high) — préexistantes, documentées SEC-03 |
| `pnpm exec playwright test --list` | 0 | 17 tests découverts |

## Résultat global

| Mesure | Avant (`8029d85`) | Après (`d47af1a`) |
|---|---|---|
| Tests | 231 (24 fichiers) | **248 (26 fichiers)** |
| knip — exports inutilisés | 54 | **27** |
| knip — types inutilisés | 12 | **5** (conservés délibérément) |
| Duplication jscpd | 3,45 % · 56 clones | **3,41 % · 55 clones** |
| Routes au build | 25 | **25** (aucune perdue) |
| Vulnérabilités `pnpm audit` | 6 | **6** (aucune régression) |
| Couverture | non mesurée à ce SHA | **88,79 %** lignes |

**Lignes retirées** : 208 (LOT B1) + ~30 (LOT G, résidus oxlint) ≈ **240 lignes
de code mort**, hors documentation.

---

## Constats traités

### DOC-001 — README.md

- **Avant** : cinq affirmations fausses, dont `npm install` / `npm run` dans un
  dépôt **pnpm-only** — le piège n°1 de CLAUDE.md, qui fait échouer le job
  « gate » de la CI. Plus : `check:catalyst` (gate supprimée le 2026-07-31),
  « `AdminShell` reste en fallback » (supprimé au Lot 7), session « signée
  HMAC-SHA256 » (elle est chiffrée AES-256-GCM depuis SEC-02), tokens `brand-*`
  « or Hearst H≈45° » (famille morte, l'accent est mint).
- **Correction** : `pnpm` partout ; commandes alignées sur les scripts réels ;
  session corrigée d'après `session.ts` (`createCipheriv('aes-256-gcm')`) ; les
  6 variables d'environnement réelles documentées (il n'en listait que 3) ;
  structure de dossiers et langue produit à jour.
- **Fichiers** : `README.md`
- **Tests** : `pnpm check` (documentation, aucun impact runtime attendu)
- **SHA** : `a6359dc`
- **Après** : chaque commande citée a été exécutée et fonctionne.
- **Limite** : aucune.

### DOC-002 — `sonar-project.properties`

- **Avant** : `sonar.cpd.exclusions=src/lib/demo-data.ts,…` — le fichier
  n'existe plus.
- **Correction** : entrée retirée, `endpoints.ts` conservé, avec la raison et
  la date du retrait en commentaire.
- **Fichiers** : `sonar-project.properties` · **SHA** : `a6359dc`
- **Après** : l'exclusion ne décrit plus qu'un fichier réel.
- **Limite** : non rejouée contre un serveur SonarQube (aucun n'est joignable
  depuis cet environnement).

### DOC-003 — Rapport de remédiation

- **Avant** : affirme que la doctrine Design System « n'est pas présente dans le
  dépôt » (elle l'est depuis `6c5507f`) et que la langue FR est « BLOQUÉE »
  (livrée par `8029d85`). Deux lots y sont marqués bloqués à tort.
- **Correction** : le contenu historique est **laissé intact**. Un encadré de
  statut est ajouté en tête — statut HISTORIQUE, SHA, date, source canonique
  actuelle — avec le rectificatif des deux affirmations périmées.
- **Fichiers** : `docs/remediation/AUDIT-2026-08-03-REMEDIATION.md`
- **SHA** : `a6359dc`
- **Après** : une trace de mission reste une trace, sans être lue comme l'état
  courant.
- **Limite** : aucune.

### DOC-004 — `VENDOR.md` et `CLAUDE.md`

- **Avant** : `VENDOR.md` annonçait 18 primitives Catalyst inutilisées ;
  `CLAUDE.md` décrivait la gate sans `check:ds`, annonçait « aucune gate de
  design » alors que `check:ds` est bloquante en CI, comptait 5 règles
  `check:mocks` au lieu de 7, 14 fichiers de tests, et « aucun worktree ».
- **Correction** : 18 → **16** (`link` et `navbar` sont consommés à l'intérieur
  du kit : 8 et 2 importeurs — les compter comme inutilisés invitait à les
  retirer, ce qui casserait Catalyst). `CLAUDE.md` aligné sur le code, avec le
  nombre de tests **mesuré** et non recopié.
- **Fichiers** : `src/components/catalyst/VENDOR.md`, `CLAUDE.md`
- **SHA** : `a6359dc` · **Limite** : aucune.

### DOC-005 — Notes Design System

- **Avant** : « la doctrine n'est pas présente » ; section « langue produit »
  décrivant une console anglaise et une migration à faire.
- **Correction** : rôle des deux documents clarifié (la doctrine dit ce qui
  *doit* être, les notes ce qui *est*) ; section langue passée en « ✅ LIVRÉ » ;
  le glossaire d'ancrage retiré au profit de `CONSOLE-FR-GLOSSARY.md`, pour
  n'avoir qu'une source.
- **Fichiers** : `docs/design-system/DESIGN-SYSTEM-NOTES.md`
- **SHA** : `a6359dc` · **Limite** : aucune.

### DEAD-NEW-001 → 009 — Exports morts (LOT B1)

- **Avant** : 12 symboles dont la seule référence du dépôt était leur propre
  déclaration.
- **Correction** : supprimés, après revérification individuelle **sur
  `8029d85`** (code, tests, e2e, scripts, configs, docs, imports dynamiques) —
  et non repris du rapport. Emportés avec eux : le type `Tone` et ses trois
  tables (ne servaient qu'à `VerdictCard`), les imports `next/link` et `clsx`
  devenus inutiles.
  - `cockpit.tsx` : `VerdictCard`, `ExceptionBanner`
  - `surfaces.tsx` : `AdminLoadingState`, `AdminActionPanel`
  - `surface.tsx` : `surfaceSunken`, `Panel`, `PanelHeading` (chaîne liée)
  - `admin-nav.ts` : `entreeSecondaire`
  - `layout-tokens.ts` : 6 tokens d'espacement jamais consommés
- **Indice concordant** : `AdminLoadingState` et `AdminActionPanel` étaient
  restés en **anglais** après la migration FR — donc jamais rendus.
- **Fichiers** : 5 · **208 lignes retirées** · **SHA** : `3ccf9bc`
- **Tests** : typecheck, lint, check:mocks, check:ds, test (231, inchangé)
- **Après** : knip 54 → 40 exports.
- **Limite** : `formatCompactNumber` et `formatDate`, morts eux aussi, ont été
  **volontairement conservés** — `format.ts` est la cible du LOT C.

### DEAD-NEW-010 — Exports superflus (LOT B2)

- **Avant** : 13 symboles signalés « inutilisés » par knip, alors qu'ils sont
  utilisés — mais seulement dans leur propre fichier.
- **Correction** : retrait du mot-clé `export` **uniquement**. Aucune ligne de
  logique modifiée, aucun comportement changé.
- **Fichiers** : 10 · **SHA** : `862012d`
- **Après** : knip 40 → 27 exports.
- **Limite** : `MOVEMENT_ROWS` avait été classé ici à tort — il n'était consommé
  **nulle part**, pas même dans son fichier. Détecté ensuite par `oxlint` et
  supprimé au LOT G (`b69d300`).

### DEAD-NEW-011 — Types (LOT B3)

- **Avant** : 12 types exportés sans consommateur.
- **Correction** : arbitrage **un par un**, pas de suppression en bloc.
  - Dé-exportés (mono-fichier) : `AdminFilterItem`, `IconeNav`,
    `EnvelopeStatus`, `EnvVarStatus`, `EnvVarReport`.
  - Supprimé : le ré-export `export type { ClientRef, Deployment }` de
    `registry.ts:705` — aucun importeur, les modules concernés importent depuis
    `model.ts`.
  - **Conservés** : `ClientId`, `DeploymentId`, `KeeperActionId`,
    `ComplianceReviewId`, `ClientRef` de `model.ts`. Ces identifiants marqués
    forment une grammaire complète (une entité, un type) qui empêche de passer
    un id de coffre là où un id de client est attendu. En retirer les membres
    dont l'entité n'a pas encore de surface UI laisserait une famille à trous.
    Décision écrite dans le code.
- **Fichiers** : 6 · **SHA** : `b9da70b`
- **Après** : knip 12 → 5 types, les 5 restants étant ce choix assumé.

### TEST-FIX-001 — Fixture orpheline (LOT F)

- **Avant** : `tests/fixtures/violating-module.txt` affirmait prouver que la
  règle `DECLARED_FIXTURE` « mord vraiment ». **Aucun test ne la chargeait.**
- **Correction** : **cas A** du plan — la règle est toujours nécessaire et
  active, donc on écrit le self-test manquant. `tests/check-no-mocks-gate.test.ts`
  lance le **vrai** `scripts/check-no-mocks.mjs` en sous-processus sur une
  racine temporaire (le script accepte déjà une racine en `argv[2]`, donc **la
  gate n'est pas modifiée**). Trois tests, dans les deux directions :
  1. la fixture fautive, **lue** depuis `tests/fixtures` : exit 1 + mention
     `DECLARED_FIXTURE` ;
  2. un module légitime : exit 0 ;
  3. `valeur ?? 0` : exit 1 + `NULL_TO_ZERO`.
- **Preuve que le test mord** : en neutralisant la regex `DECLARED_FIXTURE`
  dans la gate, le test 1 échoue (exit 0 au lieu de 1). Le script a été restauré
  à l'identique — `git diff scripts/check-no-mocks.mjs` était vide.
- **Fichiers** : `tests/check-no-mocks-gate.test.ts` (nouveau),
  `tests/fixtures/violating-module.txt` (documenté, non assaini)
- **SHA** : `ff886b2` · **Tests** : 231 → 234
- **Limite** : seules 2 des 7 règles sont couvertes (`DECLARED_FIXTURE`,
  `NULL_TO_ZERO`). Les 5 autres restent sans self-test.

### DEP-001 — Dépendance `playwright` (LOT G)

- **Avant** : déclarée en devDependency sans aucun import direct.
- **Vérification avant retrait** : aucun `from 'playwright'` (tout passe par
  `@playwright/test`) ; absente de `.github/workflows/ci.yml` ;
  `@playwright/test@1.51.1` déclare `playwright: 1.51.1` en dépendance.
- **Correction** : déclaration directe retirée, lockfile mis à jour.
- **Vérification après** : `pnpm install --frozen-lockfile` ✓ ·
  `pnpm exec playwright --version` → **1.51.1** ✓ · `playwright test --list` →
  **17 tests dans 2 fichiers** ✓ · exécution réelle : **10 passés / 7 échoués**,
  identique à la baseline.
- **Fichiers** : `package.json`, `pnpm-lock.yaml` · **SHA** : `b69d300`
- **Limite** : l'e2e complet reste `BLOCKED_ENVIRONMENT` (voir §Limites).

### SCRIPT-001 — Script `sonar` (LOT G)

- **Avant** : `npm run test:coverage && docker run … SONAR_HOST_URL=http://<IP privée>:9010`.
  Trois défauts : `npm` dans un dépôt pnpm-only, une IP privée en dur, et
  Docker supposé présent sans le dire.
- **Correction** : réécrit en `scripts/sonar.mjs`. `SONAR_TOKEN` et
  `SONAR_HOST_URL` sont **obligatoires** (plus aucune adresse en dur) ; Docker
  et `sonar-project.properties` sont vérifiés ; `pnpm run test:coverage` ; chaque
  prérequis manquant produit un message qui nomme ce qui manque et comment le
  fournir. Option `--skip-coverage`.
- **Vérification** : sans variables → exit 1 avec « SONAR_TOKEN manquant » au
  lieu d'une erreur Docker opaque.
- **Fichiers** : `scripts/sonar.mjs` (nouveau), `package.json`, `README.md`
- **SHA** : `b69d300`
- **Limite** : le chemin nominal (scan réel) n'a **pas** été exécuté — aucun
  serveur SonarQube n'est joignable ici. Seul le chemin d'échec est prouvé.

### SCRIPT-002 — `quality:dup` et `lint:fast` (LOT G)

- **Avant** : `jscpd src --threshold 100`. Le seuil de jscpd est le pourcentage
  **maximum avant exit 1** : à 100 %, il ne peut jamais mordre — la commande
  sortait en succès en annonçant 56 clones.
- **Correction** : `scripts/check-duplication.mjs`, **seuil 4 %** pour une
  duplication mesurée à 3,45 %. Marge d'un demi-point : une aggravation notable
  rougit. Le seuil n'est pas monté au-dessus de l'état courant pour obtenir du
  vert facile, et le script écrit explicitement qu'il faut retirer la
  duplication plutôt que monter le seuil. Sortie : pourcentage, nombre de
  clones, lignes dupliquées. Le détail clone par clone reste dans
  `quality:dup:report`.
- **Preuve qu'il mord** : `--selftest` mesure **49,79 %** sur deux fichiers
  identiques (exit 1 attendu) et **0 %** sur un fichier unique.
- **`lint:fast` — CONSERVÉ** : le rapport le disait redondant avec eslint ; il
  ne l'est pas. oxlint a trouvé **trois résidus morts** qu'eslint ne signale
  pas, corrigés dans le même commit : imports `formatNumber`/`mapAvailability`
  (`vaults/page.tsx`), fonction `absenceSentence` + sa table (`movement-ledger.tsx`),
  et `MOVEMENT_ROWS` (`overview.ts`). Après correction, plus aucun
  `no-unused-vars`.
- **Fichiers** : `scripts/check-duplication.mjs` (nouveau), `package.json`,
  `README.md`, 3 fichiers source · **SHA** : `b69d300`

### DUP-LOGIC-001 — Formatters (LOT C)

Matrice établie **avant** modification sur les 9 sites (unité, entrée, sortie,
locale, comportement null/undefined, précision).

**Consolidés — rendu identique, vérifié valeur par valeur :**

| Site | Avant | Après |
|---|---|---|
| `btc/page.tsx` `partLisible` | `(bps/100).toLocaleString(…)` | `formatPercent(bps, {fromBps, max:2})` |
| `btc/page.tsx` `bitcoinProduit` | `toLocaleString('en-US', {max:8})` | `formatNumber(…, {max:8})` |
| `series-1/page.tsx` | `Number(bloc).toLocaleString('en-US')` | `formatNumber(Number(bloc))` |
| `resolved.ts` `formatCount` | copie exacte de `formatNumber` | délègue à `formatNumber` |
| `overview.ts` | 2 `Intl.DateTimeFormat` construits **à chaque point** | hissés en constantes de module |

**NON consolidés — la raison est écrite sur place :**

| Site | Pourquoi |
|---|---|
| `product-charts.tsx` `toFixed(2) + ' %'` | rend « 3.50 % » ; `formatPercent` rendrait « 3.5% ». Décimales fixes + espace : contrat d'affichage différent. |
| `administration/produit` `bitcoinProduitDe` | utilise déjà `formatNumber`, précision 4 assumée (contre 8 ailleurs). |
| `btc/page.tsx` `btcExactDepuisSats` | convertit les satoshis **sur la chaîne** pour ne pas dériver au 8ᵉ chiffre. Pas un doublon de la division flottante voisine : les affichages diffèrent (« 1 » contre « 1.00000000 »). Incohérence réelle, signalée sur place — la trancher change l'écran, c'est un arbitrage produit. |

- **Fichiers** : 6 modifiés + `tests/format.test.ts` (nouveau, 14 tests)
- **SHA** : `9a50936` · **Tests** : 234 → 248

**Résidu de migration FR corrigé au passage** : `formatDate` et `formatDateTime`
renvoyaient encore `'unknown date'`. Ce libellé **est rendu à l'écran** (btc,
`vaults/[vaultId]`, badges de fraîcheur, file de rééquilibrage). Il avait
échappé à `language-regression.test.ts`, qui ne scanne que `src/app/admin` et
`src/components/admin`, pas `src/lib`. Trouvé parce que le nouveau test l'a
fait échouer.

---

## Ce qui n'a PAS été touché (conformément au périmètre)

| Interdiction | Vérification |
|---|---|
| Tokens (§6) | `git diff 8029d85 -- src/styles/` → **vide** |
| Convergence UI (§7) | `git diff 8029d85 -- src/components/design-lab/` → **vide**. Les 10 `Card` locales sont intactes. |
| Catalyst | `git diff 8029d85 -- src/components/catalyst/` → **`VENDOR.md` seul** (documentation) |
| Charts / Motion | `chart-theme.ts` : 2 lignes, retrait de `export` uniquement. Aucun ajout de bibliothèque. |
| Routes | Build : **25 routes**, identique à la baseline |
| Backend | aucun fichier hors de ce dépôt |
| Merge / déploiement | aucun |
| `git add -A` | jamais utilisé — chaque fichier ajouté nommément |

---

## Validation finale (`d47af1a`)

| Commande | Exit | Résultat |
|---|---|---|
| `pnpm install --frozen-lockfile` | **0** | lockfile respecté après retrait de `playwright` |
| `pnpm typecheck` | **0** | — |
| `pnpm lint` | **0** | — |
| `pnpm check:mocks` | **0** | 7 règles, 0 violation |
| `pnpm check:ds` | **0** | 0 hex hors token |
| `pnpm test` | **0** | **248 tests / 26 fichiers** |
| `pnpm test:coverage` | **0** | **88,79 %** lignes · 81 % branches · 90,82 % fonctions |
| `pnpm build` | **0** | **25 routes** |
| `pnpm quality:dead` (knip) | 1 | 18 fichiers (17 Catalyst + 1 script docs) · 27 exports · 5 types |
| `pnpm quality:dup` | **0** | **3,41 %** · 55 clones — sous le seuil de 4 % |
| `pnpm audit` | 1 | **6 vulnérabilités** — identique à la baseline, aucune régression |
| `pnpm exec playwright test` | 1 | **10 passés / 7 échoués** — `BLOCKED_ENVIRONMENT` |

`pnpm quality:dead` et `pnpm audit` sortent en 1 par nature (ils rapportent des
indices et des vulnérabilités préexistantes) ; ce ne sont pas des gates.

### Playwright — BLOCKED_ENVIRONMENT

- **Commande** : `pnpm exec playwright test`
- **Exit** : 1
- **Tests découverts** : 17 (2 fichiers)
- **Résultat** : 10 passés, 7 échoués
- **Erreur expurgée** : `ENOENT: no such file or directory, open '.env.local'`
  et `Test timeout of 60000ms exceeded`
- **Raison** : ce worktree n'a pas de `.env.local`, et
  `e2e/access-control.spec.ts` lit `DEV_QUICK_LOGIN_EMAIL`/`_PASSWORD` depuis ce
  fichier pour se connecter. Sans identifiants ni backend joignable, tout test
  qui traverse l'authentification échoue.
- **Ce qui est prouvé malgré tout** : les 10 tests qui ne dépendent pas d'un
  compte passent — refus d'un visiteur anonyme sur 6 routes (dont
  `/design-lab/admin-home-green`), pages publiques joignables, cookie forgé
  rejeté, cookie scellé sous le mauvais secret rejeté, Server Action anonyme
  gardée. Résultat **identique à la baseline** mesurée avant modification :
  aucune régression introduite.
- **État** : `BLOCKED_ENVIRONMENT` — le lot G n'est donc pas déclaré
  « fonctionnel » sur le chemin authentifié.

---

## Limites et risques résiduels

1. **E2E authentifié non rejoué.** 7 des 17 tests n'ont pas pu s'exécuter
   (pas de `.env.local`, pas de backend). Les parcours connexion → console →
   déconnexion ne sont pas prouvés sur cette branche.
2. **Aucune revue visuelle.** Le LOT C touche des sites d'affichage. Chaque
   changement a été vérifié comme neutre par comparaison de sortie
   (valeur par valeur en Node), mais **aucune capture n'a été prise**.
3. **`sonar` : seul le chemin d'échec est prouvé.** Le scan réel exige un
   serveur SonarQube et Docker, indisponibles ici.
4. **Le self-test de la gate ne couvre que 2 règles sur 7.**
5. **`btc/page.tsx` conserve deux conversions sats→BTC divergentes.** L'écart
   est documenté sur place ; le trancher change l'affichage.
6. **La duplication reste à 3,41 %.** Le gros du reliquat (10 `Card` locales)
   relève du LOT D, hors périmètre.
7. **Le seuil de 4 % est un point de départ.** À baisser à mesure que le LOT D
   résorbe la duplication — pas à monter.

## Constats encore ouverts

| ID | Sujet | Lot |
|---|---|---|
| DUP-UI-001 | 10 `Card`, 7 `CardHeader`, 6 `SourceAttendue`, 6 `HeroFigure`, 4 `SideFact` locales | **D** |
| DUP-UI-002 | 3 vocabulaires de surface concurrents | **D** |
| DS-VIOLATION-001 | `truthful.tsx` / `surfaces.tsx` utilisent `hearst-*`, `cockpit-*`, `neutral-*` | **D2 — prérequis de E** |
| CSS-DEAD-001 | 20 tokens de familles mortes (`brand-*`, `info-*`, `surface-*`) | **E** |
| CSS-DEAD-002 | `--chart-positive/negative/warning/neutral` à **brancher**, pas à supprimer | **E** |
| DUP-VISUAL-001 | 20 hex portés par 2 à 7 tokens | **E** |
| DUP-ROUTE-001 | `/design-lab/admin-home-green` duplique `/admin` | **A** |
| ROUTE-001 | `/register` à qualifier | **A** |
| ASSET-001 | 19 Mo de captures, 4 paires identiques | **A** |
| DUP-LOGIC-002 | `Resolved` vs `Availability` | arbitrage produit |
| DEAD-NEW-013 | `docs/dashboard-vision/render/capture.mjs` | conservé (preuve de mission) |

## Commits

| SHA | Objet |
|---|---|
| `69600cd` | import des rapports d'audit depuis `39e8832` |
| `a6359dc` | **LOT H** — README et documentation active |
| `3ccf9bc` | **LOT B1** — 12 exports morts (208 lignes) |
| `862012d` | **LOT B2** — 13 symboles dé-exportés |
| `b9da70b` | **LOT B3** — 5 types dé-exportés, 1 ré-export mort retiré |
| `ff886b2` | **LOT F** — self-test de la gate anti-mocks |
| `b69d300` | **LOT G** — dépendances et scripts qualité |
| `9a50936` | **LOT C** — formatters consolidés |
| `d47af1a` | rapports et checklist mis à jour |
