# HC-UI-CONVERGENCE-001 — Revue visuelle

| | |
|---|---|
| **Branche** | `refactor/ui-convergence-2026-08-04` |
| **SHA de départ** | `b45e132` |
| **Backend** | réel (`HEARST_API_URL`) — aucune donnée fabriquée |
| **Authentification** | quick-login de développement ; le mot de passe propriétaire n'est jamais saisi dans un navigateur automatisé |
| **Thème** | sombre — la console est sombre par construction (cf. `DESIGN-SYSTEM-NOTES.md`) |
| **Captures** | 15, produites par `e2e/capture.spec.ts` |
| **Erreurs console** | **0** sur les 15 surfaces |
| **Requêtes en échec** | **0** |

## Ce que cette revue prouve, et ce qu'elle ne prouve pas

Le harnais ne se contente pas de photographier : il **échoue** si une page
produit une erreur de console ou une requête en échec. Une capture d'une page
qui a hurlé pendant qu'on la prenait ne prouverait rien.

En revanche, une capture ne prouve pas l'accessibilité au lecteur d'écran.
Aucun test VoiceOver ou NVDA n'a été exécuté ; ce qui est vérifié ici est
structurel (niveaux de titre, régions nommées) et se lit dans le DOM, pas au
casque. Voir « Limites ».

## Contrat de la convergence : le rendu ne change pas

C'est le point central. Une quarantaine de déclarations locales disparaissent,
mais **l'écran doit rester identique**. Le risque réel était la sémantique de
`className` sur l'ancienne `Card` : elle *remplaçait* la matière dans 9 routes
(`className === '' ? gcc.wavePanel : className`) et la *composait* dans
`operations` (`clsx(gcc.heroChart, className)`). Traduire naïvement aurait
superposé `wavePanel` à des classes qui l'excluaient — donc changé toutes les
surfaces. D'où le `tone` explicite, et `tone="plain"` partout où la classe
portait déjà la matière.

Vérifié surface par surface sur les captures : même hiérarchie, **même nombre
de panneaux et de bordures**, mêmes gouttières. Aucun cadre supplémentaire, ce
que la mission demandait explicitement de surveiller.

## Véracité des données — vérifiée à l'écran

Les captures montrent l'état **réel** du backend au moment de la prise, avec
ses absences :

- `/admin` : « Coffres actifs — Indisponible », « Valeur du patrimoine —
  Indisponible », à côté de « Mouvements récents 12 · En direct » et
  « Sources en direct 1 / 6 · Référence ». Une absence porte un mot, une mesure
  porte un chiffre, et les deux ne se ressemblent pas.
- `/admin/clients` et `/admin/conformite` : sources non exposées par le
  backend, rendues comme telles.
- `/admin/btc` : « BTC produit — », « Réserve — », « Exposition — » à côté de
  « Rapports mensuels 1 » et « Lignes d'événement 13 ».

**Aucun faux zéro sur aucune capture.** C'est la garantie centrale du produit,
et elle est portée par la composition elle-même : `MetricCard` délègue à
`Reading`, seul chemin par lequel une `Availability` indisponible devient un
état nommé. Un test le verrouille (`tests/compositions.test.tsx`), et la preuve
que ce test mord a été faite en repliant délibérément l'absence sur `0` — le
test échoue alors.

## Responsive

| Viewport | Capture | Constat |
|---|---|---|
| 1440×900 | 12 surfaces | Rail fixe à gauche, grille de KPI sur 5 colonnes + carte de décision. |
| 1280×800 | `admin-laptop.png` | Même structure, colonnes resserrées. Aucun chevauchement. |
| 375×812 | `admin-mobile.png`, `navigation-mobile-open.png` | Le rail passe en **barre horizontale** en haut ; les entrées de navigation restent toutes atteignables ; **« Se déconnecter » reste visible et tactile** (c'était le défaut UI-02, corrigé au Lot 6 — la convergence ne l'a pas réintroduit) ; les KPI s'empilent en grille de 2. |

## Accessibilité — ce qui est structurellement garanti

Ce que les compositions imposent, et que les copies locales n'imposaient pas
toutes :

- **`KpiRow` exige un `aria-label`.** Une rangée de chiffres sans nom ne dit
  rien à qui navigue par régions ; les routes l'oubliaient une fois sur deux.
  C'est maintenant un paramètre obligatoire, donc une omission ne compile pas.
- **Les niveaux de titre sont choisis, pas subis.** `PanelHeader` et
  `MetricCard` acceptent `as` ; le `h1` de la page reste celui du shell
  (`sr-only`, délibéré et documenté), et les cartes se placent dessous sans
  sauter de niveau.
- **`PanelHeader` ne rend plus de `<p>` vide** : le `hint` est devenu
  facultatif, alors que les copies locales l'exigeaient et poussaient les
  appelants à passer une chaîne vide.
- Les primitives interactives (champs, boutons, tables, badges) restent celles
  de Catalyst : la convergence n'a réimplémenté aucun de leurs comportements.

## Motion

**Aucune animation n'a été ajoutée par cette mission.** Rien ne le justifiait :
la mission autorise quelques animations, elle ne les demande pas, et en ajouter
pour utiliser une bibliothèque serait exactement ce que la doctrine proscrit.
`prefers-reduced-motion` reste respecté par le module CSS de la console, tel
quel. Aucun token Motion+ n'est stocké ni affiché.

## Comparaison avant / après

La comparaison a été faite sur les mêmes routes, même backend, même viewport, à
`b45e132` puis après convergence. Différences constatées :

| | Avant | Après |
|---|---|---|
| Hiérarchie visuelle | — | identique |
| Nombre de panneaux / bordures | — | identique |
| Libellés et langue | français | français, inchangé |
| Absences nommées | oui | oui, inchangé |
| Erreurs console | 0 | **0** |
| Déclarations locales | ~40 | **0** |

## Limites

1. **Aucun test de lecteur d'écran.** Ni VoiceOver ni NVDA n'ont été exécutés.
   Les garanties d'accessibilité listées ci-dessus sont structurelles et
   lisibles dans le DOM ; elles ne remplacent pas un test au casque.
2. **Pas de comparaison pixel à pixel automatisée.** La comparaison est
   visuelle et structurelle. Un écart de quelques pixels sur une gouttière ne
   serait pas détecté par cette méthode.
3. **Un seul thème.** La console est sombre par construction ; la vitrine
   publique (claire/sombre) n'est pas dans le périmètre de cette mission et
   n'a pas été recapturée.
4. **État de données daté.** Les captures montrent le backend tel qu'il
   répondait au moment de la prise. Plusieurs surfaces affichent une absence
   parce que la source n'est pas exposée — c'est le comportement attendu, pas
   un défaut de rendu.
5. **Navigation clavier non tracée dans les captures.** L'ordre de tabulation
   et la restitution du focus n'ont pas fait l'objet d'une capture dédiée.
