# Audit de propreté du code — Hearst Connect V1

> **Mission** : AUDIT-CODE-HYGIENE-2026-08-04. **Cartographie uniquement** — aucun
> fichier produit n'a été modifié, déplacé, renommé ni supprimé. Les seuls fichiers
> écrits par cette mission sont les trois rapports de `docs/audits/`.

| | |
|---|---|
| **SHA audité** | `6c5507f37128dd094bb00fdffca9258f61b5ff6a` (`6c5507f`) |
| **SHA de la branche au démarrage** | `8029d85` — voir §15.1, un commit produit *au-dessus* du SHA demandé |
| **Branche / worktree** | `audit/code-hygiene-2026-08-04` — worktree dédié `/Users/adrienbeyondcrypto/Desktop/hearst-connect-v1-hygiene` |
| **Worktree de l'autre agent** | `/Users/adrienbeyondcrypto/Desktop/Herst Connect V1` — **jamais modifié** (lecture seule) |
| **Date** | 2026-08-04 |
| **Baseline historique** | audit Luc 2026-08-03 (`docs/remediation/AUDIT-2026-08-03-REMEDIATION.md`, SHA de départ `4b49dbc`) |

---

## 1. Résumé exécutif

Le dépôt est **sain sur le plan du code mort classique**. Le Lot 7 de la remédiation a
déjà fait le gros du travail : `chart.js`/`react-chartjs-2` retirés, branche `AdminShell`
supprimée, 14 composants orphelins éliminés. Le graphe d'imports reconstruit
indépendamment de Knip le confirme : **aucun fichier applicatif orphelin ne subsiste**.
Les 18 « fichiers morts » que Knip signale encore sont 17 primitives Catalyst vendorées
(décision produit documentée, `VENDOR.md`) et 1 script de documentation.

La dette réelle a changé de nature. Elle n'est plus dans les fichiers qu'on oublie de
supprimer, mais dans **quatre foyers de duplication** :

1. **Primitives d'UI recréées route par route.** `Card` est redéclaré **à l'identique
   dans 9 routes sur 10** (`CardHeader` × 7, `SourceAttendue` × 6, `HeroFigure` × 6,
   `SideFact` × 4), alors que `src/components/admin/cockpit.tsx` exporte déjà ces cinq
   primitives et que `surfaces.tsx` expose les équivalents `AdminSurface`/
   `AdminEmptyState`/`AdminSourceAttendue` — **qui n'ont aucun consommateur**. C'est le
   constat le plus lourd de cet audit : ~40 déclarations locales pour 5 contrats.
2. **Familles de tokens synonymes mortes.** 60 des 112 tokens `@theme` n'ont aucun
   consommateur. Trois familles entières — `--color-brand-*` (8), `--color-surface-*` (4),
   `--color-info-*` (8) — sont **totalement mortes** et redéclarent les mêmes hex que la
   famille canonique `--color-console-*`. 20 valeurs hexadécimales sont portées par
   2 à 7 tokens différents.
3. **Documentation périmée qui contredit activement le code.** Le `README.md` documente
   `npm run` (**le piège CI n°1 de CLAUDE.md** : la CI Hearst est pnpm-only), une gate
   `check:catalyst` supprimée, un `AdminShell` supprimé au Lot 7, et des tokens
   `brand-*` morts. `sonar-project.properties` exclut de la détection de duplication un
   fichier `src/lib/demo-data.ts` **qui n'existe plus**.
4. **Une preuve annoncée mais non produite.** `tests/fixtures/violating-module.txt`
   affirme prouver que la règle `DECLARED_FIXTURE` « mord vraiment » — **aucun test ne
   la charge**. La règle est peut-être correcte ; la preuve, elle, n'existe pas.

**Aucune gate n'est rouge.** `typecheck`, `lint`, `check:mocks`, `check:ds`, `test`
(219 tests / 24 fichiers) et `build` passent tous à `6c5507f`. Rien de ce qui suit
n'est un bug de production : c'est de la dette de propreté.

### Chiffres

| Mesure | Valeur |
|---|---|
| Fichiers suivis examinés | 326 |
| Fichiers TS/TSX sous `src/` | 131 |
| Candidats « code mort » | **21** (dont 12 exports CERTAIN, 0 fichier applicatif) |
| Lignes potentiellement supprimables | **~180** (code) + **~13,6 Mo** (assets) |
| Doublons exacts (jscpd, seuil 100 %) | 56 clones · 787 lignes (3,42 %) |
| Doublons sémantiques (analyse manuelle) | **9 familles** dont 4 majeures |
| Tokens CSS sans consommateur | **60 / 112** |
| Dépendances suspectes | **1** (`playwright`, redondante) |
| Scripts suspects | **2** (`sonar` npm-dans-pnpm ; `quality:dup` non documenté) |
| Tests / fixtures suspects | **3** (1 fixture orpheline, 2 tests de doctrine à surveiller) |
| Assets lourds / dupliqués | **19 Mo de docs · 98 PNG · 4 paires identiques au hash** |
| Candidats SAFE_DELETE | **14** |
| Candidats nécessitant un arbitrage | **11** |

---

## 2. SHA audité et positionnement

L'analyse porte sur `6c5507f`, comme demandé. Un worktree dédié a été créé à ce SHA
exact pour ne jamais toucher au dossier de l'autre agent.

**Écart constaté à l'ouverture** : la branche `remediation/audit-2026-08-03` était déjà
à `8029d85` (« feat(i18n): traduire intégralement la console admin en français »), soit
**un commit produit au-dessus** du SHA de référence. Ce commit a été livré pendant que
cette mission démarrait.

Chaque constat de ce rapport a donc été **re-vérifié à `8029d85`** (§15.1). Résultat :
**tous les constats structurels survivent** — le commit FR ne touche qu'à des libellés
d'affichage, pas à la structure. Les comptages de duplication (`Card` × 10, tokens morts,
fixture orpheline, `demo-data.ts` fantôme) sont identiques aux deux SHA.

---

## 3. Méthode

Trois principes, imposés par le cahier des charges et respectés :

1. **Aucune suppression déclarée sur la seule sortie de Knip.** Un graphe d'imports a été
   reconstruit indépendamment (script `importers.sh`, résolution des alias `@/` *et* des
   chemins relatifs) puis croisé avec Knip. Ce croisement a corrigé une erreur : mon
   premier passage donnait `cockpit.tsx` orphelin, alors qu'il est importé par
   `chart-frame.tsx` via `./cockpit` — un chemin relatif qu'un grep sur `admin/cockpit`
   manque. Le fichier n'est pas mort ; c'est ce qui rend le constat n°1 possible.
2. **Deux preuves indépendantes pour tout constat CERTAIN.** Typiquement : graphe
   d'imports + `grep` exhaustif sur `src`, `tests`, `e2e`, `scripts`, `docs` ; ou
   jscpd + comparaison sémantique lue à la main ; ou manifeste de routes du build réel +
   inspection App Router.
3. **Règles anti-faux-positif appliquées** : points d'entrée App Router jamais déclarés
   morts ; Catalyst classé en catégories `VENDOR_*` et jamais en « supprimable » ;
   tokens CSS vérifiés sous trois formes (`var(--token)`, utilitaire Tailwind dérivé,
   chaîne littérale pour accès JS dynamique) ; exports vérifiés au-delà du dépôt avant
   d'être qualifiés.

---

## 4. Commandes et codes de sortie

Toutes exécutées dans le worktree dédié, à `6c5507f`.

| Commande | Exit | Résultat |
|---|---|---|
| `git rev-parse HEAD` | 0 | `6c5507f37128dd094bb00fdffca9258f61b5ff6a` |
| `git status --short` | 0 | propre (worktree neuf) |
| `git worktree list` | 0 | 3 worktrees (principal, green-lab, hygiene) |
| `git ls-files \| wc -l` | 0 | 326 |
| `git count-objects -vH` | 0 | 36,07 MiB, 2129 objets non compactés |
| `pnpm install --frozen-lockfile` | 0 | lockfile respecté |
| `pnpm typecheck` | **0** | aucune erreur de type |
| `pnpm lint` | **0** | aucune violation |
| `pnpm check:mocks` | **0** | aucune donnée simulée (7 règles) |
| `pnpm check:ds` | **0** | aucun hex hors token |
| `pnpm test` | **0** | **219 tests / 24 fichiers**, tous verts |
| `pnpm build` | **0** | 25 routes générées, compilation 2,0 s |
| `pnpm exec knip` | **1** | 18 fichiers · 54 exports · 13 types · 1 dép. non listée |
| `pnpm quality:dup` (jscpd) | 0 | 56 clones · 787 lignes dupliquées (3,42 %) |

`pnpm quality:dead` est un alias de `knip` (même sortie). `pnpm e2e` n'a **pas** été
lancé : il exige un backend Hearst joignable et des identifiants de connexion, hors
périmètre d'un audit en lecture seule (voir §14, Limites).

---

## 5. Code mort

### 5.1 Fichiers — aucun orphelin applicatif

Le graphe d'imports reconstruit donne **48 fichiers sans importeur**. Après application
des règles anti-faux-positif :

| Catégorie | Nombre | Verdict |
|---|---|---|
| Points d'entrée App Router (`page`/`layout`/`error`/`loading`/`not-found`/`global-error`) | 31 | `KEEP_ENTRYPOINT` — jamais importés par construction |
| Primitives Catalyst vendorées | 17 | `KEEP_VENDOR` — voir §5.4 |
| **Fichiers applicatifs orphelins** | **0** | — |

C'est le résultat le plus important de cette section : **le nettoyage du Lot 7 a tenu**.
Aucun nouveau fichier mort n'est apparu depuis l'audit de Luc.

### 5.2 Exports morts confirmés (2 preuves : Knip + grep exhaustif)

Ces 12 symboles n'ont **qu'une seule référence dans tout le dépôt : leur propre
déclaration**. Vérifiés sur `src`, `tests`, `e2e`, `scripts` et `docs`, aux deux SHA.

| ID | Chemin | Symbole | Lignes | Confiance | Risque |
|---|---|---|---|---|---|
| DEAD-NEW-001 | `src/components/admin/cockpit.tsx:85` | `VerdictCard` | 54 | CERTAIN | SAFE_DELETE |
| DEAD-NEW-002 | `src/components/admin/cockpit.tsx:139` | `ExceptionBanner` | 24 | CERTAIN | SAFE_DELETE |
| DEAD-NEW-003 | `src/components/admin/surfaces.tsx:271` | `AdminLoadingState` | 14 | CERTAIN | SAFE_DELETE |
| DEAD-NEW-004 | `src/components/admin/surfaces.tsx:365` | `AdminActionPanel` | 34 | CERTAIN | SAFE_DELETE |
| DEAD-NEW-005 | `src/lib/admin-nav.ts:243` | `entreeSecondaire` | 12 | CERTAIN | SAFE_DELETE |
| DEAD-NEW-006 | `src/lib/format.ts:35` | `formatCompactNumber` | 4 | CERTAIN | DELETE_AFTER_TEST |
| DEAD-NEW-007 | `src/lib/format.ts:40` | `formatDate` | 5 | CERTAIN | DELETE_AFTER_TEST |
| DEAD-NEW-008 | `src/lib/layout-tokens.ts:27` | `pageInlinePadding` | 1 | CERTAIN | SAFE_DELETE |
| DEAD-NEW-009 | `src/lib/layout-tokens.ts:30` | `pageBlockPadding` | 1 | CERTAIN | SAFE_DELETE |
| DEAD-NEW-010 | `src/lib/layout-tokens.ts:42,45` | `surfacePadding`, `surfaceCompactPadding` | 2 | CERTAIN | SAFE_DELETE |
| DEAD-NEW-011 | `src/lib/layout-tokens.ts:47,48` | `tableCellPadding`, `toolbarPadding` | 2 | CERTAIN | SAFE_DELETE |
| DEAD-NEW-012 | `src/components/admin/surface.tsx:20` | `surfaceSunken` | 2 | HIGH | DELETE_AFTER_TEST |

**Note sur `layout-tokens.ts`** : 6 des 9 tokens de ce module sont morts. Le fichier a
été créé par HC-UI-NORMALIZATION-001 pour centraliser le rythme d'espacement ; seuls
`pageMaxWidth`, `pageSectionGap`, `sectionContentGap` et `gridGap` ont trouvé preneur.
C'est une **abstraction partiellement adoptée**, pas un fichier mort — il garde
3 consommateurs réels.

**Note sur `surfaceSunken`** (HIGH et non CERTAIN) : le symbole est référencé une
deuxième fois, mais uniquement à l'intérieur de `Panel` dans le même fichier — et `Panel`
lui-même n'est appelé nulle part. Le supprimer entraîne `Panel`, d'où `DELETE_AFTER_TEST`.

**Note sur `formatCompactNumber` / `formatDate`** : morts *aujourd'hui*, mais ce sont
des formatters d'un module explicitement conçu comme source unique (§6.3). Les supprimer
alors que 9 sites formatent encore à la main serait un mauvais arbitrage — d'où
`DELETE_AFTER_TEST` et la recommandation de traiter le LOT C avant le LOT B.

### 5.3 Exports superflus — le code vit, l'export ne sert pas

Distinction que Knip ne fait pas et qui change la correction à appliquer : ces symboles
**sont utilisés**, mais uniquement dans leur propre fichier. Le mot-clé `export` est
inutile ; le code, lui, ne l'est pas. Retirer `export` (et non le symbole) est un
changement sans risque de comportement.

| Chemin | Symboles | Usage réel |
|---|---|---|
| `src/lib/theme.ts` | `THEME_STORAGE_KEY`, `currentTheme` | consommés par `toggleTheme`/`THEME_INIT_SCRIPT` |
| `src/lib/chart-theme.ts` | `CATEGORICAL_RAMP`, `MIN_POINTS_FOR_CHART` | consommés par `categoricalColor`/`plottableAsChart` |
| `src/lib/mouvements.ts` | `PHRASE_MOUVEMENT`, `MOTIF_LISIBLE` | consommés par `phraseMouvement`/`motifLisible` |
| `src/lib/backend/auth.ts` | `LOGIN_PATH` | consommé ligne 173 du même fichier |
| `src/lib/statut-affichage.ts` | `estStatutAffichage` | garde de type interne |
| `src/lib/vaults/overview.ts` | `MOVEMENT_ROWS` | interne (et cité dans une revue visuelle) |
| `src/components/logo.tsx` | `Mark` | consommé par `Logo` ligne 25 |
| `src/components/admin/allocation-chart.tsx` | `SEUIL_ECART_SIGNALE_PT` | interne |
| `src/components/admin/truthful.tsx` | `FreshnessIndicator` | consommé ligne 179 |
| `src/components/admin/surfaces.tsx` | `AdminEmptyState` | consommé par `AdminTable` ligne 184 |

Risque : `SAFE_DELETE` sur le mot-clé `export` uniquement. Confiance : CERTAIN.

### 5.4 Catalyst — classification vendorée (jamais « supprimable »)

29 fichiers. Conformément à la règle, aucun n'est déclaré mort.

| Classification | Nombre | Composants |
|---|---|---|
| `VENDOR_USED` | 9 | `heading`, `text`, `table`, `button`, `sidebar`, `input`, `fieldset`, `badge`, `auth-layout` |
| `VENDOR_USED` (interne au kit) | 2 | `link` (importé par 8 composants du kit), `navbar` (importé par les 2 layouts) |
| `VENDOR_AVAILABLE` | 16 | `alert`, `avatar`, `checkbox`, `combobox`, `description-list`, `dialog`, `divider`, `dropdown`, `listbox`, `pagination`, `radio`, `select`, `sidebar-layout`, `stacked-layout`, `switch`, `textarea` |
| `VENDOR_UNDOCUMENTED` | 0 | `VENDOR.md` couvre l'inventaire |
| `VENDOR_FORK_STALE` | 0 | aucune divergence d'API constatée |
| `VENDOR_DUPLICATED_BY_LOCAL_PRIMITIVE` | 2 | voir ci-dessous |

**Correction à apporter à `VENDOR.md`** : il annonce « 18 primitives vendorées non
utilisées ». Le compte exact est **16** — `link.tsx` et `navbar.tsx` sont bien consommés,
mais *à l'intérieur du kit* (`link` par 8 composants, `navbar` par les deux layouts).
Knip ne les listait déjà pas comme morts. Écart documentaire mineur, sans impact code.

Les 2 cas `VENDOR_DUPLICATED_BY_LOCAL_PRIMITIVE` (`table`, `badge`) sont traités en §6.2.
Toute suppression Catalyst relève d'une décision Design System distincte : hors périmètre.

### 5.5 Routes — aucune inatteignable, une dupliquée

Manifeste issu du **build réel** (25 routes), croisé avec `admin-nav.ts` et l'App Router.

| Route | Statut | Verdict |
|---|---|---|
| `/admin/vault` | redirect inconditionnel vers `/admin/vaults` | **`KEEP_ENTRYPOINT`** — pas du code mort : le registre `endpoints.ts` la nomme comme `surface` de 5 endpoints, et des favoris existent. Le fichier ne porte aucun contenu (27 lignes de commentaire + `redirect`). Documenté. |
| `/design-lab/admin-home-green` | **duplique `/admin`** | `NEEDS_PRODUCT_DECISION` — voir §11 |
| `/admin/register` (`(auth)/register`) | présent au build | à vérifier — voir §11 |
| 22 autres | atteignables via nav ou lien | conformes |

Aucune route orpheline, aucune redirection inutile, aucun alias mort.

---

## 6. Doublons

### 6.1 Doublon majeur — primitives d'UI recréées dans 10 routes

**Le constat le plus lourd de cet audit.** Preuves indépendantes : (a) jscpd signale
les blocs, (b) comparaison textuelle des implémentations, (c) inventaire exhaustif des
déclarations locales par route.

| Primitive | Routes qui la redéclarent | Canonique existante |
|---|---|---|
| `Card` | **10** | `cockpit.tsx:28` (+ `AdminSurface` dans `surfaces.tsx:31`) |
| `CardHeader` | **7** | `cockpit.tsx:41` |
| `HeroFigure` | **6** | `cockpit.tsx:163` |
| `SourceAttendue` | **6** | `cockpit.tsx:202` (+ `AdminSourceAttendue`) |
| `SideFact` | **4** | `cockpit.tsx:182` |

Les 10 routes concernées : `btc`, `mining`, `product`, `operations`, `api-explorer`,
`backtest`, `profile`, `keeper`, `administration/produit`, `series-1`.

**Preuve d'identité stricte** — l'implémentation de `Card` est **byte-identique dans
9 routes sur 10** :

```tsx
function Card({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <Panel className={className === '' ? gcc.wavePanel : className}>{children}</Panel>
}
```

Seule `operations/page.tsx` diverge (`clsx(gcc.heroChart, className)`). `keeper`,
`api-explorer` et `profile` ne diffèrent que par `ReactNode` au lieu de `React.ReactNode`
— un import, pas un contrat.

`ClientsMetric` (`clients/page.tsx:49`) et `ComplianceMetric` (`conformite/page.tsx:49`)
sont eux aussi **strictement identiques au nom près** — 13 lignes chacun.

**Qualification : duplication accidentelle**, pas acceptable ni prématurée à factoriser.
Ces blocs ont la même responsabilité, la même implémentation, et une abstraction
adaptée existe déjà — le contraire d'une abstraction prématurée.

**Nuance qui conditionne la correction** : les `Card` locales enveloppent `Panel` du
green command center (matière near-black, `gcc.wavePanel`), tandis que le `Card`
canonique de `cockpit.tsx` applique `surfaceRaised` (matière graphite console). **Ce ne
sont pas les mêmes surfaces visuelles.** Une convergence naïve vers `cockpit.Card`
changerait l'apparence des 10 routes. La cible correcte est une primitive `Card` unique
*du vocabulaire green command center*, à extraire vers
`components/design-lab/green-command-center/primitives.tsx` (qui porte déjà `Panel`,
`Absent`, `Reading`). D'où le classement `REFACTOR_REQUIRED` et non `SAFE_DELETE`.

### 6.2 Doublons UI — compositions concurrentes

Trois vocabulaires de surface coexistent pour le même contrat :

| Contrat | Implémentation A | Implémentation B | Implémentation C |
|---|---|---|---|
| Panneau/carte | `surface.tsx` → `Panel` (0 usage) | `surfaces.tsx` → `AdminSurface` (usage réel) | `primitives.tsx` → `Panel` (31 importeurs) |
| État vide | `surfaces.tsx` → `AdminEmptyState` (interne) | `truthful.tsx` → `EmptyState` | `primitives.tsx` → `Absent` |
| Source attendue | `cockpit.tsx` → `SourceAttendue` | `surfaces.tsx` → `AdminSourceAttendue` | 6 copies locales de route |
| Titre de panneau | `surface.tsx` → `PanelHeading` (0 usage) | `cockpit.tsx` → `CardHeader` | 7 copies locales |

`surface.tsx` est le cas le plus net : **77 lignes dont seuls `surfaceRaised` (4 importeurs)
et `RequirementList` (2 importeurs) servent**. `Panel`, `PanelHeading` et `surfaceSunken`
y sont morts. Le fichier a déjà été partiellement vidé de sa substance sans être nettoyé.

`surfaces.tsx` (481 lignes) est le plus gros module de composition du dépôt : 19 exports,
dont 4 morts et 4 simples ré-exports de `truthful.tsx`. Il joue le rôle de barrel file
non déclaré — ce qui explique pourquoi Knip signale ses ré-exports (ligne 481) comme
inutilisés : ils le sont, les consommateurs important directement depuis `truthful.tsx`.

**Qualification : duplication de transition.** Le dépôt est au milieu d'une migration
du vocabulaire `Admin*` (console graphite) vers le vocabulaire green command center. Les
deux systèmes cohabitent légitimement le temps de la migration ; le défaut est que
**rien ne documente laquelle est la cible**, et que les routes tranchent au cas par cas
en recréant des primitives locales.

### 6.3 Doublons de logique — formatters

`src/lib/format.ts` se déclare « single source of truth » pour le formatage. Neuf sites
formatent pourtant à la main :

| Site | Duplication |
|---|---|
| `btc/page.tsx:167` | pourcentage depuis des bps — `formatPercent(v, {fromBps:true})` existe |
| `btc/page.tsx:189,427` | conversion sats → BTC, deux implémentations **dans le même fichier** |
| `administration/produit/page.tsx` (`bitcoinProduitDe`) | **troisième** conversion sats → BTC |
| `series-1/page.tsx:366` | `toLocaleString('en-US')` — `formatNumber` existe |
| `product-charts.tsx:115` | `toFixed(2)` — `formatPercent` existe |
| `resolved.ts:94` | `toLocaleString('en-US')` + repli `'—'` — duplique `formatNumber` **à l'identique** |
| `vaults/overview.ts:164,166,190` | 3 × `new Intl.DateTimeFormat('en-US', …)` |

Le littéral `'en-US'` est recopié **à 9 endroits** alors que `format.ts` déclare
`const LOCALE = 'en-US'`. Un changement de locale produit exige aujourd'hui 10 éditions.

**Qualification : duplication accidentelle, vraie opportunité de consolidation** — la
cible existe, elle est testée, il suffit de l'appeler. Le seul cas à arbitrer est la
conversion sats → BTC (3 implémentations), qui mérite un `formatBtcFromSats()` dans
`format.ts` plutôt qu'un quatrième appel local.

### 6.4 Doublons de modèle — deux vocabulaires d'absence

`src/lib/resolved.ts` (`Resolved<T>`, `ResolvedStatus`, `formatCount`) et
`src/lib/vaults/model.ts` (`Availability<T>`, `available`/`unavailable`/`editorial`)
répondent tous deux à « une valeur peut être absente, avec un motif nommé ».

`resolved.ts` a 10 importeurs, `model.ts` 39. `src/lib/backend/resolved-mapper.ts`
(78 lignes) est le pont conçu entre les deux — **il n'a aucun importeur runtime**, seul
`tests/resolved.test.ts` l'exerce. Le Lot 7 l'avait déjà identifié (DEAD-04/BAPI-07) et
tranché : **conservé + documenté**, en attente d'une décision produit.

Cette mission **confirme le constat sans le recompter** : l'état est inchangé à `6c5507f`
comme à `8029d85`. Classé `NEEDS_PRODUCT_DECISION`, pas `dead-code`.

**Qualification : duplication acceptable pour l'instant.** Fusionner deux modèles
d'absence dont l'un couvre les enveloppes backend et l'autre le domaine métier
produirait vraisemblablement une abstraction plus complexe que les deux réunies —
exactement ce que le cahier des charges proscrit. À trancher par le produit, pas par
un audit.

### 6.5 Doublons visuels — 20 hex portés par plusieurs tokens

| Valeur | Tokens qui la portent | Nb |
|---|---|---|
| `#000000` | `accent-ink`, `black`, `brand-accent-foreground`, `brand-surface`, `cockpit-card`, `hearst-ink`, `surface-panel` | **7** |
| `#020611` | `brand-background`, `cockpit-deep`, `cockpit-page`, `surface-page`, `zinc-950` | **5** |
| `#18183a` | `brand-surface-raised`, `cockpit-raised`, `surface-raised`, `zinc-800` | **4** |
| `#a7fb90` | `accent-300`, `accent-400`, `brand-accent`, `hearst-accent` | **4** |
| `#0b0e17` | `cockpit-inset`, `surface-sunken`, `zinc-900` | 3 |
| `#191919` | `brand-border`, `hairline`, `neutral-800` | 3 |
| `#b2b2b2` | `brand-muted`, `neutral-400`, `zinc-400` | 3 |
| 13 autres | 2 tokens chacune | 2 |

L'accent `#a7fb90` sous 4 noms contredit directement la note de convergence
(« **`#a7fb90` est l'unique accent** »). La gate `check:ds` interdit un hex brut hors
token — elle n'empêche pas un même hex de vivre sous quatre tokens.

Détail : `--color-accent-300` apparaît **deux fois avec deux valeurs différentes**
(`#a7fb90` et `#c1fcb1`) — dans deux blocs de thème distincts, donc légitime, mais
c'est un piège de lecture qui mérite un commentaire.

### 6.6 Clones jscpd — lecture qualifiée

56 clones, 787 lignes (3,42 %). Après lecture, la répartition réelle :

| Nature | Clones | Qualification |
|---|---|---|
| Blocs d'imports/`metadata` en tête de route | ~18 | **Duplication acceptable** — bruit d'outil, aucune valeur à factoriser |
| Kit Catalyst vendoré (`checkbox`/`radio`, `alert`/`dialog`, `combobox`/`listbox`…) | 11 | **KEEP_VENDOR** — hors périmètre par règle |
| `LICENSE.md` (3 clones) | 3 | Faux positif — texte de licence |
| Primitives locales de route (§6.1) | ~14 | **Duplication accidentelle** — vraie cible |
| Cellules de tableau internes à un composant | ~8 | À examiner au cas par cas, gain faible |
| `actions.ts:35-47` ↔ `78-89` | 1 | Deux Server Actions au préambule identique — **duplication accidentelle**, gain réel mais petit |
| Modules CSS du green command center | 2 | À examiner (1410 lignes de module CSS) |

Le clone le plus long (96 lignes, `administration/produit` ↔ `mining`) est **surestimé** :
il couvre `metadata` + imports + primitives locales + définitions de types
`Resolu<T>`/`Mining`/`Btc`. Sa partie réellement factorisable est celle de §6.1.

---

## 7. Dépendances

Aucune dépendance n'a été retirée (interdit par la mission). Classification des 10
dépendances de production et 24 de développement :

| Paquet | Classe | Preuve |
|---|---|---|
| `next`, `react`, `clsx` | `USED_RUNTIME` | 43 / 31 / 52 fichiers |
| `react-dom` | `USED_RUNTIME` | 0 import direct, mais **peer obligatoire** de React DOM/Next — `UNUSED` serait un faux positif |
| `@headlessui/react` | `USED_RUNTIME` | 21 fichiers (20 Catalyst + `site-header.tsx`) |
| `@heroicons/react` | `USED_RUNTIME` | 7 fichiers |
| `recharts` | `USED_RUNTIME` | 6 fichiers — moteur de dataviz unique |
| `motion` | `VENDOR_REQUIREMENT` | 3 fichiers, **tous dans Catalyst** (`navbar`, `sidebar`, `sidebar-layout`). Aucun usage produit. À conserver tant que le kit est vendoré. |
| `server-only` | `USED_RUNTIME` | 4 modules serveur (`env`, `client`, `auth`, `registry`) — garde d'architecture |
| `zod` | `USED_RUNTIME` | 1 seul fichier (`backend/keeper.ts`) — usage réel mais très localisé |
| `playwright` | **`UNUSED_PROBABLE`** | **Aucun import.** `@playwright/test` (aussi en devDep) déclare `"playwright": "1.51.1"` en dépendance — le paquet est donc installé de toute façon. Doublon de déclaration. |
| `@playwright/test` | `USED_TEST` | 3 fichiers (2 specs + config) |
| `jscpd`, `knip`, `oxlint` | `USED_SCRIPT` | scripts `quality:dup`, `quality:dead`, `lint:fast` |
| `@vitest/coverage-v8` | `USED_SCRIPT` | `test:coverage`, requis par `sonar` |
| `jsdom` | `USED_TEST` | `environment: 'jsdom'` dans `vitest.config.mts` |
| `prettier` + 2 plugins | `USED_BUILD` | `prettier.config.mjs` |
| `tailwindcss`, `@tailwindcss/postcss`, `postcss` | `USED_BUILD` | `postcss.config.mjs`, `tailwind.css` |
| `eslint`, `eslint-config-next` | `USED_BUILD` | `eslint.config.mjs` |
| `typescript`, `vitest`, `@types/*`, `@testing-library/*` | `USED_BUILD`/`USED_TEST` | configs + 24 fichiers de test |

**Une seule dépendance suspecte : `playwright`.** Confiance MEDIUM, risque
`DELETE_AFTER_TEST` — la retirer suppose de vérifier que `pnpm exec playwright install`
reste opérant via la dépendance transitive.

**Faux positif Knip écarté** : `postcss-load-config` est signalé « unlisted dependency »
alors qu'il n'apparaît que dans une **annotation de type JSDoc**
(`/** @type {import('postcss-load-config').Config} */`) de `postcss.config.mjs`. Le
paquet n'est pas installé et le build passe : aucune action.

---

## 8. Scripts

| Script | État | Constat |
|---|---|---|
| `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch` | Vivant | standard |
| `check` | Vivant, **canonique** | `typecheck → lint → check:mocks → check:ds → test`. **Écart documentaire** : CLAUDE.md décrit la gate sans `check:ds`, alors que le script l'inclut (ajouté par UI-04). |
| `check:mocks`, `check:ds` | Vivants, en CI | job `truthful-data` de `ci.yml` |
| `e2e` | Vivant | non lancé ici (backend requis) |
| `test:coverage` | Vivant | consommé par `sonar` |
| `lint:fast` | **Suspect** | `oxlint src` — non documenté, non appelé en CI, non appelé par `check`. Redondant avec `lint`. `UNUSED_PROBABLE`. |
| `quality:dead` | **Suspect** | alias strict de `knip` — n'apporte rien qu'`pnpm exec knip` ne fasse. Non documenté dans CLAUDE.md. |
| `quality:dup` | **Suspect** | `jscpd src --threshold 100` — le seuil 100 % ne fait jamais échouer le script (exit 0 constaté malgré 56 clones). **Un contrôle qualité qui ne peut pas échouer.** Utile en diagnostic, trompeur comme « gate ». |
| `sonar` | **Défaut réel** | **`npm run test:coverage`** dans un dépôt **pnpm-only**. C'est le piège n°1 documenté en tête de CLAUDE.md (« Ne jamais faire `npm install` ici »). `npm run` n'installe rien, mais la commande est incohérente avec la doctrine du dépôt et invite à l'erreur. Dépend en outre d'une IP privée en dur (`http://100.88.191.49:9010`) et de Docker : hors CI, hors réseau, le script échoue silencieusement. |

**Deux scripts annoncent une preuve qu'ils ne produisent pas** : `quality:dup` (seuil
inatteignable) et `sonar` (dépendance à une IP privée non joignable depuis la CI).

---

## 9. Tests et fixtures

24 fichiers, **219 tests, tous verts**. Aucun `.skip`, aucun `.only`, aucun `todo`.
La suite est en bon état. Trois points méritent attention.

| Chemin | Responsabilité annoncée | Comportement réellement prouvé | Recommandation |
|---|---|---|---|
| `tests/fixtures/violating-module.txt` | « prouve que la règle `DECLARED_FIXTURE` mord vraiment : un gate qui ne casse jamais ne démontre rien » | **Aucun.** Le fichier n'est référencé par aucun test, aucun script, aucune config. `check-no-mocks.mjs` ne scanne que `src/**` et ne lit que `.ts`/`.tsx` — il ne peut pas voir un `.txt` sous `tests/`. **La preuve annoncée n'existe pas.** | **`REWRITE`** — ajouter un test qui passe la fixture à la règle et exige une violation. La fixture est bien conçue ; c'est le harnais qui manque. Ne pas supprimer. |
| `tests/language-regression.test.ts` | interdisait le français dans la console | **Inversé par `8029d85`** : impose désormais le français. Sain à HEAD. Au SHA audité (`6c5507f`) il interdisait encore le FR. | `KEEP` — aucune action, signalé pour la traçabilité du delta |
| `tests/layout-doctrine.test.tsx`, `tests/auth-doctrine.test.ts` | doctrine vérifiée par lecture de source (`readFileSync` × 4 et × 2) | Tests de doctrine légitimes (interdiction de motifs), mais **fragiles au renommage** : ils lisent des chemins en dur. Ils mordent réellement (`language-regression` a dû être réécrit avec la migration FR — preuve qu'ils ne sont pas vacués). | `KEEP` — surveiller, ne pas multiplier |

Aucune fixture inutilisée hors celle citée. Aucun snapshot. Aucune assertion vacuée
détectée. Les exclusions de couverture de `sonar-project.properties` sont motivées par
un commentaire et cohérentes (UI App Router, kit vendoré, I/O).

---

## 10. CSS et tokens

`src/styles/tailwind.css` — 293 lignes, **112 tokens** déclarés dans `@theme`.

### 10.1 Tokens sans consommateur : 60 sur 112

Chaque token a été testé sous **trois formes** avant d'être déclaré non consommé :
`var(--token)` dans CSS/TS/TSX · utilitaire Tailwind dérivé (`bg-`, `text-`, `ring-`,
`border-`, `fill-`, `stroke-`, `from-`, `to-`, `shadow-`…) · chaîne littérale (accès JS
dynamique type `getPropertyValue`).

**Familles entièrement mortes** (0 consommateur sous quelque forme que ce soit) :

| Famille | Tokens | Confiance | Risque |
|---|---|---|---|
| `--color-brand-*` | 8 (`accent`, `accent-foreground`, `background`, `border`, `foreground`, `muted`, `surface`, `surface-raised`) | CERTAIN | SAFE_DELETE |
| `--color-info-*` | 8 (`50`…`950`, `ink`) | CERTAIN | SAFE_DELETE |
| `--color-surface-*` | 4 (`page`, `panel`, `raised`, `sunken`) | CERTAIN | SAFE_DELETE |
| `--chart-positive/negative/warning/neutral` | 4 | HIGH | `NEEDS_PRODUCT_DECISION` |

Les familles `--color-brand-*` et `--color-surface-*` sont les **tokens de l'ancien thème
Hearst « or »** décrit dans le README (« brand-accent (or Hearst H≈45°) ») — un système
visuel remplacé par l'accent mint. Elles n'ont plus aucun rôle.

**Cas particulier `--chart-*`** : les 4 tokens de statut ont été ajoutés par `56a9c0f`
au titre de la doctrine §7.5, mais `chart-theme.ts` référence directement
`--color-success-400` / `--color-warning-400` / `--color-danger-400` — les tokens `--chart-*`
sémantiques ne sont donc jamais résolus. **Ce n'est pas du token mort à supprimer :
c'est une indirection prévue par la doctrine et non branchée.** À brancher (faire pointer
`chart-theme.ts` vers `--chart-positive` etc.), pas à retirer. Les tokens `--chart-1..5`,
`--chart-grid`, `--chart-axis`, `--chart-tooltip-surface`, eux, **sont** consommés
par `chart-theme.ts`.

**Familles partiellement mortes** : `--color-accent-{100,200,800,950,soft}` (5 paliers
inutilisés sur une rampe de 11 — normal pour une rampe complète, `KEEP`),
`--color-success-{50,300,600,700,950,ink}`, `--color-warning-{50,950,ink}`,
`--color-danger-{600,950,ink}`, `--color-neutral-{50,400,800}`, `--color-cockpit-*`
(3/5 utilisés), `--color-console-{shell,section,card-top}`, `--color-hairline`,
`--color-border-control`, `--font-{sans,display,mono}` (alias de `--font-satoshi`,
consommés par Tailwind — `KEEP`).

### 10.2 Violations de couches actives

| Violation | Chemin | Constat |
|---|---|---|
| Famille héritée utilisée en production | `src/components/admin/truthful.tsx:56-58,106,121,180` | Utilise `bg-hearst-ok/warn/bad`, `text-hearst-warn` — la famille `--color-hearst-*`, doublon de `--color-success/warning/danger-*`. **La doctrine impose les états sémantiques**, pas la famille `hearst-*`. |
| Idem | `src/components/admin/truthful.tsx:194,226,258` | `bg-cockpit-inset` au lieu de `bg-console-inset` — vocabulaire de l'ancien thème cockpit |
| Idem | `src/components/admin/surfaces.tsx:412` | `bg-neutral-600` au lieu de `zinc-*`/`console-*` |

Ces trois usages **maintiennent en vie** les familles `hearst-*`, `cockpit-*` et
`neutral-*`. Elles ne peuvent pas être supprimées avant que `truthful.tsx` et
`surfaces.tsx` ne convergent vers les tokens canoniques. Dépendance à respecter dans
le plan de nettoyage (LOT E après LOT D).

### 10.3 CSS Modules

`green-command-center.module.css` — **1410 lignes**, le plus gros fichier du dépôt.
2 clones internes signalés par jscpd (lignes 265-276 ↔ 1169-1180 et 645-654 ↔ 1025-1034).
Aucun CSS Module non importé. `final-overrides.css` (121 lignes) est importé par
`design-lab/admin-home-green/layout.tsx` — vivant, mais lié à une route sandbox (§11).

Aucun sélecteur manifestement jamais rendu n'a été prouvé : une vérification fiable
exigerait une analyse au rendu, hors périmètre (voir §14).

`prefers-reduced-motion` est respecté (`tailwind.css` et le module CSS de la console) —
conforme à la doctrine, aucune animation fautive détectée.

---

## 11. Routes et composants concurrents

### 11.1 `/design-lab/admin-home-green` — duplication réelle de `/admin`

Les deux routes rendent **le même composant, avec les mêmes données** :

```tsx
// src/app/admin/page.tsx ET src/app/design-lab/admin-home-green/page.tsx
const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })
return <GreenAdminHomeDashboard registry={registry} user={publicUser(session)} />
```

ARCH-02 a déjà posé la garde `if (NODE_ENV === 'production') notFound()`, prouvée en
production réelle. **Le risque d'exposition est fermé** ; la duplication de code, elle,
demeure : 2 fichiers de route + 1 CSS d'override (121 lignes) + le dossier
`components/design-lab/green-command-center/` (10 fichiers, dont le module CSS de
1410 lignes).

Nuance importante : ce dossier `design-lab/` **n'est pas un laboratoire mort** — il est
importé par **18 routes admin** (`green-command-center-shell`, `green-command-rail`) et
`primitives.tsx` a 31 importeurs. C'est le système de composition de toute la console,
qui vit sous un nom de dossier « laboratoire ». Les notes de design le signalent déjà
(« Sortie de `design-lab/` … à faire dans la mission FR/compositions »).

**Ce qui est réellement dupliqué est donc la route seule**, pas les composants.
`NEEDS_PRODUCT_DECISION` : soit la route sandbox est retirée (le contenu est identique
à `/admin`), soit elle est conservée comme banc d'essai. Estimation S.

### 11.2 `/register` — page à qualifier

`src/app/(auth)/register/page.tsx` est bâtie au build (`○ /register`, statique) mais
n'apparaît dans aucune navigation vérifiée. Non classée `dead` : une page d'inscription
atteignable par URL directe peut être un choix produit. `UNKNOWN_EXTERNAL_CONSUMER`,
confiance LOW — **à qualifier par le produit**, pas par un audit.

---

## 12. Assets et workspace

### 12.1 Workspace — propre

| Contrôle | Résultat |
|---|---|
| Lockfiles concurrents (`package-lock.json`, `yarn.lock`) | **Aucun** — conforme à la doctrine pnpm-only |
| Fichiers `.env` suivis | Seul `.env.example` (attendu, sans valeur) |
| `.DS_Store`, `*.bak`, `*.old`, `*.tmp`, `*.orig` suivis | **Aucun** |
| `node_modules` imbriqués suivis | **Aucun** |
| Artefacts de build suivis (`.next`, `coverage`, `test-results`) | **Aucun** — `.gitignore` complet et correct |
| Non suivis dans le worktree principal | `.vscode/mcp.json` uniquement |
| Secrets en clair | **Aucun détecté** (aucune valeur n'est reproduite ici par principe) |
| Worktrees | 3 déclarés, cohérents. CLAUDE.md indique « aucun au 2026-07-27 » — **information périmée** |
| `git count-objects` | 36,07 MiB, **2129 objets non compactés, 0 pack** — un `git gc` réduirait nettement l'empreinte |

### 12.2 Assets — 19 Mo de captures pour 36 Mo de dépôt

`docs/` pèse **19 Mo**, dont **19,1 Mo pour `docs/visual-reviews/` seul** (98 PNG).
Les captures sont plus lourdes que tout le code du projet.

**4 paires strictement identiques** (même hash `git hash-object`, donc même blob) :

| Fichier A | Fichier B |
|---|---|
| `HC-DESIGN-SYSTEM-CONVERGENCE-001/console-desktop-1440x900.png` | `HC-FULL-REMEDIATION-001/desktop-1440x900.png` |
| `HC-DESIGN-SYSTEM-CONVERGENCE-001/login-dark-1440x900.png` | `HC-FULL-REMEDIATION-001/login-1440x900.png` |
| `HC-DESIGN-SYSTEM-CONVERGENCE-001/console-laptop-1280x800.png` | `HC-FULL-REMEDIATION-001/laptop-1280x800.png` |
| `HC-DESIGN-SYSTEM-CONVERGENCE-001/chart-panel-1440x900.png` | `HC-DESIGN-SYSTEM-CONVERGENCE-001/mining-chart-1440x900.png` |

La quatrième paire est la plus problématique : **deux captures du même fichier présentées
comme deux preuves différentes** (« chart-panel » et « mining-chart ») au sein d'une
même revue. La preuve visuelle annoncée est en double.

**Fichiers les plus lourds** :

| Chemin | Taille | Nature |
|---|---|---|
| `HC-GREEN-COMMAND-CENTER-SANDBOX-001/overlay-2048x1146.png` | 968 Ko | overlay de comparaison |
| `HC-GREEN-COMMAND-CENTER-SANDBOX-001/diff-2048x1146.png` | 812 Ko | diff visuel |
| `HC-GREEN-COMMAND-CENTER-SANDBOX-001/sandbox-2048x1146.png` | 600 Ko | capture sandbox |
| `HC-GREEN-COMMAND-CENTER-SANDBOX-001/reference-html-2048x1146.png` | 584 Ko | référence |
| `HC-ADMIN-DASHBOARD-002/api-explorer-desktop.png` | 460 Ko | capture |

**Séries de reprise redondantes** : `HC-GREEN-COMMAND-CENTER-SANDBOX-REWORK-001` à
`-006` — **six itérations** de la même capture `admin-home-green` à quatre résolutions,
soit ~4,5 Mo. Seule la dernière (`-006`) documente l'état final ; les cinq premières sont
l'historique d'une mise au point, que git conserve déjà.

Toutes les revues sauf deux (`HC-GREEN-COMMAND-CENTER-SANDBOX-REWORK-00X`, `HC-UX-001`)
disposent d'un `manifest.json`. Recommandation : `KEEP` pour les preuves finales,
`NEEDS_PRODUCT_DECISION` pour les séries de reprise intermédiaires — une revue visuelle
est une preuve d'audit, la supprimer est un arbitrage de gouvernance, pas de propreté.

### 12.3 Documentation périmée

| Document | Constat | Gravité |
|---|---|---|
| **`README.md`** | **4 assertions fausses** : (1) `npm install` / `npm run dev` / `npm run check` — **le dépôt est pnpm-only, c'est le piège CI n°1 de CLAUDE.md** ; (2) `npm run check:catalyst` — gate **supprimée le 2026-07-31** ; (3) « `AdminShell` reste en fallback » — **supprimé au Lot 7** ; (4) tokens `brand-background`/`brand-surface`/`brand-accent` (« or Hearst H≈45° ») — **famille morte**, l'accent est mint `#a7fb90`. Décrit aussi la session comme « signée HMAC-SHA256 » alors que SEC-02 l'a passée en **chiffrement AES-256-GCM**. | **Haute** — un nouvel arrivant qui suit le README casse la CI |
| `sonar-project.properties:36` | `sonar.cpd.exclusions=src/lib/demo-data.ts` — **le fichier n'existe pas** (supprimé avec les données de démonstration). L'exclusion et son commentaire de 3 lignes décrivent un jeu de démo qui n'a plus lieu d'être dans un dépôt dont la garantie centrale est l'absence de données simulées. | Moyenne |
| `CLAUDE.md` | « Worktrees déclarés : aucun au 2026-07-27 » → **3 worktrees existent**. Gate décrite sans `check:ds` alors que `check` l'inclut. « 14 fichiers de tests au 2026-07-28 » → **24**. | Faible (dates explicites) |
| `docs/remediation/AUDIT-2026-08-03-REMEDIATION.md` | Affirme que `HEARST-CONNECT-V1-DESIGN-SYSTEM-DOCTRINE.md` « **n'est pas présent dans le dépôt** » → **il existe** (713 lignes, ajouté par `6c5507f`). Les lots 4/5 y sont marqués « CONDITIONNÉ À LA DOCTRINE » : la condition est levée. | Moyenne — bloque des lots à tort |
| `src/components/catalyst/VENDOR.md` | « 18 primitives non utilisées » → **16** (`link` et `navbar` sont consommés dans le kit) | Faible |
| `docs/quality/SONARQUBE-CLEANUP-001.md` | Décrit un scan sur une IP privée ; baseline du 2026-07-28 non rejouable hors réseau | Faible — daté explicitement |

---

## 13. Risques de suppression

| Risque | Éléments | Ce qu'il faut avant de toucher |
|---|---|---|
| `SAFE_DELETE` | 12 exports morts (§5.2), 20 tokens de familles mortes `brand-*`/`surface-*`/`info-*` | `pnpm check` |
| `DELETE_AFTER_TEST` | `surfaceSunken`+`Panel`, `formatCompactNumber`, `formatDate`, dép. `playwright` | `pnpm check` + `pnpm build` + `pnpm e2e` |
| `REFACTOR_REQUIRED` | Primitives de route (§6.1), formatters locaux (§6.3), violations de couche (§10.2) | revue visuelle — **ces changements touchent le rendu** |
| `KEEP_VENDOR` | 29 fichiers Catalyst | décision Design System distincte |
| `KEEP_ENTRYPOINT` | 31 points d'entrée App Router, `/admin/vault` | rien — ne pas toucher |
| `NEEDS_PRODUCT_DECISION` | route `/design-lab/*`, `resolved-mapper.ts`, tokens `--chart-*` sémantiques, séries de captures REWORK | arbitrage produit |
| `UNKNOWN_EXTERNAL_CONSUMER` | `/register` | qualification produit |

**Piège principal identifié** : les tokens `hearst-*`, `cockpit-*` et `neutral-*`
*paraissent* morts sur une lecture rapide, mais sont maintenus en vie par `truthful.tsx`
et `surfaces.tsx` (§10.2). Les supprimer sans traiter d'abord ces deux fichiers
**casserait le rendu de la console sans faire échouer aucune gate** — `check:ds`
n'interdit que les hex bruts, pas un utilitaire Tailwind pointant vers un token disparu.
C'est le risque le plus sérieux de tout le plan de nettoyage.

---

## 14. Limites

1. **`pnpm e2e` non exécuté.** Exige un backend Hearst joignable et des identifiants.
   Les 17 tests Playwright n'ont donc pas été rejoués ; je m'appuie sur le rapport du
   Lot 3 pour leur état. Toute suppression touchant le rendu doit les relancer.
2. **Aucune analyse au rendu.** Les sélecteurs CSS « jamais rendus » et les branches
   conditionnelles inatteignables n'ont pas pu être prouvés statiquement de façon fiable.
   Le module de 1410 lignes du green command center n'a pas été audité classe par classe.
3. **Consommation externe non vérifiable.** Ce dépôt ne publie pas de paquet ; j'ai
   traité l'absence de consommateur interne comme suffisante pour un export applicatif,
   en classant « candidat » et non « suppression certaine » quand un doute subsistait.
4. **Analyse à `6c5507f`, dépôt vivant à `8029d85`.** Tous les constats ont été
   re-vérifiés à HEAD (§15.1), mais un commit produit peut atterrir pendant la rédaction.
5. **Tokens : faux positifs résiduels possibles.** Une classe Tailwind construite par
   concaténation (`` `bg-${x}-500` ``) échapperait aux trois formes testées. Aucune
   construction de ce type n'a été trouvée, mais l'absence de preuve n'est pas une preuve.
6. **Poids des assets mesuré sur le disque**, pas sur l'historique git. Supprimer un PNG
   ne réduit pas le dépôt cloné tant que l'historique le porte.
7. **`git count-objects` a signalé un avertissement** (`garbage found: .git/worktrees/…/refs`)
   lié à mon propre worktree — sans conséquence, mentionné par transparence.

---

## 15. Comparaison avec l'audit de Luc (2026-08-03)

### 15.1 Delta

| Constat de la baseline | État à `6c5507f` | Recompté ? |
|---|---|---|
| DEAD-05 — `chart.js`/`react-chartjs-2` | **Supprimés.** Absents de `package.json`, 0 import. | **Non** |
| DEAD-02/ARCH-03 — branche `AdminShell` | **Supprimée.** 0 référence dans le code. Subsiste **uniquement dans le README** (§12.3). | **Non** |
| DEAD-01/09 — 14 composants orphelins | **Supprimés.** Graphe d'imports : 0 orphelin applicatif. | **Non** |
| DEAD-06 — 17 Catalyst inutilisés | **Conservés** (décision produit, `VENDOR.md`). | Reclassé `VENDOR_*`, non recompté |
| DEAD-04/BAPI-07 — `resolved-mapper.ts` | **Inchangé** : 0 import runtime, testé, documenté. | **Non** — confirmé, pas recompté |
| ARCH-02 — `/design-lab` en production | **Fermé** : garde `notFound()` prouvée en prod. | Duplication de route relevée séparément (§11.1) |
| Lot 7 restant — « assets/PNG (16 Mo docs) » | **Toujours ouvert, aggravé** : 19 Mo aujourd'hui (+3 Mo depuis). | Quantifié précisément (§12.2) |
| Lots 4/5 « conditionnés à la doctrine absente » | **Condition levée** : la doctrine existe (713 lignes, `6c5507f`). | Signalé comme doc périmée |
| LANGUE PRODUIT (FR) « bloqué » | **Débloqué et livré** par `8029d85`. | Hors périmètre |

**Aucun élément déjà supprimé n'est recompté dans ce rapport.** Les 21 candidats de §5
sont tous nouveaux ou explicitement requalifiés.

### 15.2 Nouveaux déchets apparus depuis `4b49dbc`

| Élément | Origine | Section |
|---|---|---|
| Tokens `--chart-*` sémantiques non branchés | `56a9c0f` (doctrine §7.5) | §10.1 |
| Exclusion `demo-data.ts` fantôme dans Sonar | fichier supprimé, exclusion oubliée | §12.3 |
| Doctrine déclarée absente alors qu'elle existe | `6c5507f` ajoute la doctrine, la remédiation n'est pas mise à jour | §12.3 |
| 3 Mo de captures supplémentaires | missions visuelles successives | §12.2 |
| `VENDOR.md` : 18 vs 16 primitives | comptage initial approximatif | §5.4 |

---

## 16. Priorisation

Classement par **rapport valeur / risque**, pas par volume.

| Rang | Lot | Pourquoi d'abord | Risque | Taille |
|---|---|---|---|---|
| **1** | **H — README + Sonar + docs** | Le README fait activement échouer la CI de quiconque le suit (`npm install`). Zéro risque code, valeur immédiate. | Nul | S |
| **2** | **B — exports et types morts** | 12 exports CERTAIN, 2 preuves chacun, aucun impact rendu. Nettoie la sortie Knip et rend les prochains audits lisibles. | SAFE_DELETE | S |
| **3** | **F — fixture orpheline** | Une preuve annoncée mais inexistante est pire qu'une absence de preuve. Corriger le harnais, pas la fixture. | Nul | S |
| **4** | **G — dépendances et scripts** | `playwright` redondant, `sonar` en npm dans un dépôt pnpm. Corrige une incohérence de doctrine. | DELETE_AFTER_TEST | S |
| **5** | **C — formatters dupliqués** | 9 sites, cible existante et testée. Gain de véracité : un formatage centralisé propage correctement l'absence. | REFACTOR_REQUIRED | M |
| **6** | **D — convergence UI** | Le plus gros gain (~40 déclarations → 5), mais touche 10 routes et le rendu. Exige une revue visuelle. | REFACTOR_REQUIRED | L |
| **7** | **E — CSS et tokens** | 60 tokens, mais **dépend du LOT D** : `truthful.tsx` doit converger avant que `hearst-*`/`cockpit-*` puissent disparaître. | REFACTOR_REQUIRED | M |
| **8** | **A — routes et assets** | `/design-lab` et les séries de captures demandent un arbitrage produit, pas une décision technique. | NEEDS_PRODUCT_DECISION | M |

**Séquencement contraint** : LOT D **avant** LOT E (§10.2). LOT C **avant** la
suppression de `formatCompactNumber`/`formatDate` du LOT B — sinon on supprime des
formatters au moment même où 9 sites devraient commencer à les appeler.

Le détail par lot (fichiers, dépendances, tests, preuves, conflits) est dans
`CODE-HYGIENE-CLEANUP-PLAN.md`. Les constats machine-readable sont dans
`CODE-HYGIENE-AUDIT-2026-08-04.json`.
