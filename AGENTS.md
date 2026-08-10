# AGENTS.md — hearst-connect-v1

## Autorité — qui possède quoi

Autorité **opérationnelle locale** de l'agent dans ce workspace, dans l'ordre :

1. instruction explicite d'Adrien dans la conversation en cours ;
2. **règles locales du dépôt** (`.cursor/rules/*.mdc`) et `CLAUDE.md` — gouvernance,
   git, format de réponse, contraintes produit et runtime propres à ce dépôt ;
3. mission active.

Les règles dans `.cursor/rules/` sont **locales à ce dépôt**, non synchronisées depuis une
source externe, et s'éditent directement ici quand ce workspace doit évoluer.

<!-- HEARST-GOVERNANCE:START -->
## Gouvernance centrale Hearst — RÉFÉRENCE produit/organisationnelle (non-opérationnelle ici)

`.hearst/governance.json` pointe vers le repo externe `Hearst-Corporation/governance`
(ref figée `47a1c989…`). Ce corpus (doctrine globale, règles globales, doctrine/règles
projet) est une **référence produit et organisationnelle**, à consulter, **pas** l'autorité
git/format/qualité opérationnelle de l'agent dans ce workspace — celle-ci reste le corpus local
`.cursor/rules/` de ce dépôt.

⚠️ **Divergences connues à ne pas appliquer aveuglément dans ce dépôt** (état 2026-08-09) :

- La doctrine/règles projet du repo governance décrivent le repo **`Hearst-Corporation/Hearst-Defi`**
  (package `hearst-connect`), **pas** ce dépôt `hearst-connect-v1`. Identité de repo différente.
- Elle mandate un **runner CI `gpu1`** — **interdit ici** par `.cursor/rules/30-no-gpu1.mdc`
  (règle absolue). En cas de conflit, **`30-no-gpu1.mdc` prime** dans ce workspace.
- Elle décrit un design system **dark-only / tokens `--ct-*` / accent `#A7FB90`** ; ce dépôt
  a son **DS local comme autorité** (`fg` / `ink` / `console-*`, cf. `50-no-zinc.mdc` et
  `src/styles/tailwind.css`). Ne pas importer le DS de `Hearst-Defi` ici.

Toute mission qui voudrait rattacher ce dépôt à la gouvernance centrale (rafraîchir le SHA,
résoudre l'identité de repo, aligner le DS) est une **décision dédiée d'Adrien**, pas un
ajustement d'agent.
<!-- HEARST-GOVERNANCE:END -->

## Overlays projet obligatoires (pointeurs — doctrine non recopiée)

- **GPU1 / placement backend** → `.cursor/rules/30-no-gpu1.mdc` (règle absolue : backend =
  GitHub + Railway ; front = Vercel `hearst-connect-v1` ; jamais GPU1 ni `connect-api.hearst.app`).
- **Palette / tokens** → `.cursor/rules/50-no-zinc.mdc` + `src/styles/tailwind.css` (neutrals =
  `fg` / `ink` / `console-*` ; gate `pnpm run check:no-zinc` · `pnpm run check:ds`).
- **Runtime local** → `.cursor/rules/55-restart-local.mdc` (redémarrer `pnpm dev` sur le port
  **4105** en début de mission de travail UI/runtime).
