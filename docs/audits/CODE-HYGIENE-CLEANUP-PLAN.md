# Plan de nettoyage — Hearst Connect V1

> Dérivé de `CODE-HYGIENE-AUDIT-2026-08-04.md`. SHA d'analyse initiale `6c5507f`,
> SHA de revalidation `8029d85`, SHA de code final `9a50936`.

## État d'exécution au 2026-08-04

Les lots **H, B, F, G et C** ont été exécutés par la mission
**HC-CODE-HYGIENE-CLEANUP-001** (branche `cleanup/code-hygiene-safe-2026-08-04`).
Compte rendu détaillé, preuves et exit codes : **`CODE-HYGIENE-CLEANUP-001.md`**.

| Lot | État | Commit | Résultat |
|---|---|---|---|
| **H** — docs et README | ✅ **FAIT** | `a6359dc` | 6 documents alignés sur le code |
| **B** — exports, types, helpers | ✅ **FAIT** | `3ccf9bc` `862012d` `b9da70b` | 208 lignes retirées ; knip 54→27 exports, 12→5 types |
| **F** — fixture orpheline | ✅ **FAIT** | `ff886b2` | self-test écrit ; la preuve annoncée existe enfin |
| **G** — dépendances et scripts | ✅ **FAIT** | `b69d300` | `playwright` retiré ; `sonar` et `quality:dup` réparés |
| **C** — formatters | ✅ **FAIT (partiel, assumé)** | `9a50936` | 5 sites consolidés, 4 conservés avec justification |
| **D** — convergence UI | ⬜ **OUVERT** | — | hors périmètre (§7 de la mission de nettoyage) |
| **E** — CSS et tokens | ⬜ **OUVERT** | — | interdit (§6) ; **dépend de D2** |
| **A** — routes et assets | ⬜ **OUVERT** | — | arbitrages produit |

Mesures après nettoyage : **248 tests** (26 fichiers, contre 231/24), couverture
**88,79 %**, duplication **3,41 %** (55 clones), **25 routes** au build (aucune
perdue), `pnpm audit` **6 vulnérabilités** (identique à la baseline).

Vérifié intact : `src/styles/` (aucun token touché), `src/components/design-lab/`
(aucune modification), `src/components/catalyst/` (seul `VENDOR.md`, documentation).

---

> **Ce plan n'exécute rien.** Il découpe les constats en lots exécutables, avec leurs
> dépendances, leurs preuves exigées et leurs conflits avec les missions en cours.

## Ordre d'exécution recommandé

```
H ──► B ──► F ──► G          (indépendants, sans impact rendu)
       │
       └──► C ──► D ──► E    (chaîne contrainte, impact rendu)
                    │
                    └──► A   (arbitrages produit)
```

**Deux contraintes d'ordre à ne pas violer :**

1. **LOT D avant LOT E.** `truthful.tsx` et `surfaces.tsx` maintiennent en vie les tokens
   `hearst-*`, `cockpit-*` et `neutral-*`. Les supprimer avant la convergence casserait le
   rendu **sans faire échouer aucune gate** — `check:ds` n'interdit que les hex bruts, pas
   un utilitaire Tailwind pointant vers un token disparu. C'est le piège principal du plan.
2. **LOT C avant la partie « formatters » du LOT B.** Supprimer `formatCompactNumber` et
   `formatDate` au moment même où 9 sites devraient commencer à les appeler serait un
   contresens.

---

## LOT A — Suppressions certaines sans comportement

**Contenu réel : quasi vide.** C'est le résultat le plus important du plan — le Lot 7 de
la remédiation a déjà fait ce travail. Aucun fichier applicatif orphelin ne subsiste.

| Élément | ID | Décision |
|---|---|---|
| Route `/design-lab/admin-home-green` | DUP-ROUTE-001 | **Arbitrage produit** — pas une suppression certaine |
| Séries de captures `REWORK-001..005` (~4,5 Mo) | ASSET-001 | **Arbitrage gouvernance** — une revue visuelle est une preuve d'audit |
| 4 paires de PNG identiques au hash | ASSET-001 | Dédoublonnage sûr, mais l'historique git les porte de toute façon |
| `git gc` (2129 objets loose, 0 pack) | WS-001 | Opération de maintenance, sans effet sur le contenu |

- **Fichiers concernés** : `src/app/design-lab/admin-home-green/` (3 fichiers), `docs/visual-reviews/HC-GREEN-COMMAND-CENTER-SANDBOX-REWORK-00{1..5}/`
- **Dépendances** : aucune
- **Tests à lancer** : `pnpm check` + `pnpm build` + `pnpm e2e` si la route est retirée
- **Preuves requises** : manifeste de routes du build avant/après ; confirmation produit écrite que le sandbox n'est plus un banc d'essai actif
- **Risque** : `NEEDS_PRODUCT_DECISION`
- **Taille** : **S** (routes) / **M** (assets)
- **Conflits** : ⚠️ **`components/design-lab/` n'est PAS supprimable** — importé par 18 routes admin, `primitives.tsx` a 31 importeurs. Seule la *route* est dupliquée. Toute mission touchant au design system travaille dans ce dossier.

---

## LOT B — Exports, types et helpers

Le lot au meilleur rapport valeur/risque après H. 12 exports morts, deux preuves chacun.

### B1 — Exports morts (suppression du symbole)

| Fichier | Symboles | Lignes |
|---|---|---|
| `src/components/admin/cockpit.tsx` | `VerdictCard`, `ExceptionBanner` | 78 |
| `src/components/admin/surfaces.tsx` | `AdminLoadingState`, `AdminActionPanel` | 48 |
| `src/lib/admin-nav.ts` | `entreeSecondaire` | 12 |
| `src/lib/layout-tokens.ts` | `pageInlinePadding`, `pageBlockPadding`, `surfacePadding`, `surfaceCompactPadding`, `tableCellPadding`, `toolbarPadding` | 6 |
| `src/components/admin/surface.tsx` | `surfaceSunken` + `Panel` + `PanelHeading` (chaîne liée) | 45 |

### B2 — Exports superflus (retrait du mot-clé `export` seulement)

13 symboles dans 10 fichiers (DEAD-NEW-010) : `THEME_STORAGE_KEY`, `currentTheme`,
`CATEGORICAL_RAMP`, `MIN_POINTS_FOR_CHART`, `PHRASE_MOUVEMENT`, `MOTIF_LISIBLE`,
`LOGIN_PATH`, `estStatutAffichage`, `MOVEMENT_ROWS`, `Mark`, `SEUIL_ECART_SIGNALE_PT`,
`FreshnessIndicator`, `AdminEmptyState`.
**Le code reste** — il est consommé dans son propre fichier. Zéro changement de comportement.

### B3 — Types (à arbitrer un par un, pas en bloc)

`EnvVarStatus`, `EnvVarReport`, `Tone` sont les candidats nets.
⚠️ **`ClientId`/`DeploymentId`/`KeeperActionId`/`ComplianceReviewId` sont des *branded types*
d'une famille dont `VaultId`/`StrategyId`/`MovementId` **sont** utilisés — retirer les
inutilisés casserait la symétrie d'un modèle délibéré. Les conserver.

- **Dépendances** : B1 après **LOT C** pour `formatCompactNumber`/`formatDate` uniquement
- **Tests à lancer** : `pnpm check` (typecheck attrape tout ici)
- **Preuves requises** : `pnpm exec knip` avant/après (la liste doit décroître d'autant) ; `grep` de confirmation par symbole
- **Risque** : `SAFE_DELETE` (B1 hors `surface.tsx`, B2) · `DELETE_AFTER_TEST` (`surface.tsx`) · `REFACTOR_REQUIRED` (B3)
- **Taille** : **S**
- **Conflits** : faible. `surfaces.tsx` et `truthful.tsx` sont touchés par le LOT D — faire B avant D, ou coordonner.

---

## LOT C — Doublons de logique

### C1 — Formatters (9 sites)

| Fichier | Ligne(s) | Remplacer par |
|---|---|---|
| `src/app/admin/btc/page.tsx` | 167 | `formatPercent(v, { fromBps: true, maximumFractionDigits: 2 })` |
| `src/app/admin/btc/page.tsx` | 189, 427 | `formatBtcFromSats()` **(à créer)** |
| `src/app/admin/administration/produit/page.tsx` | `bitcoinProduitDe` | idem — 3ᵉ implémentation de la même conversion |
| `src/app/admin/series-1/page.tsx` | 366 | `formatNumber` |
| `src/components/admin/product-charts.tsx` | 115 | `formatPercent` |
| `src/lib/resolved.ts` | 94 | `formatNumber` (duplication à l'identique) |
| `src/lib/vaults/overview.ts` | 164, 166, 190 | helper de date centralisé |

Le littéral `'en-US'` est recopié à 9 endroits alors que `format.ts` déclare `const LOCALE`.

### C2 — Server Actions

`src/lib/actions.ts:35-47` ↔ `78-89` — préambule identique entre deux actions (13 lignes).
Gain réel mais petit ; à traiter seulement si le lot est ouvert.

- **Dépendances** : **bloque B1** pour `formatCompactNumber`/`formatDate`
- **Tests à lancer** : `pnpm check` + revue visuelle des 5 routes touchées (btc, produit, series-1, product, operations)
- **Preuves requises** : `grep -c "'en-US'" src` doit tomber à 1 ; captures avant/après des valeurs formatées (une valeur affichée ne doit pas changer)
- **Risque** : `REFACTOR_REQUIRED` — **touche l'affichage de valeurs financières**
- **Taille** : **M**
- **Conflits** : ⚠️ **`format.ts` a été modifié par le commit FR `8029d85`** (`formatRelativeTime` traduit). Toute mission i18n en cours touche ce fichier.
- **Bénéfice au-delà de la propreté** : un formatage centralisé propage correctement l'absence (`'—'`) au lieu de risquer un `0` — cohérent avec la garantie centrale du produit.

---

## LOT D — Convergence UI / Catalyst  ⬜ OUVERT

Le plus gros gain du plan (~40 déclarations locales pour 5 contrats), et le plus risqué.

> **Chemins confirmés au 2026-08-04** (re-vérifiés sur `9a50936`, après le
> nettoyage — ces comptages n'ont pas bougé, aucun lot exécuté n'y a touché) :
>
> | Primitive | Occurrences | Fichiers |
> |---|---|---|
> | `Card` | **10** | `admin/{btc,mining,product,operations,api-explorer,backtest,profile,keeper,series-1}/page.tsx` + `admin/administration/produit/page.tsx` |
> | `CardHeader` | **7** | `btc`, `product`, `mining`, `operations`, `backtest`, `profile`, `series-1` |
> | `HeroFigure` | **6** | `btc`, `mining`, `product`, `operations`, `administration/produit`, `series-1` |
> | `SourceAttendue` | **6** | `btc`, `product`, `mining`, `backtest`, `profile`, `series-1` |
> | `SideFact` | **4** | `btc`, `product`, `mining`, `operations` |
> | `ClientsMetric` / `ComplianceMetric` | **2** | `admin/clients/page.tsx:49`, `admin/conformite/page.tsx:49` — identiques au nom près |
>
> Cibles existantes : `src/components/admin/cockpit.tsx` (`Card`, `CardHeader`,
> `HeroFigure`, `SideFact`, `SourceAttendue`, `CalmState`) et
> `src/components/design-lab/green-command-center/primitives.tsx` (`Panel`,
> `Absent`, `Reading`).
>
> ⚠️ Rappel du piège : les `Card` locales enveloppent `Panel` (matière
> near-black, `gcc.wavePanel`) tandis que `cockpit.Card` applique `surfaceRaised`
> (graphite console). **Converger vers `cockpit.Card` changerait l'apparence des
> 10 routes.**

### D1 — Primitives de route (10 routes)

`Card` (×10), `CardHeader` (×7), `SourceAttendue` (×6), `HeroFigure` (×6), `SideFact` (×4).
Routes : `btc`, `mining`, `product`, `operations`, `api-explorer`, `backtest`, `profile`,
`keeper`, `administration/produit`, `series-1`.

⚠️ **Cible correcte** : extraire vers
`src/components/design-lab/green-command-center/primitives.tsx` (qui porte déjà `Panel`,
`Absent`, `Reading`), **et non** converger vers `cockpit.Card`. Les `Card` locales
enveloppent `Panel` (matière near-black, `gcc.wavePanel`) tandis que `cockpit.Card`
applique `surfaceRaised` (matière graphite console) — **ce ne sont pas les mêmes
surfaces visuelles**. Une convergence naïve changerait l'apparence des 10 routes.

Traiter aussi `ClientsMetric` / `ComplianceMetric` (strictement identiques au nom près).

### D2 — Violations de couche (prérequis du LOT E)

| Fichier | Ligne(s) | Remplacer |
|---|---|---|
| `src/components/admin/truthful.tsx` | 56-58, 106, 121, 180 | `hearst-ok/warn/bad` → `success-*`/`warning-*`/`danger-*` |
| `src/components/admin/truthful.tsx` | 194, 226, 258 | `cockpit-inset` → `console-inset` |
| `src/components/admin/surfaces.tsx` | 412 | `neutral-600` → `zinc-*`/`console-*` |

### D3 — Documenter la cible

`surface.tsx` / `surfaces.tsx` / `primitives.tsx` offrent trois vocabulaires pour le même
contrat. C'est une **duplication de transition** légitime — le défaut est que rien ne dit
laquelle est la cible. Ajouter cette décision à `DESIGN-SYSTEM-NOTES.md` est l'action la
moins chère et la plus utile du lot : elle empêche les prochaines routes de recréer des
primitives locales.

- **Dépendances** : **D2 bloque tout le LOT E**
- **Tests à lancer** : `pnpm check` + `pnpm build` + **`pnpm e2e`** + revue visuelle des 10 routes aux 3 résolutions
- **Preuves requises** : captures avant/après par route (une convergence ne doit **rien** changer visuellement) ; `grep -c "^function Card" src/app` doit tomber à 0
- **Risque** : `REFACTOR_REQUIRED`
- **Taille** : **L**
- **Conflits** : 🔴 **Le plus élevé du plan.** Les 10 routes ont toutes été modifiées par le commit FR `8029d85`. Une mission i18n, UI ou design-system en cours entrerait en collision directe. **Ne pas ouvrir ce lot en parallèle d'une mission produit touchant `src/app/admin/**`.**

---

## LOT E — CSS et tokens  ⬜ OUVERT (interdit tant que D2 n'est pas fait)

> **Vérifié sur `9a50936`** : `git diff 8029d85 -- src/styles/` est **vide** —
> aucun token n'a été modifié, fusionné ni renommé par la passe de nettoyage.
> Les deux seuls fichiers qui maintiennent en vie les familles `hearst-*`,
> `cockpit-*` et `neutral-*` restent **`src/components/admin/truthful.tsx`** et
> **`src/components/admin/surfaces.tsx`** — ce sont eux, et eux seuls, que D2
> doit faire converger avant que E1 devienne possible.

### E1 — Familles mortes (après D2)

| Famille | Tokens | Statut |
|---|---|---|
| `--color-brand-*` | 8 | 0 consommateur — ancien thème « or Hearst » |
| `--color-info-*` | 8 | 0 consommateur |
| `--color-surface-*` | 4 | 0 consommateur — ancien thème |
| `--color-hearst-*` | 7 | mort **après** D2 |
| `--color-cockpit-*` | 5 | mort **après** D2 (3 usages dans `truthful.tsx`) |
| `--color-neutral-*` | 4 | mort **après** D2 (1 usage dans `surfaces.tsx`) |

### E2 — Doublons de valeur

20 hex portés par 2 à 7 tokens. `#a7fb90` (l'accent) vit sous 4 noms, ce qui contredit
« `#a7fb90` est l'unique accent » de `DESIGN-SYSTEM-NOTES.md`. Largement résolu par E1.

### E3 — Tokens `--chart-*` sémantiques : **brancher, pas supprimer**

`--chart-positive/negative/warning/neutral` ont 0 consommateur, mais ce sont des
indirections prévues par la doctrine §7.5. Faire pointer `chart-theme.ts` vers eux au lieu
de `--color-success-400` etc. **Les supprimer serait défaire la doctrine.**

- **Dépendances** : 🔴 **E1 EXIGE D2 terminé**
- **Tests à lancer** : `pnpm check:ds` + `pnpm build` + revue visuelle complète (console + vitrine, thèmes clair **et** sombre)
- **Preuves requises** : re-exécution du script d'audit des tokens (3 formes : `var()`, utilitaire Tailwind, chaîne littérale) ; captures avant/après console **et** vitrine
- **Risque** : `REFACTOR_REQUIRED` — ⚠️ **une suppression prématurée casse le rendu sans faire rougir aucune gate**
- **Taille** : **M**
- **Conflits** : mission design system / dataviz

---

## LOT F — Tests et fixtures

Un seul élément, mais il touche à l'intégrité d'une preuve.

| Élément | Action |
|---|---|
| `tests/fixtures/violating-module.txt` | **`REWRITE`** — ajouter un test qui charge la fixture et exige que `DECLARED_FIXTURE` la rejette. La fixture est bien conçue ; **c'est le harnais qui manque**. `check-no-mocks.mjs` ne scanne que `src/**` en `.ts`/`.tsx` : il ne peut structurellement pas voir un `.txt` sous `tests/`. |

Rien d'autre : 219 tests verts, aucun `.skip`, aucun `.only`, aucun `todo`, aucun snapshot
inutilisé, aucune assertion vacuée détectée. Les tests de doctrine (`layout-doctrine`,
`auth-doctrine`, `language-regression`) mordent réellement — `language-regression` a dû
être réécrit pour la migration FR, ce qui le prouve.

- **Dépendances** : aucune
- **Tests à lancer** : `pnpm test`
- **Preuves requises** : le nouveau test doit **échouer** si l'on neutralise la règle `DECLARED_FIXTURE` — c'est la seule preuve qu'il mord
- **Risque** : nul
- **Taille** : **S**
- **Conflits** : ⚠️ la mission a interdit de modifier les tests existants ; ce lot **ajoute** un test sans toucher aux autres

---

## LOT G — Dépendances et scripts

| Élément | Action | Preuve exigée |
|---|---|---|
| `playwright` (devDep) | Candidat au retrait de la déclaration directe — `@playwright/test` le porte en transitif (`dependencies: {"playwright":"1.51.1"}`) | `pnpm exec playwright install` puis `pnpm e2e` doivent rester opérants |
| `sonar` (script) | `npm run test:coverage` → **`pnpm run test:coverage`**. Incohérent avec la doctrine pnpm-only (piège CI n°1 de CLAUDE.md) | lecture du diff |
| `quality:dup` | Seuil 100 % : **exit 0 malgré 56 clones**. Soit abaisser le seuil pour qu'il morde, soit le documenter comme outil de diagnostic — pas comme gate | exit code démontré sur un cas dupliqué |
| `quality:dead`, `lint:fast` | Non documentés, non appelés en CI, redondants (`knip`, `eslint`) | arbitrage |
| `postcss-load-config` | **Aucune action** — faux positif Knip (annotation JSDoc, pas un import) | — |
| `motion` | **Conserver** — 3 fichiers, tous Catalyst. `VENDOR_REQUIREMENT` | — |
| `react-dom` | **Conserver** — peer obligatoire, 0 import direct attendu | — |

- **Dépendances** : aucune
- **Tests à lancer** : `pnpm install --frozen-lockfile` + `pnpm check` + `pnpm build` + `pnpm e2e`
- **Risque** : `DELETE_AFTER_TEST` (`playwright`) · `SAFE_DELETE` (script `sonar`)
- **Taille** : **S**
- **Conflits** : le lockfile est partagé — ne pas exécuter pendant une mise à jour de dépendances (Renovate est actif : `renovate.json`)

---

## LOT H — Assets et documentation

**À faire en premier.** Zéro risque code, valeur immédiate, aucun conflit.

| Fichier | Correction |
|---|---|
| **`README.md`** | 5 corrections : (1) `npm` → **`pnpm`** partout — *un nouvel arrivant qui suit le README casse la CI* ; (2) retirer `check:catalyst` (gate supprimée le 2026-07-31) ; (3) retirer « `AdminShell` reste en fallback » (supprimé au Lot 7) ; (4) remplacer les tokens `brand-*` (« or Hearst H≈45° ») par l'accent mint `#a7fb90` ; (5) « session signée HMAC-SHA256 » → **chiffrée AES-256-GCM** (SEC-02) |
| `sonar-project.properties:32-36` | Retirer `sonar.cpd.exclusions=src/lib/demo-data.ts` et son commentaire — **le fichier n'existe plus** |
| `docs/remediation/AUDIT-2026-08-03-REMEDIATION.md:107-117` | La doctrine **existe** (713 lignes) — la condition qui bloque les lots 4/5 est levée |
| `src/components/catalyst/VENDOR.md:59` | « 18 primitives non utilisées » → **16** (`link` et `navbar` sont consommés dans le kit) |
| `CLAUDE.md` | Worktrees (« aucun » → 3) ; gate `check` inclut `check:ds` ; tests (14 → 24) |
| `docs/visual-reviews/` | Dédoublonner les 4 paires identiques ; arbitrer les séries `REWORK-001..005` |

- **Dépendances** : aucune
- **Tests à lancer** : `pnpm check` (aucun impact attendu — documentation seule, sauf `sonar-project.properties`)
- **Preuves requises** : relecture ; vérifier que chaque commande citée dans le README s'exécute réellement
- **Risque** : nul (documentation) · `SAFE_DELETE` (config Sonar)
- **Taille** : **S**
- **Conflits** : aucun

---

## Tableau de synthèse

| Lot | Sujet | Risque dominant | Taille | Dépend de | Conflit mission produit |
|---|---|---|---|---|---|
| **H** | Docs + Sonar + README | nul | S | — | aucun |
| **B** | Exports, types, helpers | SAFE_DELETE | S | C (partiel) | faible |
| **F** | Fixture orpheline | nul | S | — | ajout de test seulement |
| **G** | Dépendances et scripts | DELETE_AFTER_TEST | S | — | lockfile / Renovate |
| **C** | Formatters dupliqués | REFACTOR_REQUIRED | M | — | i18n (`format.ts`) |
| **D** | Convergence UI | REFACTOR_REQUIRED | L | — | 🔴 **élevé** — 10 routes admin |
| **E** | CSS et tokens | REFACTOR_REQUIRED | M | 🔴 **D2** | design system |
| **A** | Routes et assets | NEEDS_PRODUCT_DECISION | S/M | — | arbitrage produit |

## Ce qu'il ne faut pas faire

- **Ne pas supprimer les tokens `hearst-*`/`cockpit-*`/`neutral-*` avant le LOT D2.** Le rendu casserait sans qu'aucune gate ne rougisse.
- **Ne pas supprimer les tokens `--chart-*` sémantiques.** Ce sont des indirections de doctrine à brancher.
- **Ne pas converger les `Card` locales vers `cockpit.Card`.** Matières visuelles différentes.
- **Ne pas supprimer `components/design-lab/`.** 18 routes en dépendent, malgré le nom.
- **Ne pas supprimer `/admin/vault`.** Redirection nommée comme `surface` de 5 endpoints.
- **Ne pas supprimer les branded types inutilisés de `model.ts`.** Symétrie d'un modèle délibéré.
- **Ne pas toucher à `src/components/catalyst/**`.** Kit vendoré, décision Design System distincte.
- **Ne pas supprimer `resolved-mapper.ts`.** Constat déjà tranché par le Lot 7 : conservé + documenté.
