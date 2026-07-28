# SonarQube Cleanup — SONARQUBE-CLEANUP-001

## Contexte

- **Repository** : `Hearst-Corporation/hearst-connect-v1`
- **Branche** : `fix/sonarqube-cleanup-001`
- **SHA initial** : `5e70915ed585980e0878fe7e5f755df4f244f3eb`
- **Date** : 2026-07-28

## Baseline SonarQube initiale

- **Bugs** : 0
- **Vulnerabilities** : 0
- **Security hotspots** : 0
- **Code smells** : 55
- **Duplicated lines density** : 0.1 %
- **Lines of code (ncloc)** : 13 454
- **Technical debt (sqale_index)** : 446 minutes (~7.4 h)
- **Projet SonarQube** : `herst-connect-v1`
- **Serveur** : http://100.88.191.49:9010

## Gates initiaux

Résultats avant modification :

| Commande | Status | Notes |
| --- | --- | --- |
| `pnpm typecheck` | OK | |
| `pnpm lint` | OK | |
| `pnpm test` | OK | 3 échecs initiaux corrigés (typo pageTitle, max-width, commentaires de marges négatives) |
| `pnpm build` | OK | |
| `pnpm check:catalyst` | OK | 1 avertissement non bloquant sur nomenclature KPI/stat-card |
| `pnpm check:mocks` | OK | |

## Corrections de baseline

- `src/components/admin/typography.tsx` : `pageTitle` ramené à `text-3xl/9 sm:text-4xl/10` pour satisfaire le test de hiérarchie typographique.
- `src/lib/layout-tokens.ts` : `pageMaxWidth` ramené à `max-w-[1280px]` pour satisfaire le test de mesure de lecture.
- `src/components/admin/dashboard-visuals.tsx` : commentaires ajoutés autour des marges Recharts négatives pour satisfaire `language-regression`.

## Décisions de conception

- Pas de `NOSONAR` pour masquer une vraie finding.
- Pas de règle affaiblie.
- Pas de changement de contrat backend.
- Pas de données inventées.
- `??` conservé uniquement quand `null`/`undefined` sont strictement équivalents à la valeur de repli.
- Les alias de types du domaine (`VaultId`, `ClientId`, etc.) conservés si ils apportent une sémantique de sécurité, convertis en types marqués si nécessaire, ou remplacés par `string` si purement redondants.

## Modifications par vague

### 1. Tests de protection

- `tests/vaults/registry.test.tsx` (ou équivalent) : couverture des sources complètes, partielles, indisponibles, vault sans client/stratégie, déploiement manquant, backend failure, préservation du zéro vs unavailable, préservation des identifiants et relations.
- `tests/vaults/source-availability.test.tsx` : états available, partial, unavailable, stale, error, configured-but-unreadable, label, variant, detail, source link.

### 2. Refactor complexité cognitive

- `src/components/vaults/source-availability-badge.tsx` → helpers purs `resolveAvailabilityState`, `resolveAvailabilityLabel`, `resolveAvailabilityDetail`, `resolveAvailabilityVariant`, `resolveAvailabilityLink`.
- `src/lib/vaults/registry.ts` → séparation des lectures, normalisations, résolutions client/stratégie/déploiement/mouvements, assemblage du vault.
- `src/app/admin/btc/page.tsx` → `buildBitcoinViewModel`, `resolveProductionState`, `resolveReserveState`, `resolveMovementState`, sections extraites.
- `src/app/admin/mining/page.tsx` → `buildMiningSummary`, `buildMiningProductionSeries`, `resolveMiningSourceState`, `resolveMiningEconomics`.
- `src/app/admin/administration/produit/page.tsx` → refactor minimal, variables préparées, condition blocks extraits.

### 3. Autres corrections Sonar

- Ternaires imbriqués remplacés par `let content` + branches explicites.
- `Cell` de Recharts remplacé par la méthode supportée par la version installée.
- Composants React imbriqués extraits avec props `Readonly` explicites.
- Clés remplacées par IDs stables.
- Littéraux de template simplifiés.
- Espaces JSX ambigus résolus.
- `Array.at(-1)` là où cible supportée.
- `BigInt` direct quand équivalent.
- Imports morts retirés.
- Re-exports directs.
- Alias de types redondants documentés.

## Visual regression checks

Captures stockées sous `docs/visual-reviews/SONARQUBE-CLEANUP-001/` :

- `/admin` (1440x900 + 375x812) : `admin-1440x900.png`, `admin-375x812.png`
- `/admin/operations` (1440x900) : `operations-1440x900.png`
- `/admin/btc` (1440x900) : `btc-1440x900.png`
- `/admin/mining` (1440x900) : `mining-1440x900.png`
- `/admin/vaults/{vaultId}` (1440x900) : `vault-detail-1440x900.png` (vault id réel extrait du dashboard)

Vérification effectuée : pas de régression de layout, pas de couleurs de graphiques modifiées, pas de labels manquants, pas de seuils déplacés, pas de liens d’entités cassés, pas de débordement horizontal. Les pages s’affichent correctement sur desktop et mobile.

## Gates finales

| Commande | Status | Notes |
| --- | --- | --- |
| `pnpm typecheck` | OK | |
| `pnpm lint` | OK | |
| `pnpm test` | OK | 174 tests passés |
| `pnpm build` | OK | |
| `pnpm check:catalyst` | OK | 1 avertissement non bloquant sur nomenclature KPI/stat-card |
| `pnpm check:mocks` | OK | |
| `pnpm check` | OK | Gate complète (typecheck → lint → check:catalyst → check:mocks → test) |

## Résultat SonarQube final

- **Task ID** : `19f5ae6d-534a-4afa-b3ad-92053b3ffa5c` (CE task du scan final)
- **Analysis ID** : `5632d03d-4420-4263-89db-e596b1ab307f`
- **SHA final** : `54d1e16` (commit `docs(quality): add SonarQube cleanup evidence`)
- **Bugs** : 0
- **Vulnerabilities** : 0
- **Security hotspots** : 0
- **Code smells** : 0
- **Duplicated lines density** : 0.1 %
- **Technical debt** : 0 minute
- **Coverage** : 88.7 %
- **New coverage** : 88.7 % (seuil 80 %)
- **New violations** : 0
- **Cognitive complexity** : 1 088
- **Complexity** : 2 138
- **ncloc** : 13 854
- **Quality gate** : PASSED

## Findings résiduelles justifiées

Aucune finding résiduelle. Le Quality Gate est vert : 0 bug, 0 vulnérabilité, 0 hotspot, 0 code smell, 0 new violation, 0 dette technique.

Les alias de types identitaires (`VaultId`, `ClientId`, `StrategyId`, `MovementId`, `DeploymentId`, `KeeperActionId`, `ComplianceReviewId`) n’ont pas été supprimés ; ils ont été convertis en **types marqués (branded types)** dans `src/lib/vaults/model.ts` pour conserver la sécurité sémantique du modèle public sans que SonarQube les signale comme alias redondants.

## Commits

1. `2754eb6` chore(baseline): restore pageTitle, maxWidth and chart margin comments
2. `63a1d78` test(vaults): protect registry and availability behavior
3. `a78151b` refactor(vaults): reduce registry and availability complexity
4. `c4f4729` refactor(admin): reduce page complexity for btc, mining, product
5. `d53a11c` refactor(charts): remove deprecated Cell usage and simplify render branches
6. `5e9a046` cleanup(sonar): Array.at, direct re-exports and clean imports
7. `ccd15aa` refactor(admin): complete mining and btc page extraction
8. `c4b6fce` refactor(vaults): brand domain identifiers to preserve type safety
9. `48e68d4` cleanup(sonar): final readability, spacing and coverage alignment
10. `54d1e16` docs(quality): add SonarQube cleanup evidence

## Risques et exceptions connus

- `src/components/catalyst/**` est le kit officiel Tailwind Plus, exclu de toute correction.
- Les états `Unavailable` véritables restent affichés tels quels.
- Les seuils de rebalancement et les identifiants d’entités ne changent pas.
