# Note loop — cohérence surfaces / data

> Date : 2026-08-05 · Branche : `main` · Agents : explore surfaces + vérité UI

## Chiffres Railway (probe auth ×5, fingerprint stable)

| Métrique | Passes 1→5 | Stable |
|---|---|---|
| clients | 0,0,0,0,0 | ✅ |
| deployments | 0,0,0,0,0 | ✅ |
| compliance | 0,0,0,0,0 | ✅ |
| series1 events | 13,13,13,13,13 | ✅ |
| rebalancing events | 1,1,1,1,1 | ✅ |
| vault snapshot | UNAVAILABLE ×5 | ✅ |
| mining / btc | UNAVAILABLE ×5 | ✅ |
| indexer | STALLED · codePresent false | ✅ |

Fingerprint : `aab91b616c7a` ×5.

## Checklist

### C1 — Registre ↔ callBackend
- [x] 31/31 endpoints appelés (aucun mort total)
- [x] `admin-indexer-trigger` retiré de la catégorie Keeper → probe (UI runtime only)

### C2 — Affichage data
- [x] Table déploiements sur `/admin/vaults/[id]` (plus de branche `: null`)
- [x] Copy déploiements selon status (NOT_EXPOSED / EMPTY / UNAVAILABLE)
- [x] Compteurs clients / deployments / compliance sur home + registre coffres
- [x] `events-rebalancing` sur opérations
- [x] Trigger indexer sur runtime

### C3 — Vérité copy
- [x] Endpoint inventé dashboard `/api/v1/admin/dashboard` → `/api/v1/dashboard`
- [x] Lecture on-chain opérations : statut réel, plus « n’expose aucune » par défaut
- [x] Pending : « Aucune » seulement si LIVE
- [x] `vault.client` emptyLabel « Propriétaire non reporté… »

### C4 — Gate
- [x] `tsc` / tests ciblés après correctifs loop (68 tests OK)
- [x] `check:no-gpu1` + `check:mocks` OK
- [x] Commit `7669229` push `main`
- [x] Redeploy Vercel `dpl_Bp2ne2sAChe5JNqcY5rKxFBTdpP1`

### C5 — Externe (non bloquant front)
- [ ] RPC `hearst-chain.fly.dev` (indexer STALLED)
- [ ] Peupler DB Investor si annuaire doit être non vide

## Agents
- [Cartographie endpoints](25d8c725-5d2e-452d-8ea7-a37b143d148f) — 31 endpoints, P0 deployments
- [Vérité UI](a3144160-95ba-4acf-a790-ccdee94d6342) — copy / Availability

## Loop
Heartbeat 8 min armé (`AGENT_LOOP_WAKE_hc_surfaces`) — re-probe + smoke à chaque tick.
