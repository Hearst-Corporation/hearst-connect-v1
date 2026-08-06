# HC-ADMIN-DASHBOARD-UI-ASSETS-005 — Preuve d'inspection UI

> Audit du kit Tailwind Plus (Application UI v4) + étude boutons Aceternity, filtré par les besoins réels du cockpit admin Hearst Connect.
> Décisions verrouillées par la doctrine repo (priment sur le brief) : Catalyst = seule primitive interactive · Recharts = seule couche dataviz (pas de MUI X) · overlays = Catalyst + Headless UI · données véridiques (aucun zéro-fill, aucune série inventée, action sans endpoint = `disabled` + tooltip) · data réelle = `buildFunnel` (6 étapes `count`/`pending`/`sourceNote`) et `buildPriorityQueue` (file classée par sévérité).

## Matrice besoin → composant → adaptation

| Besoin dashboard | Composant du kit | Verdict | Adaptation prévue |
|---|---|---|---|
| Shell cockpit (nav desktop + drawer mobile) | application-shells/sidebar · 01-simple-sidebar | RÉFÉRENCE | Déjà couvert par Catalyst `SidebarLayout`/`Sidebar` via `application-layout` + `body-nav`. Emprunter seulement le groupement de sections si la nav grandit ; jamais le markup brut ni le `<dialog>`. |
| Top bar (search + notif + profil) | sidebar · 03-sidebar-with-header | RÉFÉRENCE | Composer via Catalyst `Navbar`+`Input`+`Dropdown` ; cloche = `Button plain` + Heroicon ; badge notif véridique (point seulement sur signal non-lu réel, sinon rien). |
| Cap largeur ultrawide | sidebar · 05-constrained | RÉFÉRENCE | `mx-auto max-w-7xl` posé dans le wrapper de layout existant ; pure règle de gabarit, aucun composant. |
| Header de page (titre + actions) | headings/page-headings · 01-with-actions | RETENU | `md:flex justify-between` + troncature ; les 2 `<button>` → Catalyst `Button` (outline / accent) ; titre `text-zinc-950 dark:text-white`. |
| Header titre + search + action, une ligne | headings · 12-with-filters-and-action | RETENU | `flex flex-wrap items-center gap-6` + `ml-auto` ; les liens filtres → Catalyst `Input` (search `MagnifyingGlassIcon`) ; action `<a>` → `Button color="accent"` (`PlusIcon`). |
| Header contextuel (chips entité) | headings · 05-with-meta-and-actions | RÉFÉRENCE | Reprendre seulement la meta-row `flex flex-wrap` ; chaque valeur véridique (`—` si absente, jamais un `$120k` factice) ; pas de `el-dropdown`. |
| Layout bento cockpit (KPI + sections empilées) | page-examples/home-screens · 02-stacked | RETENU | Adopter la grille stats `grid-cols-1 sm:2 lg:4` (dividers `border-t`/`sm:border-l`) + bento `lg:grid-cols-3` ; chrome interactif → Catalyst ; blob gradient et images externes supprimés. |
| Rangée 4 KPI avec delta | data-display/stats · 01-with-trending | RETENU | Grille `gap-px` verbatim ; delta `<dd>` rendu **uniquement** si un prior réel existe (jamais `+0%`) ; valeur via `formatCount`, absente → `—`. |
| Rangée 4 KPI sans delta | stats · 02-simple | RETENU | Variante sans delta du même composant (branch sur présence data, markup partagé avec 01). |
| KPI comparatif (pill delta + baseline) | stats · 05-with-shared-borders | RÉFÉRENCE | Idée pill-delta + baseline `from N` seulement si période comparée mesurée ; sinon ne rien rendre. |
| KPI iconifié + drill-down | stats · 04-with-brand-icon | RÉFÉRENCE | Icon-chip Heroicons + lien `TextLink` Catalyst ; positionnement absolu allégé ; trend/footer omis sans route/delta réel. |
| Journey 6 étapes (nom + statut) | navigation/progress-bars · 04-panels-with-border | RETENU | Structure `li`/badge 3 états + `aria-current="step"` + `CheckIcon` ; **4e état** bloqué/rejeté KYC = `status-danger` + `XMarkIcon` ; nodes = `Link` nav, pas `Button` ; état piloté par `buildFunnel`. |
| Journey vertical (panneau étroit) | progress-bars · 07-circles-with-text | RETENU | Ligne connectrice + node 3 états ; descriptions = copie backend réelle ou omises ; step sans statut → `—`. |
| Journey condensé (header) | progress-bars · 02-panels | RÉFÉRENCE | Badge numéroté 3 états, réservé à un contexte 3–4 étapes (les séparateurs flèche saturent à 6). |
| Barres colorées + labels | progress-bars · 01-simple | RÉFÉRENCE | Idée accent-border + couleur de label par état ; sans icônes ; étapes non atteintes = `zinc` neutre. |
| Nodes compacts connectés | progress-bars · 05-circles | RÉFÉRENCE | Logique connecteur + node uniquement, sous 04/02 ; garder labels visibles ou caption « Étape N sur 6 ». |
| Panneau « À traiter » (item = well) | forms/action-panels · 08-with-well | RETENU | Carte + inner-well `sm:flex justify-between` ; champs Client/Problème/Montant/Ancienneté en `dt`/`dd`, Montant `tabular-nums` ; CTA = `Button color="accent"`, edit = `Button plain` ; file vide → empty honnête « Rien à traiter ». |
| Header/action du panneau | action-panels · 03/04-with-button | RETENU | Layout `sm:flex items-start justify-between` titre-gauche / action-droite ; `<button>` indigo → `Button color="accent"`. |
| Empty-state du panneau | action-panels · 01-simple | RÉFÉRENCE | Rythme `titre → texte → mt-5 action` comme conteneur empty (« Rien à traiter » + refresh optionnel). |
| Alerte inline (backend UNAVAILABLE / bloqué) | feedback/alerts · 01-with-description | RETENU | Skeleton `flex shrink-0 ml-3` verbatim ; couleurs → `status-*` via `var(--token,#repli)` ; icône → Heroicon ; liée à l'état backend, sinon rien. |
| Alerte avec CTA | alerts · 03-with-actions | RETENU | Shell + action-row ; `<button>` bruts → Catalyst `Button` ; cible = route réelle, sinon action omise (pas de CTA mort). |
| Alerte énumérant plusieurs blocages | alerts · 02-with-list | RÉFÉRENCE | `list-disc` dans l'alerte ; compteur du titre via `formatCount` (jamais codé en dur) ; source absente → `—`. |
| Chips résumé (urgences / aujourd'hui / bloqués) | alerts · 05-with-accent-border | RÉFÉRENCE | `border-l-4` comme repère de statut (danger/warning/accent) ; le chiffre du chip vient d'un stat/badge, pas des alerts ; `125K` via `formatCount`, `—` si absent. |
| Alerte dismissible | alerts · 06-with-dismiss-button | RETENU | Placement `ml-auto` + label `sr-only` ; `XMarkIcon` dans `Button plain` ; dismiss = état client, ne persiste/fabrique rien. |
| Flux « À traiter » compact (icône + label + time) | lists/feeds · 01-simple-with-icons | RETENU | Badge + connecteur + `<time>` ; couleurs → `status-*`/`zinc-*`, SVG → Heroicons ; `<time>` = timestamp backend réel ; liste vide → empty honnête. |
| Empty-state honnête « À traiter » | feedback/empty-states · 01-simple | RETENU | Pictogramme + titre + subline ; Heroicon (`InboxIcon`/`CheckCircle`) ; subline = prochain contrôle réel, jamais un compteur fabriqué. |
| Détail stepper en panneaux | empty-states · 03-with-starting-points | RETENU | Rangée icône-tile + titre + subline comme étape ; tuile colorée aléatoire → un `status-*` unique piloté par l'état réel de l'étape. |
| Détail stepper (variante liste) | empty-states · 05-with-templates | RÉFÉRENCE | `divide-y` mono-colonne + slot d'icône de fin = marqueur de statut (pas un chevron de nav). |
| Liste tâches compacte (badge + meta + actions) | lists/stacked-lists · 06-with-badges-button-and-actions-menu | RETENU | `li` 2 colonnes badge+meta+dot-sep ; `View` → `Button plain`, kebab → Catalyst `Dropdown` + `EllipsisVerticalIcon` ; badge → `Badge` keyé `status-*` ; sans tâche → empty honnête. |
| Statut live (point) sur une rangée | stacked-lists · 05-with-inline-links-and-actions-menu | RÉFÉRENCE | Construct point (ring + dot) piloté par `status-*`, rendu seulement pour un état réellement rapporté ; `Last seen` via formateur ou ligne omise. |
| Groupement par bucket (Aujourd'hui / Semaine / Plus tard) | stacked-lists · 12-narrow-with-sticky-headings | RÉFÉRENCE | Header sticky réutilisé sur des buckets date/statut calculés ; groupe rendu seulement s'il a des items. |
| Table « Dernières souscriptions » | lists/tables · 01-simple / 03-simple-in-card | RÉFÉRENCE | Le repo a déjà Catalyst `Table` ; poser dans le panel/Card existant ; thead `bg-zinc-50` via token ; vide → une ligne honnête « — Aucune souscription ». |
| Colonne identité souscripteur + badge | tables · 09-with-avatars-and-multiline-content | RETENU | `flex` avatar + 2 lignes dans `TableCell` ; `<img>` unsplash → Catalyst `Avatar` (initiales) ; pill → `Badge color` `status-*` ; nom/email absent → `—`. |
| Tri de colonnes (Date / Montant) | tables · 13-with-sortable-headings | RÉFÉRENCE | Affordance seule : vrai bouton de tri + `ChevronUp/DownIcon` ; câblé à un état de tri réel, sinon contrôle omis. |
| Ligne total (total collecté) | tables · 15-with-summary-rows | RÉFÉRENCE | Pattern `hidden sm:table-cell` verbatim ; total calculé sur la même source véridique, absent → `—`, jamais une somme-de-rien. |
| Drawer détail (base) | overlays/drawers · 02-with-background-overlay | RETENU | **Remplacer `el-dialog`/`@tailwindplus/elements` par Headless UI `Dialog`+`DialogBackdrop`+`DialogPanel`** piloté par `useState(open)` ; garder les classes `data-[closed]:translate-x-full` / `duration-500` ; backdrop + panel via tokens. |
| Drawer body métadonnées | drawers · 09-file-details-example | RETENU | `<dl>` `divide-y` + rows `flex justify-between py-3` ; chaque `<dd>` véridique → `—` si absent (les `3.9 MB`/`June 8, 2020` du kit sont inventés) ; images supprimées ; boutons → Catalyst. |
| Drawer footer collant (action pinnée) | drawers · 05-with-sticky-footer | RETENU | Skeleton `flex h-full flex-col` + body `overflow-y-auto` + footer `shrink-0` verbatim ; Cancel/Save → `Button plain` + `Button`, `onClose`/submit contrôlés (pas `command=`). |
| Palette ⌘K (base) | navigation/command-palettes · 01-simple | RETENU | **Rebâtir sur Catalyst `Dialog` + Headless UI `Combobox`, sans le runtime `@tailwindplus/elements`** ; input = Catalyst `Input` + `MagnifyingGlassIcon` ; no-results = empty honnête « Aucun résultat » ; filtrage client sur data déjà chargée. |
| Palette iconifiée + état idle | command-palettes · 05-with-icons | RETENU | Panneau `defaults` conservé mais « Recherches récentes » alimenté par l'état de nav local réel, sinon hint statique seul ; icônes Heroicons par type d'entité ; kbd = raccourcis réels. |
| Palette groupée par entité (Vaults / Membres / Souscriptions) | command-palettes · 08-with-groups | RETENU | Header de groupe + `aria-labelledby` ; groupe rendu **seulement** s'il a des matches réels (jamais un groupe à zéro) ; filtrage client. |
| Toast feedback (succès/erreur) | overlays/notifications · 01-simple | RETENU | Live-region `aria-live` + card ; icône → Heroicon `status-*` ; close → `Button plain` ; pas de ligne description si aucune n'est passée. |
| Toast compact (action unique + undo) | notifications · 02-condensed | RETENU | Variante par défaut Hearst ; `Undo` → `Button plain` accent ; close → icon `Button`. |
| Hiérarchie boutons (primaire) | elements/buttons · 01-primary-buttons | RETENU | `Button color="accent"` ; reprendre **seulement** l'échelle taille/padding + `focus-visible:outline-2/offset-2` ; `font-semibold text-sm` par défaut. |
| Hiérarchie boutons (secondaire) | buttons · 02-secondary-buttons | RETENU | `Button outline`/`plain` ; traitement ring → tokens `zinc-*` ; même échelle de taille que le primaire. |
| Bouton icône + label | buttons · 06-with-leading-icon | RETENU | Heroicon en enfant de `Button` (Catalyst applique `data-slot=icon`) ; garder la spec `gap-x-1.5`/`-ml-0.5 size-5` comme référence d'alignement. |
| Bouton icône seul | buttons · 10-circular-buttons | RETENU | `Button plain` icon + Heroicon ; `aria-label` requis ; radius `rounded-md` (Catalyst) plutôt que pill. |
| Segmented period switcher (Jour/Mois/Année) | elements/button-groups · 01-basic | RETENU | Join `isolate inline-flex`/`-ml-px`/`focus:z-10` ; **combler le manque du kit : état sélectionné** = fond `accent-*` + `aria-pressed`, non-sélectionné `zinc-*`. |
| Prev/next période | button-groups · 02-icon-only | RETENU | Paire join + `ChevronLeft/RightIcon` Heroicons ; `Button` `disabled` quand aucune période antérieure/postérieure, jamais navigation dans du vide. |

## Patterns retenus

**Header / KPI**
- headings 01-with-actions & 12-with-filters-and-action — squelette header : titre + cluster search/actions sur une ligne responsive.
- home-screens 02-stacked — arrangement bento (rangée KPI 4-up + sections empilées table/cartes).
- stats 01-with-trending (+ 02-simple en repli sans delta) — rangée KPI `gap-px`, delta seulement si prior réel.
- buttons 01/02/06/10 — hiérarchie primaire / secondaire / icône+label / icône-seule (échelle de taille + états focus repris, markup Catalyst).
- button-groups 01-basic & 02-icon-only — period switcher segmenté (état sélectionné ajouté) + prev/next.

**Stepper (Compte→KYC→Wallet→Dépôt→Souscription→Position)**
- progress-bars 04-panels-with-border — 6 étapes nommées + statut, dégradé vertical mobile, 4e état bloqué.
- progress-bars 07-circles-with-text — rendu vertical panneau étroit avec descriptions.

**À traiter**
- action-panels 08-with-well (+ 03/04 pour le header, 01-simple pour l'empty) — panneau item = well label/valeur + CTA droite.
- lists/feeds 01-simple-with-icons — flux compact icône + label + `<time>` réel.
- empty-states 01-simple & 03-with-starting-points — empty honnête + rangées de détail stepper.
- alerts 01-with-description / 03-with-actions / 06-with-dismiss-button — bannières inline (état, CTA, dismiss).
- stacked-lists 06-with-badges-button-and-actions-menu — liste tâches compacte (badge + meta + kebab).

**Table**
- tables 09-with-avatars-and-multiline-content — colonne identité souscripteur + badge statut (avatar Catalyst, images distantes supprimées).

**Overlays**
- drawers 02-with-background-overlay / 05-with-sticky-footer / 09-file-details-example — drawer détail Headless UI (base + footer collant + body `<dl>`).
- command-palettes 01-simple / 05-with-icons / 08-with-groups — palette ⌘K Catalyst+Combobox (base + idle iconifié + groupes par entité).
- notifications 01-simple / 02-condensed — toasts de feedback (02 = défaut Hearst).

## Patterns refusés

- **sidebar 02/04 (dark) & 06/07/08 (brand)** — simples reskins hardcodés (`gray-900`, `indigo-600`, off-white) : thème déjà géré par tokens `zinc-*`/`accent-*` + `prefers-color-scheme` ; les copier violerait `check:ds` (hex brut hors token).
- **progress-bars 03-bullets** — cache l'identité des étapes ; inutilisable pour un parcours de 6 gates nommés (toute la valeur = nommer la gate courante).
- **progress-bars 08-progress-bar** — barre continue comparative **exclue par le brief** (doit être paliers/panneaux) ; en plus `width:37.5%` en dur = valeur inventée → `check:mocks`/`check:truthful-data`.
- **empty-states 04 & 06 (recommendations/-grid)** — formulaire d'invitation + liste de gens **inventés** avec avatars distants : viole données véridiques + self-contained assets.
- **notifications 04-with-avatar** — messagerie P2P + `<img>` distant, pas du feedback système ; hors périmètre d'un cockpit financier.
- **action-panels 06-with-input & 05-with-toggle** — « À traiter » trie des items backend existants : ni saisie libre, ni réglage/toggle.
- **button-groups 05-checkbox-and-dropdown** — appartient aux toolbars de table, pas au period switcher ; copie un `<input type=checkbox>` + `<select>` natifs, interdits (Catalyst `Checkbox`/`Select` uniquement).
- **buttons 08-rounded / 09-rounded-secondary** — pill/`rounded-full` = registre marketing ; le radius `rounded-md` de Catalyst gouverne un contrôle admin financier.
- **Transverse — chrome brut du kit** — tout `<button>`/`<input>`/`<select>`/`<textarea>`/`<a>`-action et tout web component `@tailwindplus/elements` (`el-dialog`/`el-dropdown`/`el-menu`/`el-command-palette`) sont **rejetés** : primitives Catalyst + overlays Headless UI à la place. Barres verticales comparatives pour le parcours → rejetées au profit du stepper à paliers.

## Boutons — Aceternity

**Principe** — Aceternity ne fournit **que des idées d'interaction, jamais de markup**. La primitive reste Catalyst `<Button>`. On ajoute un wrapper Motion mince (`motion.span` inline-block) qui n'écrit **jamais** `bg`/`border`/`color`/`radius` et respecte `useReducedMotion()` en miroir de `FadeIn` (`src/components/compositions/motion.tsx`). Le `motion` v12 est déjà installé (pas framer-motion).

**Micro-interactions retenues (réalisées au-dessus de Catalyst) :**
- **Hover lift** — `whileHover={{ y: -1 }}`, ~150 ms easeOut ; on jette le hard-shadow Brutal (trop bruyant pour un cockpit financier). Primaire A + critiques B.
- **Click scale** — `whileTap={{ scale: 0.98 }}`, ~120 ms ; jamais de scale-UP au hover (registre ludique, faux pour la finance). A + B (option D à 0.94).
- **Loading borné** — au clic, `state='loading'`, `disabled` passé au Catalyst Button, enfant swappé pour `ArrowPathIcon` (`data-slot=icon`) `animate-spin motion-reduce:animate-none`. `animate-spin` autorisé **ici** car borné à la promesse en cours (doctrine : animations fonctionnelles, jamais décoratives). Critiques B.
- **Succès transitoire** — sur résolution, `state='success'` ~1.5 s : `CheckIcon` + éventuel flip couleur Catalyst green/emerald, puis retour idle ; `setTimeout` nettoyé à l'unmount ; single-shot, aucune boucle. Reduced-motion = swap instantané.

**Références (non implémentées, déjà couvert par Catalyst) :** Outline/Figma-Outline (bordure + hover fournis nativement), icône-seule = `Button plain`, Invert-it / Top-gradient-line (doublons du mécanisme hover Catalyst).

**Effets Aceternity interdits (doctrine) :**
- **Shimmer / Tailwind-Connect sheen permanent** — le brief interdit tout sheen permanent ; primaire A = fill accent + lift + tap, rien d'autre.
- **Border Magic / conic tournant** — exactement la classe « bordures animées en boucle » bannie.
- **Gradient glow / halo aurora** — flou animé décoratif = fond animé, mauvais registre de confiance.
- **Meteors / Aurora / Beams / Moving-Border cards** — animations ambiantes infinies, bannies sur boutons et cartes.
- **Aucune motion sur le secondaire (variant C)** — `Button outline`/`color="white"` inerte ; son `data-hover:bg-zinc-950/2.5` EST le hover léger requis.

## Dépendances réutilisées

Toutes **déjà installées** — aucune dépendance ajoutée :

| Paquet | Version | Usage |
|---|---|---|
| `motion` | `^12.38.0` | wrapper micro-interactions (lift/tap/loading/success), `useReducedMotion` |
| `clsx` | `^2.1.1` | composition de classes |
| `@headlessui/react` | `^2.2.10` | `Dialog`/`Combobox` (drawer, palette ⌘K) |
| `@heroicons/react` | `^2.2.0` | tous les glyphes (remplacent les SVG inline du kit) |
| `recharts` | `^3.10.1` | **seule** couche dataviz via la frontière `src/components/charts` |

- **`tailwind-merge` ABSENT** → pas d'utilitaire `cn` de merge ; on reste sur `clsx` seul.
- **`@mui/x-charts` / `@mui/material` ABSENTS** → la section « MUI X » du brief est **caduque** ; réutiliser `src/components/charts` (recharts).

## Composants propriétaires à créer

Réutilise l'existant : `src/components/compositions/{motion.tsx (FadeIn), empty-state, panel, metric, funnel, priority-queue}` et la frontière `src/components/charts`.

- **`SubscriptionJourneyStepper`** — d'après progress-bars 04 (horizontal/mobile stacked) + 07 (vertical panneau). Piloté par `buildFunnel` : 6 étapes Compte→KYC→Wallet→Dépôt→Souscription→Position, chacune `count`/`pending`/`sourceNote`. 4 états (fait `CheckIcon` / courant / à venir muted / bloqué `status-danger` `XMarkIcon`). Nodes = `Link`, pas `Button`. Étape sans statut backend → `—`, jamais un check fabriqué.
- **Composition « À traiter »** — d'après action-panels 08-with-well + alerts 01/03/06 + stacked-lists 06 + empty-states 01. Piloté par `buildPriorityQueue` (`Availability<readonly PriorityItem[]>`, file classée par sévérité). Montant `tabular-nums` via `formatAmount`, absent → `—`. Action câblée à une route réelle sinon `disabled` + tooltip. File vide → empty honnête « Rien à traiter ».
- **`src/components/actions/` (frontière neuve, absente aujourd'hui)** — wrappe Catalyst `<Button>` + Motion, ne réimplémente pas de bouton :
  - `HearstPrimaryAction` — accent mint + lift + tap.
  - `HearstCriticalAction` — état loading + success (bornés).
  - `HearstSecondaryAction` — `Button outline`/`white` **inerte**, aucune motion.
  - `HearstIconAction` — `Button plain` icône + `aria-label`, `whileTap={{ scale: 0.94 }}` optionnel.

## Preuve

- **82 fichiers HTML** du kit Application UI v4 inspectés sur disque (`~/Downloads/application-ui-v4/html/…`).
- **16 catégories de kit couvertes** : application-shells/sidebar (4) · page-examples/home-screens (2) · data-display/stats (5) · navigation/progress-bars (8) · lists/feeds (3) · feedback/empty-states (6) · feedback/alerts (6) · overlays/notifications (6) · overlays/drawers (6) · navigation/command-palettes (5) · forms/action-panels (6) · lists/tables (5) · elements/buttons (6) · elements/button-groups (5) · headings/page-headings (4) · lists/stacked-lists (5).
- **+ 1 étude boutons Aceternity** (URL `ui.aceternity.com/components/tailwindcss-buttons`) recoupée avec 5 fichiers repo réels (`catalyst/button.tsx`, `compositions/motion.tsx`, la doctrine design-system, `admin/dashboard/header.tsx`, `admin/dashboard/action-queue.tsx`).
- **Faits repo vérifiés pour cet audit** : `motion ^12.38.0` (pas framer-motion), `clsx ^2.1.1`, `tailwind-merge` ABSENT, `@headlessui/react ^2.2.10`, `@heroicons/react ^2.2.0`, `recharts ^3.10.1`, `@mui/x-charts` ABSENT ; `src/components/actions/` ABSENT (à créer) ; `buildFunnel` (6 étapes `pending`/`sourceNote`) et `buildPriorityQueue` (`Availability<readonly PriorityItem[]>`) présents dans `src/lib/vaults/pilotage.ts`.
- **Total : 17 unités d'audit** (16 catégories kit + 1 étude Aceternity).

---

## Note de mission (scope livré vs. reporté)

**Livré dans cet incrément** (les critères du « test de rejet » §14 du brief) :
1. Cette preuve d'inspection (kit réellement audité, 82 fichiers).
2. Frontière `src/components/actions/` (Catalyst + Motion, états `disabled`/`loading`/`success`).
3. `SubscriptionJourneyStepper` remplace les 6 barres du faux funnel.
4. « À traiter » reconstruit en composition (résumé + panneau d'action + flux compact + empty honnête).
5. Motion sobre, `prefers-reduced-motion` respecté, aucune animation permanente.

**Reporté, honnêtement** (déjà « prochaines étapes » dans le brief) : drawer latéral plein + command palette ⌘K. Raison : le détail par-item (dossier KYC, historique de tâche) n'a **pas** d'endpoint backend aujourd'hui ; ouvrir un drawer vide violerait le brief §9 et la doctrine véracité. Le **panneau de détail animé du stepper** (adossé aux `count`/`pending`/`sourceNote` réels de `buildFunnel`) couvre le besoin « cliquer une étape → voir son détail + action » de façon véridique, en attendant les endpoints de détail.

**Déviation assumée** : le brief demande un primaire **orange**. Le repo impose une **identité mono-accent mint** (doctrine §10 + gate/test `no-orange`). Le primaire est donc réalisé avec l'**accent mint Hearst** (token-driven), pas orange — à une prop près si Adrien tranche pour l'orange.
