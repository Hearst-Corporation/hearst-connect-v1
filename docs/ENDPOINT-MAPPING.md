# Backend → Frontend Endpoint Mapping

> **Spécification vivante** (remplace le brouillon daté 2026-08-04).  
> Source de vérité code : `src/lib/backend/endpoints.ts` (31 routes métier/probe/keeper).  
> Auth login/register : hors registre (flux `lib/backend/auth.ts`).  
> Dernière vérif : 2026-08-05 · branche `main`.

---

## Légende

| Symbole | Sens |
|--------|------|
| ✅ | Dans le registre **et** appelé en prod (page / registry / keeper / trigger) |
| 🔶 | Dans le registre, appelé, affichage partiel |
| ⚠️ | Dans le registre, uniquement API Explorer / probe |
| ❌ | Absent du backend **ou** hors contrat front (ne pas inventer) |
| ~~…~~ | Affirmation du brouillon 2026-08-04 **infirmée** |

---

## Écarts vs brouillon fourni (2026-08-04)

| Affirmation brouillon | Réalité `main` |
|---|---|
| `mining-onchain` / `mining-electricity` ⚠️ non appelés | ✅ `admin/mining/page.tsx` |
| `strategy-detail` ⚠️ non appelé | ✅ `lib/vaults/strategy-detail.ts` → `vaults/[vaultId]` |
| `events/rebalancing` ❌ pas au registre | ✅ id `events-rebalancing` → `operations` |
| `admin/indexer/trigger` ❌ pas au registre | ✅ id `admin-indexer-trigger` → `runtime` + form |
| `loadAdminRegistry` = 6 appels | **9** (+ `clients`, `deployments`, `compliance`) |
| `endpoint-section.tsx` | **Supprimé** |
| `POST /api/v1/admin/users` à brancher | **N’existe pas** sur le backend Railway/GitHub |
| Numéros de lignes du brouillon | Obsolètes — ne pas s’y fier |

---

## 1. Public (sans session front)

| Method | Endpoint | Statut | Page | Call site |
|--------|----------|--------|------|-----------|
| `GET` | `/health` | ✅ | `/admin/runtime` | `callBackend('health')` |
| `GET` | `/ready` | ✅ | `/admin/runtime` | `callBackend('ready')` |
| `GET` | `/api/v1/runtime` | ✅ | `/admin/runtime`, `/admin/operations` | `callBackend('runtime')` |
| `POST` | `/api/v1/auth/login` | ✅ | `/login` | `loginWithBackend()` — **hors** `BACKEND_ENDPOINTS` |
| `POST` | `/api/v1/auth/register` | 🔶 | `/register` | Backend existe (bootstrap secret). Front = mailto / pas d’API — **volontaire** |

---

## 2. Session (investor ou admin)

| Method | Endpoint | id registre | Statut | Consommateurs |
|--------|----------|-------------|--------|---------------|
| `GET` | `/api/v1/dashboard` | `dashboard` | ✅ | `admin/dashboard`, `operations`, `registry`, `espace/*` |
| `GET` | `/api/v1/profile` | `profile` | ✅ | `admin/profile`, `espace/profil` |
| `GET` | `/api/v1/btc` | `btc` | ✅ | `btc`, `mining`, `administration/produit`, `espace/*` |
| `GET` | `/api/v1/mining` | `mining` | ✅ | `mining`, `administration/produit` |
| `GET` | `/api/v1/mining/metrics/onchain` | `mining-onchain` | ✅ | `mining` (réconciliation) |
| `GET` | `/api/v1/mining/electricity` | `mining-electricity` | ✅ | `mining` (réconciliation) |
| `GET` | `/api/v1/series1/events` | `series1-events` | ✅ | `series-1`, `operations`, `mining`, `registry`, `espace/activite` |
| `GET` | `/api/v1/events/rebalancing` | `events-rebalancing` | ✅ | `operations` |
| `GET` | `/api/v1/vault` | `vault` | ✅ | `registry` → vaults |
| `GET` | `/api/v1/vault/strategies` | `vault-strategies` | ✅ | `registry` |
| `GET` | `/api/v1/strategies/:index` | `strategy-detail` | 🔶 | `vaults/[vaultId]` via `loadStrategyDetail` — index primaire = **0** si registre non vide |
| `GET` | `/api/v1/rwa-vault` | `rwa-vault` | ✅ | `registry` |
| `GET` | `/api/v1/product/factsheet` | `product-factsheet` | ✅ | `product`, `administration/produit` |
| `GET` | `/api/v1/backtest/historical` | `backtest-historical` | ✅ | `backtest`, `administration/produit` |
| `GET` | `/api/v1/ai/context/*` | `ai-context-*` | ⚠️ | API Explorer (`probeEndpoint`) uniquement |

---

## 3. Admin only

| Method | Endpoint | id | Statut | Consommateurs |
|--------|----------|-----|--------|---------------|
| `GET` | `/api/v1/rebalancing/status` | `rebalancing-status` | ✅ | `registry`, `operations` |
| `GET` | `/api/v1/clients` | `clients` | ✅ | `registry` → `clients`, `conformite`, home, vaults |
| `GET` | `/api/v1/deployments` | `deployments` | ✅ | `registry` → `vaults/[id]` (table) |
| `GET` | `/api/v1/compliance` | `compliance` | ✅ | `registry` → `conformite`, `clients` |
| `POST` | `/api/v1/admin/indexer/trigger` | `admin-indexer-trigger` | ✅ | `runtime` (`IndexerTriggerForm`) — catégorie `probe` |
| `POST` | `/api/v1/admin/users` | — | ❌ | **Absent du backend** — ne pas enregistrer / ne pas inventer |

---

## 4. Keeper (admin + garde backend)

| Method | Endpoint | id | Statut | Mécanisme |
|--------|----------|-----|--------|-----------|
| `POST` | `/api/v1/mining/metrics/report` | `keeper-mining-report` | ✅ | `endpointsByCategory('keeper')` → `KeeperForm` → `runKeeperAction` |
| `POST` | `/api/v1/mining/electricity/pay` | `keeper-electricity-pay` | ✅ | idem |
| `POST` | `/api/v1/rebalancing/execute` | `keeper-rebalancing-execute` | ✅ | idem |
| `POST` | `/api/v1/rwa-vault` | `keeper-rwa-vault` | ✅ | idem |
| `POST` | `/api/v1/btc-deposit/initiate` | `keeper-btc-deposit-initiate` | ✅ | idem |
| `POST` | `/api/v1/btc-deposit/complete` | `keeper-btc-deposit-complete` | ✅ | idem |

---

## 5. Orchestrateur vault

`loadAdminRegistry` (`src/lib/vaults/registry.ts`) — **9** appels parallèles :

```
vault · vault-strategies · rwa-vault · rebalancing-status
series1-events · dashboard · clients · deployments · compliance
```

Alimente : `/admin`, `/admin/vaults`, `/admin/vaults/[vaultId]`, `/admin/clients`, `/admin/conformite`, `/admin/dashboard` (sources).

---

## 6. Infra partagée

| Module | Rôle |
|--------|------|
| `src/lib/backend/endpoints.ts` | Registre unique (31) |
| `src/lib/backend/client.ts` | `callBackend` |
| `src/lib/backend/auth.ts` | login backend |
| `src/lib/backend/probe.ts` | API Explorer GET (refuse `:param`) |
| `src/lib/backend/keeper.ts` | Keeper writes + CONFIRM |
| `src/lib/backend/indexer-trigger.ts` | Trigger indexer + CONFIRM |
| `src/lib/vaults/registry.ts` | Orchestrateur admin |
| `src/lib/vaults/strategy-detail.ts` | `strategies/:index` |
| ~~`endpoint-section.tsx`~~ | **Supprimé** — ne plus référencer |

---

## 7. Backlog spécification (section « To Be Wired » du brouillon)

| Endpoint | État |
|----------|------|
| `GET …/events/rebalancing` | ✅ Fait — `operations` |
| `POST …/admin/indexer/trigger` | ✅ Fait — `runtime` |
| `GET …/mining/metrics/onchain` | ✅ Fait — `mining` |
| `GET …/mining/electricity` | ✅ Fait — `mining` |
| `GET …/strategies/:index` | 🔶 Fait (index 0) — sélecteur multi-index = P1 optionnel |
| `POST …/admin/users` | ❌ **BLOCKED** — route absente du backend |
| `POST …/auth/register` côté front | Hors scope produit actuel (mailto) sauf demande explicite |

---

## 8. Auth (rappel)

```
POST /api/v1/auth/login → token Bearer dans cookie session
requireSession() sur /admin/*
rôle backend admin → session OWNER ; investor refusé à la console admin
```

---

*Spécification adoptée : ce fichier. Le brouillon collé en chat n’est plus autoritatif.*
