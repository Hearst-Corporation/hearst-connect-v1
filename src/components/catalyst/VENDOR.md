# Catalyst — kit vendoré

> Documentation du kit de primitives interactives Catalyst (Tailwind Plus).
> Ce fichier décrit ce qui est vendoré et où il sert. Il ne
> modifie aucun composant du kit.

## Source & licence

- **Origine** : Tailwind Plus — Catalyst (composants React + Tailwind), zip
  `catalyst-ui-kit` (typescript), synchronisé le 2026-08-05.
- **Licence** : `src/components/catalyst/LICENSE.md` (Tailwind Labs Inc.).
- **Import** : kit vendoré dans le dépôt (non installé via npm).
- **Vendor** : snapshot Tailwind Plus dans le dépôt. Retouche connue : `link.tsx` rend `next/link`.

## Primitives présentes

Le kit n'est plus importé en entier : les primitives sans usage (`alert`,
`checkbox`, `combobox`, `divider`, `listbox`, `pagination`, `radio`,
`stacked-layout`, `switch`, `textarea`) ont été retirées (commit `0a097c5`).
Restent 17 primitives, toutes importées :

`auth-layout` · `avatar` · `badge` · `button` · `description-list` · `dialog` ·
`dropdown` · `fieldset` · `heading` · `input` · `link` · `navbar` · `select` ·
`sidebar` · `sidebar-layout` · `table` · `text`

## Usage console (rebuild 2026-08-05)

Le shell d’administration (`/admin`) est composé avec :
- `sidebar-layout` + `sidebar` + `navbar` + `dropdown` + `avatar`
  → `src/components/admin/application-layout.tsx`
- Auth : `auth-layout` + `button` / `fieldset` / `input` / `heading` / `text`
- Pages portées Catalyst : `heading`, `text`, `description-list`, `table`,
  `badge`, `link`

**Hors scope du rebuild** : `/espace` et `/espace-utilisateur` ne sont plus
des shells — redirects permanents vers le hub canonique `/account`
(`src/features/user-dashboard/`).

Les dépendances runtime du kit : `@headlessui/react`, `motion`, `clsx`,
`@heroicons/react` (déjà dans `package.json`).
