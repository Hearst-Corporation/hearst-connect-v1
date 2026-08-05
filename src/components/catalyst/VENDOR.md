# Catalyst — kit vendoré

> Documentation du kit de primitives interactives Catalyst (Tailwind Plus).
> Ce fichier décrit ce qui est vendoré et les règles d'usage. Il ne
> modifie aucun composant du kit.

## Source & licence

- **Origine** : Tailwind Plus — Catalyst (composants React + Tailwind), zip
  `catalyst-ui-kit` (typescript), synchronisé le 2026-08-05.
- **Licence** : `src/components/catalyst/LICENSE.md` (Tailwind Labs Inc.).
- **Import** : kit vendoré dans le dépôt (non installé via npm), tel quel.
- **Règle absolue** : les fichiers `src/components/catalyst/**` **ne sont pas
  modifiés**, à l’exception de `link.tsx` (intégration Next.js documentée).
  `eslint` ignore volontairement ce dossier.

## Primitives non utilisées — à conserver

Le kit est importé **en entier**. Les primitives sans import runtime à ce jour
restent vendorées dans le dépôt :

`alert` · `checkbox` · `combobox` · `dialog` · `divider` · `listbox` ·
`pagination` · `radio` · `select` · `stacked-layout` · `switch` · `textarea`

**Ne pas les supprimer** pour faire taire `pnpm quality:dead` (knip) ou toute
autre détection de code mort : elles font partie du kit officiel et seront
réutilisées au besoin sans re-synchronisation.

## Usage console (rebuild 2026-08-05)

Le shell d’administration (`/admin`) est composé avec :
- `sidebar-layout` + `sidebar` + `navbar` + `dropdown` + `avatar`
  → `src/components/admin/application-layout.tsx`
- Auth : `auth-layout` + `button` / `fieldset` / `input` / `heading` / `text`
- Pages portées Catalyst : `heading`, `text`, `description-list`, `table`,
  `badge`, `link`

**Hors scope du rebuild** : `/espace` conserve `ConsoleShell`
(`src/components/layout/console-shell.tsx`) — shell legacy, pas Catalyst.

Les dépendances runtime du kit : `@headlessui/react`, `motion`, `clsx`,
`@heroicons/react` (déjà dans `package.json`).
