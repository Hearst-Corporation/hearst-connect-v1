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

## Ce qui reste conditionné à la doctrine markdown

- **Langue FR** : la console est en anglais (migration EN délibérée, gardée par
  un test). Le glossaire FR canonique (Vault→? Estate→?) doit venir de la
  doctrine avant traduction — non deviné.
- **Compositions canoniques** (PageShell, KpiRow, ChartPanel…) : contrats à
  arbitrer par la doctrine ; les blocs existants (green command center) tiennent
  déjà lieu de compositions de fait.
- **Structure `src/components/compositions/` et sortie du Green Command Center de
  `design-lab/`** : déplacement de dossiers à cadrer par la doctrine (risque de
  casse d'imports élevé pour un gain d'organisation — à faire une fois le
  contrat cible fixé).
