# HC-FULL-REMEDIATION-001 — revue visuelle

Branche `remediation/audit-2026-08-03`, SHA `f210bc8`, 2026-08-04.
Serveur `next dev 16.2.12` @ localhost:3000. Auth : dev quick-login (backend réel).

## Ce que les captures prouvent

- **desktop-1440x900 / laptop-1280x800** — accueil `/admin` : les badges d'état
  montrent les trois cas honnêtes côte à côte — **Live** (vert, ex. « 13
  movements »), **Reference** (creux, valeur éditoriale, ex. « 1/6 sources »),
  **Unavailable** (ex. « Active vaults — »). Aucun « 0 ● Live » (VER-05/09).
- **dashboard-1440x900** — couverture de données : compteurs honnêtes, jamais
  `[]`→0 sur absence d'agrégat (VER-01).
- **operations-1440x900** — « Movements » live, indexeur affiché **STALLED**
  (état backend réel, nommé, pas masqué — VER-02).
- **runtime-1440x900** — **Version 0.1.0** et **Chain 31 337** : les vraies
  valeurs backend, qui affichaient « — » avant (BAPI-03), alignées sur le
  payload réel `serviceVersion` / `contract.chainId`.
- **mobile-375x812** — la **déconnexion (« Sign out ») est visible** en haut à
  droite sous la barre de navigation : UI-02 corrigé (elle était `display:none`).
- **mobile-vaults-375x812** — table du registre défilable sur mobile.
- **unauth-redirect-1440x900** — un visiteur anonyme sur `/admin` est **redirigé
  vers `/login`** : la garde d'accès tient (prouvé aussi par 6 tests e2e).

## Console / réseau

Toutes les routes admin : **0 erreur console** (vérifié par le test e2e
« every admin route renders 200 with no console error »). Un warning React dev
sur le `<script>` de bootstrap du thème est pré-existant (non régressé).

## Limites de cette revue

Captures en thème sombre (le seul réellement appliqué par le green command
center). Le rendu multi-thème clair/sombre complet relève du Design System
(Lot 5, conditionné à la doctrine). Inspection lecteur d'écran non incluse.
