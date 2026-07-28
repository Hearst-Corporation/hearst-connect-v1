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

- `/admin` (1440x900 + 375x812)
- `/admin/operations` (1440x900)
- `/admin/btc` (1440x900)
- `/admin/mining` (1440x900)
- `/admin/vaults/{knownVaultId}` (1440x900)

## Gates finales

| Commande | Status | Notes |
| --- | --- | --- |
| `pnpm typecheck` | _à remplir_ | |
| `pnpm lint` | _à remplir_ | |
| `pnpm test` | _à remplir_ | |
| `pnpm build` | _à remplir_ | |
| `pnpm check:catalyst` | _à remplir_ | |
| `pnpm check:mocks` | _à remplir_ | |

## Résultat SonarQube final

- **Task ID** : _à remplir_
- **SHA final** : _à remplir_
- **Bugs** : _à remplir_
- **Vulnerabilities** : _à remplir_
- **Security hotspots** : _à remplir_
- **Code smells** : _à remplir_
- **Duplicated lines density** : _à remplir_
- **Technical debt** : _à remplir_
- **Quality gate** : _à remplir_

## Findings résiduelles justifiées

_Règle, fichier, raison, pourquoi le changer réduirait la sûreté du domaine ou de la sémantique, et si c’est un faux positif._

## Commits

1. test(vaults): protect registry and availability behavior
2. refactor(vaults): reduce registry and availability complexity
3. refactor(admin): simplify btc mining and product pages
4. refactor(charts): remove deprecated Cell usage
5. refactor(react): extract components and stabilize keys
6. cleanup(sonar): readability imports exports and ternaries
7. docs(quality): add SonarQube cleanup evidence

## Risques et exceptions connus

- `src/components/catalyst/**` est le kit officiel Tailwind Plus, exclu de toute correction.
- Les états `Unavailable` véritables restent affichés tels quels.
- Les seuils de rebalancement et les identifiants d’entités ne changent pas.
