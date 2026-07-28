# HC-ADMIN-DASHBOARD-002 — Revue visuelle

Mission : construction du dashboard d'administration Hearst Connect.

## Périmètre

- Design system admin (`AdminSurface`, tokens `brand-*`, polices Source Sans 3 + Cherry Swash)
- Accueil agrégé (dashboard, mouvements, runtime, ready)
- Clients et Conformité — structures prêtes, sans données inventées
- Opérations — registre Series 1 + rééquilibrage branché
- Administration — hub par sous-sections
- Runtime — matrice d'état complète
- API Explorer — groupes lectures / actions

## Captures

| Fichier | Statut |
|---|---|
| after-home-desktop-1440x900.png | ✓ |
| after-home-laptop-1280x800.png | ✓ |
| after-home-mobile-375x812.png | ✓ |
| clients-desktop.png | ✓ |
| conformite-desktop.png | ✓ |
| operations-desktop.png | ✓ |
| administration-desktop.png | ✓ |
| runtime-desktop.png | ✓ |
| api-explorer-desktop.png | ✓ |
| before-home-desktop.png | **Absent** — aucun cliché « avant » archivé dans le dépôt au démarrage de la mission |
| smart-contracts-desktop.png | **Absent** — voir section Smart contracts |


**Pas de capture `smart-contracts-desktop.png`.**

Dépendance : aucun endpoint dédié owner/rôles/pause dans le registre frontend (26 routes). Les lectures on-chain passent par `/admin/vault`, `/admin/series-1` et `runtime`.

## Endpoints consultés (Accueil)

| Endpoint | Usage |
|---|---|
| `GET /api/v1/dashboard` | Encours, capacité, performance, stratégies |
| `GET /api/v1/series1/events` | Mouvements récents, distribution |
| `GET /ready` | Disponibilité service |
| `GET /api/v1/runtime` | Matrice infrastructure |

## États backend

- Données réelles lorsque le backend Railway répond et la session admin est valide
- Surfaces Clients/Conformité/Approbations : empty states honnêtes (source absente)
- Aucun compteur inventé (zéro interdit par `check:mocks`)

## Validations

```text
npm run typecheck  ✓
npm run lint       ✓
npm run test       ✓ (104 tests)
npm run build      ✓
npm run check:mocks✓
```

## Console navigateur

Objectif : 0 erreur sur les captures (vérifier lors de la capture Playwright).
