# Design System Hearst Connect — notes de convergence (vérifiées)

> Ces notes documentent l'état RÉEL et VÉRIFIÉ du design system tel qu'il est
> encodé dans le dépôt, en appui de la passe de convergence
> (HC-DESIGN-SYSTEM-CONVERGENCE-001). La source normative des tokens est
> `src/styles/tailwind.css` (`@theme`). Le document
> `HEARST-CONNECT-V1-DESIGN-SYSTEM-DOCTRINE.md` n'étant pas présent dans le
> dépôt, ces notes s'appuient uniquement sur ce qui est prouvable dans le code.

## Accent — un seul vert

**`#a7fb90` (Hearst mint)** est l'unique accent. Rampe monotone
`--color-accent-50 … --color-accent-950` (hue ≈ 107°, luminances WCAG
documentées dans `tailwind.css`). Dans la console, `.cockpit-theme` place la
marque à `accent-400` ; le global la place à `accent-300` — même hex `#a7fb90`.

Gate : `pnpm check:ds` interdit tout hex brut hors `var(--token, #fallback)`
dans routes/modules (empêche la réintroduction d'un second vert ou d'une couleur
littérale). Prouvé par `--selftest`.

## États sémantiques — distincts de l'accent

`--color-success-*`, `--color-warning-*`, `--color-danger-*`, `--color-info-*`.
La couleur ne porte JAMAIS seule un statut : chaque état porte aussi un libellé
(« Live », « Unavailable », « Reference », « Partial »…) et/ou un marqueur de
forme (pastille pleine vs creuse), cf. le badge de fraîcheur (VER-09).

## Surfaces — 5 plans neutres (dark)

`--color-console-app` (#101010, fond application) < `--color-console-shell`
(#232323) < `--color-console-card` (#2a2a2a) < `--color-console-card-top`
(#303030) ; `--color-console-inset` (#202020) pour l'enfoncé. Séparateurs :
blanc à faible alpha (`--color-console-line-*`). Les cartes sont PLUS CLAIRES
que le shell (le contenu flotte au-dessus, il n'est pas découpé dedans).

## Contrat de thème — DEUX niveaux (vérifié en conditions réelles)

- **Surfaces publiques** (vitrine marketing, écran de connexion) :
  **clair / sombre complet**. `ThemeToggle` rendu (site-header, auth layout),
  persistance `localStorage`, script anti-flash avant peinture, repli
  `prefers-color-scheme`. Les deux thèmes sont réellement stylés (paires
  `dark:` de Catalyst + tokens).
- **Console d'administration** (green command center) : **sombre uniquement,
  par construction**. Le shell force `.dark` (`green-command-center-shell.tsx`)
  parce que le système neutre-graphite + mint est calibré pour le fond sombre
  (un `#a7fb90` sur fond clair perd son rôle d'accent, et la rampe de surfaces
  n'a pas d'équivalent clair calibré). **Aucun faux contrat clair** n'est
  exposé dans la console : `ThemeToggle` n'y est délibérément pas rendu, donc
  l'utilisateur ne se voit jamais proposer un thème que la console n'honore pas.

Décision UI-16 : contrat **dark-only pour la console, dual pour le public** —
c'est l'état honnête déjà en place ; il est ici documenté, pas modifié.

## Typographie

Satoshi Variable uniquement (auto-hébergée, `src/lib/fonts.ts`).
`font-sans` = `font-display` = `font-mono` = `--font-satoshi`.

## Motion

`prefers-reduced-motion` respecté (cf. `tailwind.css` `@media` et le module CSS
de la console). Les animations d'entrée sont décoratives et désactivables.

## Charts — conformité à la doctrine §7 (vérifiée)

- **Moteur unique** : Recharts (chart.js/react-chartjs-2 retirés au Lot 7).
- **Aucun chart dans une route** (`src/app/` : 0 import recharts).
- **Conteneur d'états partagé** : `ChartFrame` / `EtatSerie` (tracee, vide,
  attendue, indisponible) — couvre loading/empty/error/unavailable (§7.3).
- **Tokens `--chart-*`** ajoutés (§7.5) : `--chart-1..5` (séries), `--chart-
  positive/negative/warning/neutral` (statuts, grammaire distincte), grid/axis/
  tooltip. `chart-theme.ts` : 0 hex. Vérifié : `--chart-1` résout `#88ef6c`.
- **Formatters centralisés** : `src/lib/format.ts` (nombre, %, devise, date,
  compact, adresse, hash) + `mouvements.ts` (libellés métier).
- **Anti-fabrication** : `plottableAsChart` (≥ 2 points) empêche une courbe
  depuis un scalaire ; une donnée absente rend un état nommé, pas une série vide.
- **Écart restant** : l'arborescence `src/components/charts/{core,cartesian,
  polar}` de §7.2 (renommage/déplacement de 6 charts fonctionnels) — reporté
  pour ne pas casser l'existant sans contrat de container arbitré.

## Langue produit — français (doctrine §1) : mission dédiée requise

La doctrine fixe le **français** comme langue produit. La console est
actuellement en **anglais** (migration EN délibérée HC-UI-NORMALIZATION-001,
gardée par `tests/language-regression.test.ts` qui INTERDIT le français).

La traduction est une **mission coordonnée**, pas une retouche : elle exige, en
lockstep, (1) le vocabulaire de statut, (2) la nav + « Sign out », (3) le corps
des 19 pages, (4) l'INVERSION de `language-regression.test.ts` (il faut qu'il
impose le FR au lieu de l'interdire), (5) la mise à jour de `source-
availability.test.tsx` et des assertions e2e (`veracity.spec.ts`) qui matchent
les libellés anglais. Une traduction PARTIELLE laisse une console FR/EN mixte —
non conforme à « cohérent » (§10). Elle n'est donc pas amorcée ici (un essai a
été fait puis annulé pour préserver la cohérence).

**Glossaire d'ancrage** (à valider avant la mission FR — dérivé du FR déjà
présent dans la vitrine et `mouvements.ts`, à compléter) :

| EN (actuel) | FR (proposé) |
|---|---|
| Live / Reference / Unavailable / Stale | En direct / Référence / Indisponible / Obsolète |
| Sign out | Se déconnecter |
| Home / Clients / Compliance / Operations / Runtime | Accueil / Clients / Conformité / Opérations / Exécution |
| Data coverage | Couverture des données |
| Vault / Estate | Coffre / Patrimoine |
| Active vaults / Recent movements | Coffres actifs / Mouvements récents |
| Deployed / Available capital | Capital déployé / Capital disponible |

## Compositions & structure de dossiers (doctrine §2, §7.2)

- **Compositions de fait déjà présentes** : le Green Command Center fournit
  `Panel`, `Reading`, `GreenMetricStrip` (KPI row), `ChartFrame` (Chart panel),
  `Absent` (Empty/Unavailable state) — les contrats de §2 existent sous d'autres
  noms.
- **Sortie de `design-lab/` et `src/components/compositions/`** : renommage de
  dossiers à fort risque de casse d'imports (le shell green est importé par
  toutes les routes admin). À faire dans la mission FR/compositions, avec
  re-vérification e2e complète — pas en fin de passe.
