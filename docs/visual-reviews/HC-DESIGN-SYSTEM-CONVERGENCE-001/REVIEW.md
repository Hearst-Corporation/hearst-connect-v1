# HC-DESIGN-SYSTEM-CONVERGENCE-001 — revue visuelle

Branche `remediation/audit-2026-08-03`. Départ `9809208`. Doctrine appliquée :
`docs/design-system/HEARST-CONNECT-V1-DESIGN-SYSTEM-DOCTRINE.md`.
Serveur `next dev 16.2.12` @ localhost:3000, backend réel.

## Ce que les captures prouvent

- **marketing-light-1440x900** — la vitrine publique est **en français**
  (« Un seul accès à toute la Corporation », « Se connecter », « Sécurité »,
  « Tarifs ») et rend en **thème clair** : le contrat dual-thème du public est
  réel. L'**accent mint unique `#a7fb90`** est visible (bouton CTA, dégradé du
  hero converti depuis l'ancien bleu — UI-04).
- **login-dark-1440x900** — écran de connexion, thème sombre.
- **console-desktop / laptop / mobile** — la console d'administration en
  **sombre uniquement** (contrat dark-only documenté, UI-16), badges d'état
  honnêtes (En direct/Référence/Indisponible côté logique), déconnexion visible
  sur mobile (UI-02).
- **table-large-1440x900** — registre des coffres : en-têtes `scope="col"`,
  `<caption>` accessible (UI-14), scroll horizontal interne, barre de
  défilement visible (UI-12).
- **chart-panel-1440x900** — page mining : quand la donnée backend est absente
  (indexeur STALLED réel), le chart affiche un **état nommé** (« indisponible /
  attendu »), jamais une fausse courbe (doctrine §7.3 / §11). Tokens `--chart-*`
  actifs (`--chart-1` résout `#88ef6c`).
- **form-1440x900** — formulaire keeper.

## Convergence Design System — état

| Axe (doctrine) | État | Preuve |
|---|---|---|
| Accent vert unique (§9, §10) | **CONVERGÉ** | `#4bbf9f`/bleus éliminés ; gate `check:ds` (hex hors tokens) + selftest |
| Tokens charts (§7.5) | **CONVERGÉ** | `--chart-*` ajoutés, chart-theme repointé, 0 hex |
| Recharts moteur unique (§7.1) | **DÉJÀ CONFORME** | chart.js retiré ; 0 chart dans une route |
| États charts + anti-fabrication (§7.3) | **DÉJÀ CONFORME** | ChartFrame/EtatSerie ; plottableAsChart |
| Tables : scope/caption/scroll (§6) | **CONVERGÉ** | 5 tables corrigées (UI-14/10/12) |
| Contrat de thème (§12) | **DOCUMENTÉ** | public dual, console dark-only (UI-16) |
| Catalyst source unique (§2, §3) | **DÉJÀ CONFORME + VENDOR.md** | kit vendoré documenté |
| Langue française (§1) | **PUBLIC FR / CONSOLE EN** | mission FR dédiée requise (voir notes) |
| Arborescence charts §7.2, compositions §2 | **REPORTÉ** | renommage à risque, contrat container à arbitrer |

## Console / réseau / motion

Toutes les routes admin : **0 erreur console** (e2e « renders 200 with no
console error »). `prefers-reduced-motion` respecté (tailwind.css + module
console). Aucun overflow horizontal global.

## Limites

Console en anglais (la migration FR complète est une mission coordonnée, cf.
`docs/design-system/DESIGN-SYSTEM-NOTES.md` — glossaire d'ancrage fourni).
Captures console en sombre uniquement (contrat dark-only assumé). Test lecteur
d'écran non inclus.
