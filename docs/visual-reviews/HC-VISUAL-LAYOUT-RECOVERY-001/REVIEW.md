# HC-VISUAL-LAYOUT-RECOVERY-001 — Remise en état visuelle

| | |
|---|---|
| **Routes** | `/admin/operations` · `/admin/dashboard` |
| **SHA avant** | `bbc4c05` |
| **Branche** | `fix/visual-layout-recovery-2026-08-04` |
| **Backend** | réel — indexeur `STALLED`, rebalancing `UNAVAILABLE` |
| **Viewports** | 1440×900 · 1280×800 · 1024×768 · 768×1024 · 375×812 · zoom 200 % |

## Le bilan, en une table

Douze combinaisons route × viewport, mesurées dans le DOM rendu avant et après.

| Route | Viewport | Verticalisés | Tronqués | Scrolls Y imbriqués |
|---|---|---|---|---|
| operations | 1440×900 | **3 → 0** | **32 → 0** | 1 → 0 |
| operations | 1280×800 | **8 → 0** | **24 → 0** | 2 → 0 |
| operations | 1024×768 | **6 → 0** | **39 → 0** | 2 → 0 |
| operations | 768×1024 | **3 → 0** | **39 → 0** | 3 → 0 |
| operations | 375×812 | **3 → 0** | **31 → 0** | 3 → 0 |
| operations | zoom 200 % | **3 → 0** | 0 → 0 | 3 → 0 |
| dashboard | 1440×900 | 0 → 0 | **1 → 0** | 2 → 0 |
| dashboard | 1280×800 | 0 → 0 | **1 → 0** | 3 → 0 |
| dashboard | 1024×768 | 0 → 0 | **1 → 0** | 3 → 0 |
| dashboard | 768×1024 | 0 → 0 | **1 → 0** | 3 → 0 |
| dashboard | 375×812 | 0 → 0 | 0 → 0 | 3 → 0 |
| dashboard | zoom 200 % | 0 → 0 | 0 → 0 | 3 → 0 |

**31 défilements verticaux imbriqués supprimés, sur 31.** Zéro débordement
global, zéro panneau vide anormal, zéro erreur console, zéro réponse 5xx —
avant comme après.

## Les causes racines

Le défaut n'était pas dans les deux composants signalés. Il venait de la
**chaîne de conteneurs** de la console, et se manifestait partout où le contenu
dépassait ce que la grille lui avait alloué.

### 1. La console était un cockpit qui ne défile pas

`.viewport` déclarait `height: 100dvh` + `overflow: hidden`, et `.shell` la
même chose. Tout contenu plus haut que l'écran était **coupé**, pas rendu
atteignable — et pour compenser, `.workspace` défilait à l'intérieur. D'où les
barres imbriquées : une page qui défile, dans un cadre qui ne défile pas.

Mesuré sur `/admin/dashboard` à 1440×900 : le tableau « Surface par surface »
demandait **822 px dans un panneau de 359** — 463 px invisibles.

**Correction** : `min-height` au lieu de `height`. Le cockpit reste identique
quand le contenu tient (l'écran est rempli, rien ne défile) ; la page grandit
quand il ne tient pas. Le défilement redevient celui du document, à l'endroit
où on l'attend.

### 2. Des hauteurs de rangée figées

`.workspace` déclarait `grid-template-rows: 132px | 1fr | 304px`, et
`.metricsRow` / `.bottomRow` ajoutaient `height: 100%`. Les rangées ne
pouvaient donc pas suivre leur contenu ; ce qui dépassait passait sous les
`overflow: hidden` en aval.

**Correction** : `auto` sec, sans plancher. Une première tentative avait gardé
les mesures de référence comme *minimum* (`minmax(132px, auto)`) — elle creusait
300 px de noir sous les panneaux quand le contenu était court. Un vide imposé se
lit comme un chargement raté : c'est le défaut qu'on corrige, pas une option.

### 3. Des grilles décidées par la largeur de l'écran

Cinq grilles de `/admin/operations` utilisaient `lg:` / `sm:` — des points de
rupture de **viewport** — alors qu'elles vivaient dans des colonnes dont la
largeur ne suit pas celle de l'écran. À 1280 px, `lg:grid-cols-3` s'appliquait
dans une colonne qui n'avait plus la place : « Premier mouvement enregistré »
se rendait sur **25 px de large pour 264 de haut**, un caractère par ligne.

**Correction** : container queries (`@container` + `@[46rem]:`). La décision
suit la largeur du conteneur, pas celle de la fenêtre.

Même cause pour `AdminGrid` : sa grille 12 colonnes s'activait à `lg` (1024 px),
où une colonne de 4/12 laissait ~85 px. Palier déplacé à `xl` (1280 px).

### 4. Un tableau à colonnes égales

`AdminTable` posait `table-fixed` : six colonnes de largeur identique, sans
regarder leur contenu. Chaque colonne du registre des mouvements recevait 66 px,
et « Investisseur » (89 px) comme « 0xcf2e…da78 » (86 px) débordaient.

**Correction** : `table-auto` + `min-w-max`. Chaque colonne prend la largeur que
son contenu demande, et le conteneur de Catalyst gère un défilement
**horizontal** — le seul justifié pour un tableau large, et le seul conservé.

### 5. Des `white-space: nowrap` trop larges

Trois règles interdisaient le retour à la ligne sur des éléments qui portent
aussi du texte de phrase : `.cellStrong` (« L'électricité a été payée »),
`.metricCard h2` (« Source de rééquilibrage », 133 px pour 121 disponibles),
et le bloc titre de `CardHeader`.

**Correction** : `overflow-wrap: break-word`. Les nombres ne contiennent pas
d'espace — le navigateur ne les coupe pas, et `tabular-nums` suffit à les garder
alignés.

### 6. Des cartes étirées à la hauteur de leur voisine

`.metricsRow` avait `align-items: stretch` et `.rightStack`
`grid-auto-rows: minmax(0, 1fr)` : toutes les cartes prenaient la hauteur de la
plus grande. Mesuré à 768 px : **167×268 px pour 15 caractères**.

**Correction** : `align-items: start` et `grid-auto-rows: auto`. Chaque carte
finit où finit son contenu ; elles restent alignées par le haut, ce que l'œil
suit.

### 7. Un corps de panneau qui absorbe la hauteur

`.heroBody` avait `flex: 1 1 auto` : il prenait toute la hauteur du panneau même
sans contenu pour la remplir. **Correction** : `flex: 0 1 auto`.

## Comparaison structurelle

| | Avant | Après |
|---|---|---|
| **Colonnes** | décidées par le viewport (`lg:`, `sm:`) même dans une colonne de 250 px | décidées par le conteneur (`@container`) |
| **Hauteurs** | figées (132 px, 304 px, `height: 100%`) | naturelles (`auto`) |
| **Espaces vides** | cartes étirées à la voisine — 167×268 px pour 15 caractères | chaque carte finit à son contenu |
| **Barres de défilement** | jusqu'à 3 imbriquées par page | **1 seule, celle du document** |
| **Troncatures** | jusqu'à 39 par écran | **0** |
| **Lisibilité** | libellés verticalisés (ratio jusqu'à 48) | ratio ≤ 1,1 partout |
| **Densité** | contenu masqué sous `overflow: hidden` | tout le contenu atteignable |
| **Nombre de panneaux** | inchangé | **inchangé** — aucun panneau ajouté pour masquer un défaut |

## Véracité — rien n'a changé de sens

Aucune donnée, aucun statut, aucun motif backend n'est modifié. Les corrections
sont exclusivement structurelles : grilles, hauteurs, retours à la ligne.

- `unavailable` reste `unavailable` (« UNAVAILABLE », « Indisponible »)
- `STALLED` reste `STALLED`
- aucune absence convertie en zéro, aucune série vide fabriquée
- aucun libellé abrégé pour tenir dans une colonne — les faire passer à la ligne
  dit la même chose sans rien perdre

Les 281 tests Vitest, dont les tests de véracité (`veracity-p0`,
`truthful-rendering`), restent verts.

## Ce que le test verrouille

`e2e/layout-recovery.spec.ts` mesure les deux routes aux six viewports et
échoue si l'un des défauts revient : débordement global, texte verticalisé
(ratio > 3 sur un libellé court), contenu tronqué, panneau vide anormal,
défilement vertical imbriqué, erreur console, réponse 5xx.

**Inventaire des conteneurs scrollables autorisés :**
- **verticaux : aucun.** Le défilement vertical appartient au document.
- **horizontaux :** le conteneur de table de Catalyst, pour un tableau plus
  large que sa colonne.

## Limites

1. **Aucun test de lecteur d'écran** (VoiceOver, NVDA). Les garanties sont
   structurelles et lisibles dans le DOM.
2. **Pas de comparaison pixel à pixel** : la preuve est la mesure DOM.
3. **Deux routes seulement.** Les corrections de `console.module.css`,
   `AdminGrid` et `AdminTable` sont partagées : les 22 autres routes en
   bénéficient, mais ne sont pas mesurées ici. Les 19 tests e2e existants les
   couvrent fonctionnellement.
4. **Un seul thème** (console sombre par construction).
5. Le contenu dépend du backend au moment de la capture : le compteur d'erreurs
   de l'indexeur évolue entre deux exécutions.
