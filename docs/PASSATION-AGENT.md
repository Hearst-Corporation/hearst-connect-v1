# Passation agent — Hearst Connect V1

> **À coller en tête de mission pour le prochain agent.**  
> Dernière mise à jour : 2026-08-05. Branche de travail : **`main` uniquement**.

---

## Mission en une phrase

Maintenir le front `hearst-connect-v1` branché honnêtement sur le backend
**GitHub → Railway**, sans jamais toucher GPU1.

---

## RÈGLE ABSOLUE (lis ça en premier)

**GPU1 = INTERDIT** pour Hearst Connect.

- Ne pas SSH `gpu1`, `comput3@`, Tailscale, LAN GPU1
- Ne pas utiliser `connect-api.hearst.app` comme `HEARST_API_URL`
- Ne pas lancer le workflow `deploy.yml` GPU1 du backend
- Ne pas proposer `deploy-gpu1.sh`

**Backend canonique :**

| | |
|---|---|
| Repo | `Hearst-Corporation/hearst-connect-backend` (GitHub `main`) |
| Runtime prod | `https://hearst-connect-backend-production.up.railway.app` |
| Variable front | `HEARST_API_URL` (voir `.env.example`) |
| Déploiement backend | Push `main` → Railway auto, ou `railway redeploy` (projet `radiant-recreation`, service `hearst-connect-backend`) |

**Front :**

| | |
|---|---|
| Repo local | `/Users/adrienbeyondcrypto/Desktop/Herst Connect V1` |
| Branche active | **`main`** (ne plus travailler sur `rebuild/catalyst-console`) |
| Vercel | projet **`hearst-connect-v1`** uniquement — jamais `hearst-connect` / `app.hearst.app` |
| Prod | https://hearst-connect-v1.vercel.app |

Fichiers de référence : `.cursor/rules/30-no-gpu1.mdc`, `README.md` § Architecture, `CLAUDE.md`.  
Gate : `pnpm check:no-gpu1` (dans `pnpm check`).

---

## État prod (vérifié 2026-08-05)

### Railway

```
GET /health                    → 200
GET /api/v1/runtime            → 200, commitSha null, indexer STALLED, codePresent false
GET /api/v1/clients            → 401 sans auth ; 200 LIVE/0 avec admin
GET /api/v1/deployments        → 200 LIVE/0 (admin)
GET /api/v1/compliance         → 200 LIVE/0 (admin)
GET /api/v1/series1/events     → 200 LIVE (événements indexés historiques)
vault / mining / btc / strategies → 200 mais champs UNAVAILABLE (RPC chain down)
```

**Cause chain down :** RPC `https://hearst-chain.fly.dev` injoignable.  
**Hors périmètre GPU1** — résolution Fly / infra chain, pas GPU1.

### Vercel front

- Projet `hearst-connect-v1`, `HEARST_API_URL` = Railway (prod/preview/dev)
- Deploy CLI prod effectué 2026-08-05 (`dpl_419RYiubWrGT4Kv6E9BwAUH88FLs`) — re-déployer après push `main` si besoin

### Backend GitHub

**Commit `a545491`** sur `hearst-connect-backend` `main` : routes `/clients`, `/deployments`, `/compliance`.

---



Note loop active : `docs/PASSATION-LOOP-NOTE.md` (chiffres ×5 + checklist P0).
## Front — câblage data (main)

Registre : **31 endpoints** dans `src/lib/backend/endpoints.ts`.

| Zone | État |
|---|---|
| `loadAdminRegistry` | appelle vault, strategies, rwa, rebalancing, series1-events, dashboard, **clients, deployments, compliance** |
| `/admin/clients` | table annuaire (vide LIVE = « vide », plus de copy « non exposé ») |
| `/admin/conformite` | table file KYC |
| `/admin/operations` | + **events-rebalancing** |
| `/admin/runtime` | + formulaire **trigger indexer** (`admin-indexer-trigger`) |
| `vault.client` | `EMPTY` / `vault_owner_not_reported` (pas `NOT_EXPOSED`) |

### Données qui sortent aujourd’hui

- Journal Series 1, events rebalancing (si indexés), probes runtime, factsheet terms
- Clients / deployments / compliance : **branchés**, listes souvent **vides en DB**

### Données bloquées (externe)

- Vault snapshot, strategies, RWA, mining, BTC → RPC / indexer

---

## Ce qu'il reste (priorité)

### P0

1. Remettre le RPC `hearst-chain.fly.dev` (Fly auth humaine) puis éventuellement trigger indexer depuis `/admin/runtime`
2. Re-deploy Vercel après push `main` si le Git integration n’a pas pris le commit

### P1

3. `GIT_COMMIT_SHA` sur build Railway (cosmétique)
4. Peupler / vérifier DB Investor pour clients/compliance non vides

### Hors scope / BLOCKED_EXTERNAL

- SEC-07 logout/revoke backend
- BAPI-09 rate-limit login
- `hearst-chain.fly.dev` nécessite `fly auth login` (humain)

---

## Commandes utiles

```bash
cd "/Users/adrienbeyondcrypto/Desktop/Herst Connect V1"
git checkout main
pnpm install --frozen-lockfile
pnpm check
pnpm dev   # port 4105

# Prod Railway
curl -s https://hearst-connect-backend-production.up.railway.app/api/v1/runtime | jq .
```

**Ne pas exécuter :** `ssh gpu1`, `gh workflow run deploy.yml` (GPU1), `fly` sans auth Adrien.

---

## Pièges

1. Confondre GPU1 / connect-api avec Railway
2. `git add -A` aveugle — staging conscient (exclure secrets, screenshots racine)
3. Commit sans demande explicite d’Adrien (sauf instruction actuelle)
4. Inventer des données / contourner `check:mocks`
5. Déployer sur Vercel `hearst-connect` (tierce app)
6. Travailler sur une branche parallèle alors qu’Adrien a demandé **main only**

---

## Prompt court à réutiliser

```
Tu reprends Hearst Connect V1 sur branche main uniquement.
Backend = GitHub hearst-connect-backend main → Railway
(hearst-connect-backend-production.up.railway.app). GPU1 INTERDIT
(.cursor/rules/30-no-gpu1.mdc + docs/PASSATION-AGENT.md).
Front Vercel hearst-connect-v1, HEARST_API_URL Railway.
Indexer STALLED / hearst-chain.fly.dev down — hors GPU1.
Pas de commit sans demande explicite d’Adrien.
```
