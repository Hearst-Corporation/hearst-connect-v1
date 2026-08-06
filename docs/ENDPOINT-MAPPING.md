# Backend → Frontend Endpoint Mapping

> **Spécification backend** (auteur back-end) — contrat à respecter côté front.  
> Ce fichier ne « corrige » pas la spec : il mesure la **conformité** du front `hearst-connect-v1` (`main`) par rapport à ce contrat.  
> Mis à jour : 2026-08-06.

---

## Légende (statut **front**)

| Symbole | Sens |
|--------|------|
| ✅ | Front conforme : registre + appel actif + surface |
| 🔶 | Partiellement conforme (appelé, UI incomplète) |
| ⏳ | Exigé par la spec, **pas encore** au niveau demandé |
| 🚫 | Spec cible, **route absente** du runtime backend actuel (Railway) — attendre livrable back |

---

## 1. Public

| Method | Endpoint | Spec | Conformité front |
|--------|----------|------|------------------|
| `GET` | `/health` | requis | ✅ `/admin/runtime` |
| `GET` | `/ready` | requis | ✅ `/admin/runtime` |
| `GET` | `/api/v1/runtime` | requis | ✅ `/admin/runtime` (+ operations) |
| `POST` | `/api/v1/auth/login` | requis | ✅ `/login` via `loginWithBackend` |
| `POST` | `/api/v1/auth/register` | requis backend | 🔶 page `/register` mailto — pas d’appel API (choix produit front) |

---

## 2. Authenticated (any role)

| Method | Endpoint | Spec (page cible) | Conformité front |
|--------|----------|-------------------|------------------|
| `GET` | `/api/v1/dashboard` | `/admin/dashboard` (+ vaults) | ✅ |
| `GET` | `/api/v1/profile` | `/admin/profile` | ✅ |
| `GET` | `/api/v1/btc` | `/admin/produit` | ✅ |
| `GET` | `/api/v1/mining` | `/admin/produit` | ✅ |
| `GET` | `/api/v1/mining/metrics/onchain` | `/admin/produit` | ✅ `mining-onchain` |
| `GET` | `/api/v1/mining/electricity` | `/admin/produit` | ✅ `mining-electricity` |
| `GET` | `/api/v1/series1/events` | series-1 / ops / vaults / mining | ✅ |
| `GET` | `/api/v1/events/rebalancing` | `/admin/operations` | ✅ `events-rebalancing` |
| `GET` | `/api/v1/vault` | `/admin/vaults/*` | ✅ via `loadAdminRegistry` |
| `GET` | `/api/v1/vault/strategies` | `/admin/vaults/*` | ✅ |
| `GET` | `/api/v1/strategies/:index` | `/admin/vaults/[vaultId]` | 🔶 appelé ; index primaire = 0 (sélecteur multi-index ⏳) |
| `GET` | `/api/v1/rwa-vault` | `/admin/vaults/*` | ✅ |
| `GET` | `/api/v1/product/factsheet` | `/admin/produit` | ✅ |
| `GET` | `/api/v1/backtest/historical` | `/admin/produit` | ✅ |
| `GET` | `/api/v1/ai/context/*` | `/admin/api-explorer` | ✅ probe Explorer |

---

## 3. Admin only

| Method | Endpoint | Spec | Conformité front |
|--------|----------|------|------------------|
| `GET` | `/api/v1/rebalancing/status` | vaults + operations | ✅ |
| `GET` | `/api/v1/clients` | `/admin/clients` | ✅ (extension registry — hors liste initiale spec, branché) |
| `GET` | `/api/v1/deployments` | vaults | ✅ |
| `GET` | `/api/v1/compliance` | `/admin/conformite` | ✅ |
| `POST` | `/api/v1/admin/indexer/trigger` | runtime / operations | ✅ `/admin/runtime` (`IndexerTriggerForm`) |
| `POST` | `/api/v1/admin/users` | `/admin/client-simulator/new` | ✅ confirmé Railway 2026-08-06 — auth → 401, body invalide → 400 (route livrée) |

---

## 4. Keeper

Les 6 POST Keeper de la spec : ✅ `/admin/keeper` via `endpointsByCategory('keeper')` + `runKeeperAction`.

---

## 5. Backlog spec § « To Be Wired » — statut

| Exigence spec | Statut |
|---------------|--------|
| `GET /events/rebalancing` → operations | ✅ |
| `POST /admin/indexer/trigger` → runtime | ✅ |
| `GET /mining/metrics/onchain` → mining | ✅ |
| `GET /mining/electricity` → mining | ✅ |
| `GET /strategies/:index` → vault detail | 🔶 (index 0) — sélecteur ⏳ |
| `POST /admin/users` → client-simulator/new | ✅ route Railway confirmée (400 validation / 401 sans session) |

---

## 6. Note de méthode

La spec backend décrit **le contrat et les surfaces attendues**.  
Les colonnes ⚠️/❌ du document d’origine décrivaient un **état front** à un instant T — pas une erreur de contrat.  
Depuis, le front a rattrapé la plupart des items ; le trigger indexeur est confirmé branché sur le runtime Railway. `POST /api/v1/admin/users` est **livré** sur Railway (probe 2026-08-06 : 401 sans session, 400 corps invalide).

Registre front : `src/lib/backend/endpoints.ts` (33 routes).  
Auth login/register : hors registre, `src/lib/backend/auth.ts`.
