# HC-UI-OPS-LAYOUT-001 — Panneau de fraîcheur de l'indexeur

| | |
|---|---|
| **Route** | `/admin/operations` |
| **Composant** | `SectionIndexation` — panneau « Fraîcheur de l'indexeur » |
| **SHA avant** | `f457a0a` |
| **Branche** | `fix/ui-operations-layout-2026-08-04` |
| **Backend** | réel — indexeur `STALLED`, dernière synchronisation « il y a 5 j » |

## La cause

Le panneau vit dans l'`aside` de la page (`.rightStack`), large de **250 à
290 px**. Il composait ses tuiles avec `AdminMetricGrid count={4}`, qui applique
`grid-cols-2 lg:grid-cols-4`.

`lg:` est un point de rupture **de viewport**. Sur un écran de 1440 px, la
grille passait donc à 4 colonnes *à l'intérieur d'une boîte de 270 px* : chaque
colonne recevait environ 55 px, moins les paddings. Les libellés — rendus en
majuscules avec un interlettrage de 0,08em — ne pouvaient plus tenir sur une
ligne, et le navigateur les a cassés caractère par caractère.

Ce n'était pas une règle CSS exotique : ni `writing-mode`, ni `break-all`. Juste
un texte à qui on donnait 13 px de large.

## La mesure, avant et après

Le marqueur décisif est le **rapport hauteur / largeur**. Un texte d'une ligne a
un ratio bien inférieur à 1 ; verticalisé, il explose.

| Viewport | Ratio avant | Ratio après | Déborde avant | Déborde après |
|---|---|---|---|---|
| 1440×900 | **29,54** | 1,07 | oui | **non** |
| 1280×800 | **48,0** | 1,07 | oui | **non** |
| 768×1024 | 1,50 | 1,07 | non | non |
| 375×812 | **11,08** | 1,07 | oui | **non** |

Exemple mesuré à 1280 px avant correction : « toutes les 15 s » rendu sur
**8 px de large pour 384 px de haut**.

Après : **0 texte verticalisé, 0 texte tronqué, 0 débordement** aux quatre
viewports. Vérifié aussi à **zoom 200 %** (viewport logique 720×450 @2x) :
mêmes résultats.

## La correction

Trois ajustements sur le seul `SectionIndexation`, aucun autre fichier :

1. **`AdminMetricGrid count={4}` → grille locale en container query.**
   `@container` + `@[24rem]:grid-cols-2` : le nombre de colonnes découle de la
   largeur *du conteneur*, pas de l'écran. C'est la bonne unité de mesure pour
   un composant qui vit dans un aside de largeur variable.

2. **`wrap-break-word` sur la grille.** Nécessaire pour un seul cas, mesuré :
   sous 768 px, `.rightStack` passe à deux colonnes et le panneau tombe à
   178 px ; moins les paddings du panneau (40 px) et de la tuile (32 px), il
   reste 104 px alors que « SYNCHRONISATION » en demande 116. À ne pas confondre
   avec `break-all`, proscrit : `break-word` ne coupe un mot **que** s'il ne peut
   tenir autrement.

3. **Import `AdminMetricGrid` retiré** de la page, devenu inutile.

### Une tentative écartée

`auto-fit` + `minmax(min(100%, 11rem), 1fr)` a été essayé d'abord et **ne
suffisait pas** : le plancher se compare au conteneur de la grille, pas à la
colonne obtenue. À 178 px de large, deux pistes de ~72 px survivaient et les
libellés débordaient encore de 7 à 12 px. C'est la mesure qui a tranché, pas
l'intuition.

`AdminMetricGrid` n'est pas modifié : il reste correct dans les 5 autres pages
qui l'utilisent, où le conteneur est large.

## Véracité — rien n'a changé de sens

Aucune logique de fraîcheur, d'horodatage, de statut d'indexeur ou de temps
relatif n'est touchée. Les quatre mesures gardent leurs libellés **entiers** —
aucun n'est abrégé pour tenir dans une colonne étroite, ce qui aurait été une
régression de sens déguisée en correction de mise en page.

Un test le verrouille : il vérifie que les quatre libellés sont présents in
extenso et que les accesseurs backend sont inchangés (`indexer?.lastSyncedAt`,
`planificateur?.lastIndexedBlock`, `intervalMs`, `consecutiveErrors` via
`formatCount`, qui rend « — » et jamais un zéro fabriqué).

## Accessibilité

- **Ordre de lecture DOM** inchangé : l'état de l'indexeur, puis les quatre
  mesures dans leur ordre d'origine.
- **Aucune information portée par la seule couleur** : l'état s'écrit
  (« Indexeur : STALLED ») en plus de sa pastille.
- **Zoom 200 %** vérifié, mesuré : pas de troncature.
- **Contraste** inchangé — aucun token, aucune couleur modifiée.
- **Pas de contrôle interactif** dans ce panneau : rien à tester au clavier.

**Non testé** : aucun lecteur d'écran (VoiceOver, NVDA) n'a été exécuté. Les
garanties ci-dessus sont structurelles et lisibles dans le DOM.

## Ce qui reste ouvert sur cette page

Deux défauts de mise en page **distincts et préexistants**, visibles sur les
captures `before-*` comme `after-*`, hors du périmètre de cette mission :

1. **`RepartitionParType`** — « Quels types composent le journal ? » est
   verticalisé dans la colonne étroite du bas de page. Même cause structurelle
   (un `ChartFrame` dans une colonne trop étroite), composant différent.
2. **`SyntheseDerive`** — le bandeau sous « Rééquilibrage » est tronqué en
   hauteur : sa grille `lg:grid-cols-[17rem_minmax(0,1fr)]` déborde de son
   panneau.

Ils méritent la même approche — reproduire, mesurer, corriger — dans une
mission dédiée.

## Limites

1. Aucun test de lecteur d'écran.
2. Pas de comparaison pixel à pixel automatisée : la preuve est la **mesure DOM**
   (boîtes, `scrollWidth`/`clientWidth`, ratio), pas la superposition d'images.
3. Un seul thème (la console est sombre par construction).
4. Le contenu du panneau dépend du backend au moment de la capture : le compteur
   d'erreurs consécutives évolue entre deux exécutions, ce qui est normal.
