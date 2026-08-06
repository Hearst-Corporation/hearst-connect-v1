# HC-ADMIN-DASHBOARD-UI-ASSETS-005 — Revue

**Route** : `/admin/dashboard` (Pilotage des souscriptions)
**SHA de base** : `44794ff` + arbre de travail non commité (cette mission)
**Branche** : `main`
**Serveur** : dev local `http://localhost:4105` (réutilisé)
**Environnement de données** : backend réel — file de priorités vide au moment de la capture → état honnête « Rien à traiter » ; la composition peuplée est prouvée par test unitaire (`tests/admin/action-queue.test.tsx`).

## Ce qui a été construit

| Livrable | Fichier | Note |
|---|---|---|
| Preuve d'inspection kit (82 fichiers) | `KIT-AUDIT.md` | matrice besoin→composant→adaptation |
| Frontière d'actions | `src/components/actions/{hearst-actions,index}.tsx` | Catalyst `<Button>` + Motion, états `disabled`/`loading`/`success`/`error` |
| Stepper parcours | `src/components/admin/dashboard/subscription-journey.tsx` | Headless UI Tabs, 6 étapes réelles, panneau de détail animé — **remplace** les 6 barres |
| « À traiter » recomposé | `src/components/admin/dashboard/action-queue.tsx` | chips résumé + panneau d'action « well » + flux compact + empty honnête |
| Câblage | `page.tsx`, `header.tsx`, `dashboard/index.ts` | funnel supprimé, header via la frontière d'actions |

## Preuves techniques

- `pnpm check` : **vert** (typecheck → lint → check:no-gpu1 → check:mocks → check:truthful-data → check:ds → check:ui → test). 364 tests.
- Nouveaux tests : `tests/admin/subscription-journey.test.tsx` (4), `tests/admin/action-queue.test.tsx` (4), `tests/components/hearst-actions.test.tsx` (4), `tests/admin/dashboard-structure.test.ts` (réécrit, 12). Test stale corrigé : `tests/admin-body-nav.test.tsx`.
- Capture navigateur : `e2e/ui-assets-005-capture.spec.ts` — **1 passed**.

## Vérification navigateur (browser-report.json)

- `stepperTabs` : **6**
- `hasFunnelColumns` : **false** (les six barres sont supprimées)
- `hasActionQueue` : **true**
- `addClientDisabled` : **true** (visible + désactivé + tooltip, pas de simulateur)
- `consoleErrors` : **[]** (dont la correction du bug RSC « Only plain objects can be passed to Client Components » — icône passée en élément, plus en composant)
- `networkFails` : **[]**
- Pas de fuite `GET /api` sur la surface pilotage (seule la mise en garde « proxy » est montrée).

## Captures

| Fichier | État |
|---|---|
| `dashboard-desktop-1440x900.png` / `-full.png` | dashboard complet |
| `stepper-kyc-open.png` | stepper, 1re étape ouverte |
| `stepper-wallet-selected.png` | étape Wallet sélectionnée → panneau de détail + caveat proxy |
| `a-traiter-panel.png` | zone « À traiter » (empty honnête « Rien à traiter ») |
| `primary-disabled.png` | bouton principal désactivé |
| `dashboard-laptop-1280x800.png` | laptop |
| `dashboard-mobile-390x844.png` / `-full.png` | mobile responsive |
| `dashboard-zoom-200.png` | zoom 200 % |
| `dashboard-reduced-motion.png` | `prefers-reduced-motion: reduce` |

---

## Checklist fonctionnelle actuelle

### Fonctionnel
- Stepper de parcours à 6 étapes, piloté par `buildFunnel` (états `attention`/`clear`/`unavailable` dérivés du réel).
- Panneau de détail par étape (sélection clavier Headless UI + souris), action = vraie route, caveat proxy honnête.
- « À traiter » : chips résumé mesurés + panneau d'action + flux compact + empty honnête (`Rien à traiter` / `Données indisponibles`).
- Frontière d'actions `src/components/actions/` : primaire mint, critique, danger, secondaire inerte, icône ; `disabled`+tooltip pour les actions sans endpoint.
- Header : recherche désactivée honnête, notifications désactivées, paramètres (lien réel), « Ajouter un client » désactivé + tooltip.

### Testé
- `pnpm check` vert (exit 0), 364 tests. Capture Playwright verte (rejets §14 vérifiés en DOM réel). Reduced-motion émulé. Console propre.

### Mergé
- Rien (arbre de travail, non commité).

### Déployé
- Rien.

### Non fonctionnel / reporté (honnêtement)
- **Drawer latéral plein** et **command palette ⌘K** : non implémentés. Le détail par-item (dossier KYC, historique de tâche) n'a pas d'endpoint aujourd'hui — ouvrir un drawer vide violerait le brief §9 et la doctrine véracité. Le panneau de détail inline du stepper couvre le besoin « cliquer → détail + action » de façon véridique en attendant.
- **Chip monétaire « 125K bloqués »** : non rendu — les `PriorityItem` ne portent pas de montant ; un chip monétaire attend un endpoint dédié (pas de somme inventée).

### Limites connues
- La composition peuplée de « À traiter » n'est visible au navigateur que lorsque le backend a des items en attente ; ici la file est vide → empty honnête. La composition est prouvée par test unitaire.

### Déviation assumée
- Le brief demande un primaire **orange**. Le repo impose une identité **mono-accent mint** (doctrine §10 + gate/test no-orange). Le primaire est réalisé avec l'accent mint Hearst (token-driven), pas orange — à une prop près si tranché autrement.

### Prochaines étapes (ordre)
1. Backend : endpoints de détail par-item (KYC, tâche, source) → drawers latéraux Headless UI.
2. Command palette ⌘K sur données locales déjà chargées (recherche honnête).
3. Endpoint montant en attente → chip monétaire du résumé « À traiter ».
