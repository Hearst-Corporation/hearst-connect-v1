# Balayage des pages — HC-PAGES-SWEEP-2026-08-04

Branche `fix/pages-sweep-2026-08-04`, SHA final **`21ada75`**.
Base : `main` à `5d96b7c`, laissée intacte (local et distant).

## Méthode

Chaque route du produit est ouverte dans un vrai navigateur à quatre viewports, et
**mesurée dans le DOM rendu** — pas relue dans le code :

| Défaut cherché | Comment il est détecté |
| --- | --- |
| Texte verticalisé | rapport hauteur/largeur > 3 sur un nœud feuille |
| Troncature | `scrollWidth > clientWidth` hors conteneur défilant |
| Débordement horizontal | `documentElement.scrollWidth > clientWidth` |
| Défilement imbriqué | `overflow-y: auto\|scroll` avec `scrollHeight > clientHeight` |
| Panneau vide anormal | `<article>`/`<section>` > 80×220 px pour < 40 caractères |
| Anglais visible | liste FERMÉE de termes d'interface dans `innerText` |

Les codes techniques (`LIVE`, `UNAVAILABLE`, `GET`/`POST`, noms d'endpoints,
identifiants de coffre, `snake_case`) restent en anglais **par contrat** : les inclure
ferait crier la garde en permanence et elle finirait désactivée.

L'outil est versionné : [`e2e/all-routes-sweep.spec.ts`](../../../e2e/all-routes-sweep.spec.ts).
Il tourne désormais **assertions actives** — c'est une garde, plus une cartographie.

## Pourquoi la mesure et pas les tests

Les 289 tests unitaires étaient **verts** pendant que 9 mots anglais, 9 textes
verticalisés et 74 troncatures étaient à l'écran. Un test de rendu vérifie qu'un
composant produit les bonnes classes ; il ne peut pas voir qu'un panneau finit à
104 px de large. Les deux causes racines de ce lot étaient invisibles à la relecture :
le code disait `4/8/12` et Tailwind émettait bien les classes.

## Deux causes racines

### 1. Un conteneur de requête ne peut pas s'interroger lui-même — `AdminGrid`

`@container` et `grid-cols-*` vivaient sur le même nœud. Or un élément portant
`container-type: inline-size` **ne s'interroge pas lui-même** : `@[60rem]:` remontait
au conteneur le plus proche **au-dessus**, `.workspace`, large de 1200 px.

Toute grille imbriquée ouvrait donc ses 12 colonnes dès que le *workspace* dépassait
60rem, quelle que soit sa propre largeur. Mesuré sur `/admin/keeper` : une grille de
360 px ouvrait **12 pistes de 8 px**, et le panneau des notes d'endpoint se rendait sur
104 px de large pour 494 px de haut.

L'enveloppe déclare le conteneur, la grille l'interroge.
`display: contents` a été essayé puis **retiré** : sans boîte, il n'y a aucune largeur à
mesurer, et les deux grilles de `/admin/keeper` retombaient à 4 colonnes — y compris
celle de 846 px qui en demandait 12.

### 2. Des paliers qui mesurent le viewport au lieu du conteneur — `console.module.css`

Les replis de `.bottomRow` et `.rightStack` mesuraient le **viewport**, alors que la
place disponible est celle de `.workspace` — le viewport **moins le rail**. Les deux ne
varient pas ensemble, et l'écart ouvrait un trou entre 760 px et 1280 px.

À 768 px : rail 240, workspace 528. Le palier `max-width: 1280px` divisait `.bottomRow`
en 2×250, `.rightStack` redivisait en 2×125 — quatre divisions successives.
Le palier suivant, à 760 px, arrivait **huit pixels trop tard**.

Le bloc correctif est placé **en dernier** dans le fichier, volontairement : `@media` et
`@container` ont la même spécificité, et à égalité c'est l'ordre du fichier qui tranche.

Seuil de 50rem **relevé par mesure**, pas choisi : à 38rem le trou se déplaçait à 900 px
(panneau 138 px, ratio 2,63), à 46rem il restait à 1024 px (169 px, ratio 1,26).

| Viewport | Panneau avant | Ratio avant | Panneau après | Ratio après |
| ---: | ---: | ---: | ---: | ---: |
| 768 px | 105 px | 10,06 | 259 px | 0,81 |
| 900 px | 138 px | 2,63 | 391 px | 0,72 |
| 1024 px | 169 px | 1,26 | 515 px | 0,72 |

Inchangé à 375, 640, 1280 et 1440 px.

## Résultat mesuré

| Défaut | Premier relevé | Final |
| --- | ---: | ---: |
| Anglais visible | 9 | **0** |
| Textes verticalisés | 9 | **0** |
| Troncatures | 74 | **0** |
| Débordements horizontaux | 1 | **0** |
| Défilements verticaux imbriqués | 0 | **0** |
| Panneaux vides anormaux | 0 | **0** |
| Erreurs console | 0 | **0** |
| Réponses 5xx | 0 | **0** |

Sur les 74 troncatures du premier relevé, **une partie était de faux positifs** — la
sonde les écarte désormais, après relevé manuel :

- `sr-only` — `clientWidth` de 1 px par construction. Le contenu n'est pas perdu : il
  est destiné aux lecteurs d'écran.
- `text-overflow: ellipsis` — l'abréviation d'une adresse de coffre est un choix de
  design, et la valeur entière reste dans `title`.

Les signaler revenait à demander la correction de décisions délibérées.

## Preuves

- `final/` — **92 captures** : 23 routes visibles × 4 viewports (1440×900, 1280×800,
  768×1024, 375×812).
- `final/measurements.json` — relevé DOM complet.

Le build déclare 24 entrées. Deux ne sont pas des pages de produit : `/icon.svg` (un
actif) et `/_not-found`, capturée séparément et vérifiée saine (HTTP 404, en français,
ratio 0,29, aucun débordement aux quatre viewports).

## Ce qui n'a pas été corrigé, et pourquoi

**Locale financière `en-US`.** Cinq fichiers formatent les montants en `en-US`. Le
changement en `fr-FR` a été tenté puis **annulé** : sept tests échouent, dont
`language-regression.test.ts`, qui interdit `fr-FR` avec une justification écrite. Le
format d'affichage d'un montant financier est un arbitrage produit, pas une correction
technique — **décision à rendre**, hors périmètre de ce lot.

## Limite de cette revue

Les indicateurs ci-dessus sont à zéro et les 20 tests e2e passent. Cela ne vaut pas
validation visuelle : une mesure automatique ne juge ni une hiérarchie, ni un rythme, ni
la justesse d'une composition. **Une relecture humaine des 92 captures reste requise.**
