# Catalyst — kit vendoré

> Documentation du kit de primitives interactives Catalyst (Tailwind Plus).
> Exigée par la doctrine Design System (Lot 4). Ce fichier décrit ce qui est
> vendoré, ce qui est utilisé, et les règles d'usage. Il ne modifie aucun
> composant du kit.

## Source & licence

- **Origine** : Tailwind Plus — Catalyst (composants React + Tailwind).
- **Licence** : `src/components/catalyst/LICENSE.md` (Tailwind Labs Inc., licence personnelle).
- **Import** : kit vendoré dans le dépôt (non installé via npm), tel quel.
- **Règle absolue** : les fichiers `src/components/catalyst/**` **ne sont pas modifiés**.
  `eslint` les ignore volontairement (`eslint.config.mjs`), `knip` les liste comme
  potentiellement inutilisés — c'est attendu pour un kit vendoré et **ce n'est pas
  du code mort à supprimer**.

## Statut : 27 fichiers, 9 réellement importés (état 2026-08-04)

Catalyst est l'**unique source de primitives interactives**. Avant de créer une
primitive générique, vérifier ce catalogue.

### Importés par le produit
| Composant | Points d'import (approx.) |
|-----------|---------------------------|
| `heading` | 7 |
| `text` | 6 |
| `table` | 3 |
| `button` | 2 |
| `sidebar` | 1 (rail du green command center) |
| `input` | 1 |
| `fieldset` | 1 |
| `badge` | 1 |
| `auth-layout` | 1 (écran de connexion) |

### Consommés à l'intérieur du kit (pas par le produit)
`link` (importé par 8 composants du kit : `button`, `badge`, `avatar`, `table`,
`text`, `sidebar`, `navbar`, `dropdown`) et `navbar` (importé par
`sidebar-layout` et `stacked-layout`). Ils ne sont donc **pas** inutilisés :
les retirer casserait le kit. Knip ne les signale d'ailleurs pas.

### Vendorés mais non importés (conservés)
`textarea`, `switch`, `stacked-layout`, `sidebar-layout`, `select`, `radio`,
`pagination`, `listbox`, `dropdown`, `divider`, `dialog`,
`description-list`, `combobox`, `checkbox`, `avatar`, `alert` — **16 fichiers**.

Ces primitives restent disponibles : elles sont la réserve du kit pour les
surfaces à venir (formulaires keeper, dialogues de confirmation, pagination des
tables). Certaines (`avatar`, `navbar`, `sidebar-layout`) étaient consommées par
l'ancien `AdminShell`, supprimé au Lot 7 — elles sont conservées par décision
produit (kit vendoré intact), pas réintroduites.

## Adaptations / habillage

Le kit n'est jamais réécrit ; il est **habillé** depuis l'extérieur :
- Le green command center (`src/components/design-lab/green-command-center/`)
  enveloppe `Sidebar`, `Badge`, `Text`, `Heading`, `Table` et ne touche qu'à la
  **matière** (fond, accent, densité) via son module CSS et un contexte `.dark`.
  Le comportement (survol, focus, cible tactile, page courante) reste celui du kit.
- Aucune divergence d'API : les composants sont importés et utilisés tels que
  Catalyst les expose.

## Dette connue

- 16 primitives vendorées non encore utilisées — inventaire ci-dessus, à
  mobiliser au lieu de recréer une primitive générique. (Corrigé le 2026-08-04 :
  ce compte annonçait 18 en incluant `link` et `navbar`, qui sont en réalité
  consommés à l'intérieur du kit.)
- La consolidation des **compositions Hearst Connect** (PageShell, KpiRow,
  ChartPanel…) et la centralisation complète des **tokens** relèvent du Design
  System (doctrine `HEARST-CONNECT-V1-DESIGN-SYSTEM-DOCTRINE.md`) et restent à
  faire (Lot 5), conditionnées à la doctrine.
