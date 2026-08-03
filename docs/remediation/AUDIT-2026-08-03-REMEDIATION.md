# Remédiation audit 2026-08-03 — liste d'exécution

> Backlog validé (audit Luc, SHA `4b49dbc`). Ceci n'est PAS un nouvel audit :
> suivi d'implémentation uniquement. Les identifiants et gravités de l'audit
> sont conservés tels quels. Vérification ponctuelle autorisée avant correction
> (retrouver le fichier, tenir compte d'un déplacement, éviter d'écraser un fix).
>
> États : `TODO` · `FIXED` · `ALREADY_FIXED` · `BLOCKED_EXTERNAL` · `REJECTED`
> Branche : `remediation/audit-2026-08-03` — départ `4b49dbc`.

## Lot 1 — P0 véracité + cause commune  ✅ TERMINÉ

SHA du correctif : `6de5275`.
Gate finale : `typecheck` ✓ · `lint` ✓ · `check:mocks` ✓ (145 fichiers) · `test` ✓ **206 tests (21 fichiers)**.
Nouveau fichier de tests comportementaux : `tests/vaults/veracity-p0.test.ts` (15 tests). Preuve que les
tests mordent : sur l'ancienne logique VER-05, `activeVaults` d'un register `[UNREADABLE]` renvoyait
`available "0"` (badgé Live) — le test l'exige `unavailable`, donc il échouait avant le fix.

| ID | Correction appliquée | Fichier | Preuve | État |
|----|----------------------|---------|--------|------|
| VER-05 | Nouvelle fonction `activeVaultCount()` : `unavailable` si un vault `UNREADABLE`, si register vide, ou si liste absente ; sinon compte réel (0 mesuré autorisé). Duplication de `vaults/page.tsx` supprimée (utilise la fonction canonique). | `src/lib/vaults/overview.ts` (activeVaultCount) ; `src/app/admin/vaults/page.tsx` | `veracity-p0.test.ts` 6 tests VER-05 + 1 overview | **FIXED** |
| VER-01 | `aggregate === null` ⇒ Served/Partial/NotOpen/Total/Coverage = `unavailable`, jamais `[]`→0 ; agrégat lu mais vide ⇒ 0 mesuré. | `src/app/admin/dashboard/page.tsx` | typecheck+lint ; logique `asCount()`/`coverageCell` | **FIXED** |
| VER-02 | Movements et Pockets measured = `Availability` gâchée sur `reponse.ok`/`dashboard.ok` ; statuts (Rebalancing/Indexer/Ledger) = `editorial`. | `src/app/admin/operations/page.tsx` | typecheck+lint | **FIXED** |
| VER-03 | Pockets/Curve = `unavailable` si factsheet KO ou allocation/curve absente ; figures = `editorial` si source lue. | `src/app/admin/product/page.tsx` | typecheck+lint | **FIXED** |
| VER-04 | Reserve split / Curve points honnêtes sur `btc.ok`/`factsheet.ok` ; figures `editorial`. (même famille, corrigé en même temps) | `src/app/admin/administration/produit/page.tsx` | typecheck+lint | **FIXED** |
| VER-10 | **Racine commune éliminée** : les 13 helpers `manual()` (+ 1 typé dans `[vaultId]`) supprimés. Deux constructeurs honnêtes ajoutés : `editorial()` (valeur assumée, jamais « Live ») et `measuredCount()` (compte propageant l'absence). 0 `manual(` restant dans `src/app`. | `src/lib/vaults/model.ts` + 14 pages | `grep -rn manual( src/app` = 0 ; `veracity-p0.test.ts` 3 tests VER-10 | **FIXED** |
| VER-09 | Badge découplé de la présence : `signalOf()` classe `live`/`stale`/`editorial`/`absent` selon provenance + `stale`. « Live » réservé aux lectures backend fraîches ; éditorial ⇒ « Reference » (marqueur creux) ; périmé ⇒ « Stale ». | `src/lib/vaults/model.ts` (signalOf) ; `green-metric-strip.tsx` ; `.module.css` | `veracity-p0.test.ts` 5 tests VER-09 | **FIXED** |
| VER-11/12 | series-1 « Types » et runtime : cartes de comptage passées en `Availability` honnête (VER-12 traité avec series-1) ; VER-11 (runtime lit chainId/version au mauvais niveau) = **lot 8** (contrat backend), pas encore traité. | `src/app/admin/series-1/page.tsx` | typecheck | VER-12 **FIXED** · VER-11 TODO(lot 8) |

## Lot 2 — Sécurité & contrôle d'accès  ✅ TERMINÉ

Gate finale : `typecheck` ✓ · `lint` ✓ · `check:mocks` ✓ · `test` ✓ **216 tests (23 fichiers)** ·
`build` prod ✓ (10,7 s, Next 16.2.12) · en-têtes CSP+HSTS **vérifiés en prod réelle**.

| ID | Correction appliquée | Fichier | Preuve | État |
|----|----------------------|---------|--------|------|
| ARCH-01 / BAPI-01 | Garde de session explicite + validation FormData en tête de `probeEndpoint` (refus fail-closed `PERMISSION_DENIED`, comme `keeper.ts`). Audit des 3 modules `'use server'` : keeper déjà gardé, actions=login pré-session par nature. | `src/lib/backend/probe.ts` | `tests/probe-guard.test.ts` (3 tests : anonyme refusé, `fetch` jamais appelé, File non coercé) ; HTTP 307 en prod | **FIXED** |
| SEC-04 | CSP + HSTS(prod) + Permissions-Policy ajoutés (X-CTO/Referrer/X-Frame conservés). `unsafe-eval` dev-only, `upgrade-insecure-requests` prod-only, HSTS prod-only. URL backend absente de `connect-src`. | `next.config.mjs` | curl en prod : CSP + HSTS + Permissions-Policy présents ; `/login` sans violation | **FIXED** |
| OPS-05 / ARCH-05 | `process.env` métier ramené à `env.ts` : accesseurs `devQuickLogin()`/`devQuickLoginAvailable()` ; `session.ts` délègue à `authSecret()` (code mort réactivé). | `env.ts`, `actions.ts`, `login/page.tsx`, `session.ts` | `grep process.env hors env.ts` = ∅ (hors NODE_ENV) ; 31 tests session/login/auth ✓ | **FIXED** |
| SEC-02 | Cookie **chiffré AES-256-GCM** (auth. encryption) au lieu de signé seul : jeton porteur backend plus lisible. Clé dérivée SHA-256 d'AUTH_SECRET ; token versionné `v1` ; IV aléatoire ; tag GCM = anti-falsification. Rotation documentée. | `src/lib/session.ts` | preuve crypto (jeton absent en clair, tamper rejeté) + `tests/session-encryption.test.ts` (7 tests) | **FIXED** |
| SEC-03 | Next.js **16.2.6 → 16.2.12** : 0 vuln Next restante (dont SSRF Server Actions). `brace-expansion` forcé aux versions corrigées via override workspace. Vulns **20 → 6**, toutes dev/build-only et transitives (playwright, next>sharp, next>postcss). | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | `pnpm audit` 20→6 ; build prod ✓ ; 216 tests ✓ | **FIXED** (résiduel dev-only documenté) |
| SEC-07 | Révocation serveur impossible depuis le frontend : le backend n'expose ni logout ni revoke. | — | sondes réelles : `/auth/logout` **404**, `/auth/revoke` **404** ; contrat requis dans `BACKEND-FOLLOWUPS.md` | **BLOCKED_EXTERNAL** |

### Résiduel SEC-03 (documenté, non masqué)
6 vulns restantes, **toutes hors runtime de production** : `playwright` (test), `next>sharp` (build/image-optim),
`next>postcss` (build CSS, 4 advisories). Épinglées par Next 16.2.12 ; un override forcé casserait l'arbre Next.
À lever à la prochaine montée mineure de Next. Aucune n'est atteignable par une requête utilisateur en production.

## Lots suivants (résumé — détaillés à l'ouverture de chaque lot)

| ID | Sujet | État |
|----|-------|------|
| OPS-01 / OPS-02 / OPS-04 | CI anti-faux-vert + `check:mocks` | TODO |
| TEST-02/04/05 | Playwright comportemental | TODO |
| UI-01/02/04/06/07/10/12/14/16 | responsive, mobile, a11y, langue | TODO |
| DEAD-01…10 | code mort, chart.js, `/design-lab` | TODO |
| BAPI-03/04/08/12/13/16 | contrats backend côté front | TODO |
| OPS-06 | observabilité (requestId) | TODO |
| VER-06/07/08/11…, P2/P3 | reliquat véracité + mineurs | TODO |
