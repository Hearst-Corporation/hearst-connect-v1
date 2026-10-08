# Passation agent — Hearst Connect V1

> **DESCRIPTIVE** (runbook de reprise) — pas d’autorité d’implémentation.
> Dernière mise à jour : **2026-08-22** (chemins locaux et outillage corrigés le 2026-10-05) · Branche : **`main` uniquement**

## Mission

Maintenir le front `hearst-connect-v1` branché sur le backend **GitHub → Railway**, sans GPU1.

Hearst Connect est mis de côté pour la première mise en ligne (2026-10-05) et n'est pas relié à l'Operations Platform : ni `/handoff`, ni lien client Platform, ni contrôle de l'entitlement `connect`. Il garde ses propres comptes et sa connexion email + mot de passe.

## Règle absolue — GPU1 interdit

Pas de SSH GPU1, pas de `connect-api.hearst.app`, pas de workflow `deploy.yml` GPU1.

## Carte d'infrastructure (vérifiée 2026-08-22)

| Quoi | Où | Accès local |
|---|---|---|
| Front | Vercel **`hearst-connect-v1`** → https://hearst-connect-v1.vercel.app | pas de `.vercel/` sur ce poste (gitignoré) : `vercel link` avant `vercel --prod` |
| Backend | repo `Hearst-Corporation/hearst-connect-backend` → Railway projet **`radiant-recreation`**, service `hearst-connect-backend` → `https://hearst-connect-backend-production-1da1.up.railway.app` (recréé 2026-09-21 après expiration du trial) | `railway link -p b04cc5e6-ce50-4dfd-abec-d37675d8ea5d` (le clone `~/Dev/active/hearst-connect-backend` n'est pas lié) ; en local `pnpm dev` sur 4610 |
| DB | Postgres dans le même projet Railway (`radiant-recreation`) | `railway run -- bash -c 'DATABASE_URL="$DATABASE_PUBLIC_URL" …'` — `DATABASE_URL` interne ne passe pas depuis l'extérieur |
| Fork EVM | Anvil Base-mainnet fork → `https://hearst-chain-production.up.railway.app` (chainId 31337) — recréé 2026-09-21 ; l'ancien `hearst-base-fork-app-production` est mort avec le trial | même compte Railway (`adrien@hearstcorporation.io`) |
| Contrats | Foundry, `script/DeployDynaVault.s.sol` — le dépôt de contrats n'est plus sur ce poste | `forge` installé |
| Vault actuel | `PermissionedDynaVault` @ **`0xe8380935c414DB245eA6dFc30B9D2fd3D14891E0`** (déployé 2026-08-22) | variable Railway `DYNAVAULT_ADDRESS` |

**Le fork n'est PLUS sur Fly.io** (`hearst-chain.fly.dev` est mort — docs backend corrigées). L'ancien vault `0xeDDf…4A17` a disparu avec l'ancien fork ; l'historique indexé en DB lui reste lié.

## État au 2026-08-22 (fin de session audit + réparation)

### Fait

- **Audit go-live complet** (routes, contrat backend, runtime, données, déploiement) : tout GO sauf données — corrigé depuis.
- **Vault redéployé** sur le fork Railway (l'ancien n'avait plus de bytecode) + 6 × 100k USDC de dépôts rejoués (impersonation whale Uniswap V3 → deployer Anvil `0xf39F…2266`, whitelist, approve, deposit). AUM = 600k USDC.
- **Curseur indexeur** du nouveau vault avancé manuellement (il repartait au bloc 220k → 41h de scan ; calé juste avant le déploiement).
- **Données fake purgées** en prod : distribution + summary `strategy-id-here` supprimés via `scripts/clean-fake-distributions.ts` (backend, commit `cdd33a9`).
- **Passe de vérité frontend** (commit `64f4135`, 26 fichiers) : 5 bloquants d'audit corrigés (faux « Portfolio stable », champs electricity fantômes, Pay sans garde `canPay`, 3 endpoints invisibles dans l'explorer, `minimumDepositUsdc` ÷1e6), échelles atomiques partout scale-aware, bodies keeper `{id}` / `{period, rwaStrategyId}` / `{action, amount}` câblés, code mort supprimé.
- **Charts recodés** (commit `ce0aac2`) : `HearstAllocationChart` = bullet rows CSS (fill mint = mesuré, tick = cible, drift en pt), `HearstDonutChart` = anneau `conic-gradient` pur CSS. Plus de recharts sur ces deux-là.
- **Dashboard** : strip Market en haut, pas de titre hero, pas de sous-titres de panels (commit `162a910`).

### Persistance du fork — vérifiée

Volume `/data` attaché au service, Anvil `--state /data/anvil-state.json --state-interval 60`. Le vault + les dépôts ont **survécu à un cycle sleep/wake réel** (testé). La perte d'origine était la migration Fly→Railway, pas une absence de volume.

### Reste à faire (ordonné)

1. **Désactiver « Sleep when idle »** sur le service Railway fork EVM (recréé 2026-09-21) (dashboard uniquement — le CLI ne l'expose pas). Projet **`determined-flexibility`** → [Settings du service](https://railway.com/project/c94ee40b-303e-403f-b326-dde3378e0034?environmentId=787f6425-2220-481d-8aa2-1ca302579a1d). Quand le fork dort, les lectures on-chain du backend échouent quelques secondes au réveil → états « unavailable » sporadiques.
2. **`rebalancing/status`** reste `not_exposed_by_contract` par construction : le v2.1 stock n'a pas de getter de drift (le backend le documente lui-même dans `rebalancing-status.ts`). Redéployer l'impl upgradée si le rebalancing opérationnel est voulu.
3. **Drift réel −33 pt sur S2 (idle)** : les dépôts sont arrivés en poche idle ; un rebalance résorberait. `POST /api/v1/rebalancing/execute` est un keeper log (aucune signature on-chain côté backend).
4. **Doubles read models backend** (non bloquant) : drift porté par `admin-portfolio-overview` ET `admin-rebalancing-summary` ; KYC par `admin-clients-recent` ET `compliance`. Canonisation = décision backend.
5. **Dependabot backend** : 12 vulnérabilités signalées par GitHub sur `hearst-connect-backend`.

### Traité (2026-08-22, passe front)

- Gate `pnpm check` restaurée (`next build && tsc --noEmit`) ; `e2e/` exclu du tsconfig. `@playwright/test` est depuis en devDependency, mais aucune config ni script ne lance les specs.
- UI graph régénéré ; panels dashboard obsolètes retirés du catalog.
- Mineurs audit §50 : headers KPI unifiés (`DashboardHeader` + `titleAddon`), regex `:param` canonique, types `Series1Event` / `ClientMovement` / `BackendResolved`, `/espace/*` → catch-all, compteurs dynamiques, double h1 `/account` corrigé, lien « Create simulated client » sur `/admin/clients`.

## État code (mesurer `git rev-parse --short HEAD` — ne pas figer un SHA fantôme ici)

- Gate : `pnpm check` (voir `package.json` — source de vérité)
- e2e utiles : `access-control`, `audit-closure`, `veracity`
- `docs/` : `ENDPOINT-MAPPING.md`, `BACKEND-ALIGNMENT-2026-09-08.md`, `PASSATION-AGENT.md`, `architecture/UI-GRAPH.md` + `ui-graph.{json,mmd}`

## Déploiement

- **Backend** : push `main` GitHub → Railway auto (`radiant-recreation`)
- **Front** : push `main` → Vercel auto (ou `vercel --prod`)
- Prod Vercel en retard possible — vérifier avant de dire « c'est en ligne »

## Commandes

```bash
cd ~/Dev/active/hearst-connect-v1
pnpm install --frozen-lockfile
pnpm dev                              # :4600
# Backend local : cd ~/Dev/active/hearst-connect-backend && pnpm dev   (:4610)
# Scripts contre la base Railway (depuis un clone lié au projet Railway) :
railway run -- bash -c 'DATABASE_URL="$DATABASE_PUBLIC_URL" pnpm exec tsx scripts/<script>.ts'
```

## Pièges

1. GPU1 / connect-api ≠ Railway
2. `pnpm` only (pas `npm install`)
3. Pas de données inventées — états `unavailable`/`empty` nommés, montants atomiques via `formatAdminAtomic`/`formatEventAtomic`, **jamais** le défaut `fromAtomic: 1_000_000` de `formatCurrency` sur une valeur déjà en USD entiers (convention backend : `*Usdc` = entiers, atomiques = on-chain 6dp)
4. Vercel : **`hearst-connect-v1`** uniquement
5. Le backend rate-limite (429) — espacer les appels, ne pas spammer les rechargements
6. Le fork Railway dort quand idle — un 404/« unavailable » transitoire au réveil n'est pas une régression

## Prompt court

```
Hearst Connect V1, branche main. Backend Railway (HEARST_API_URL, projet radiant-recreation).
Fork EVM = Railway `hearst-chain-production` (chainId 31337, recréé 2026-09-21), vault 0xe8380935c414DB245eA6dFc30B9D2fd3D14891E0.
GPU1 interdit. Passation = DESCRIPTIVE.
Autorité opérationnelle : README, `docs/`, `package.json`.
```
