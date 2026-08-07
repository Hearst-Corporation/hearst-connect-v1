# Passation agent — Hearst Connect V1

> Dernière mise à jour : **2026-08-07** · Branche : **`main` uniquement**

## Mission

Maintenir le front `hearst-connect-v1` branché sur le backend **GitHub → Railway**, sans GPU1.

## Règle absolue — GPU1 interdit

Pas de SSH GPU1, pas de `connect-api.hearst.app`, pas de workflow `deploy.yml` GPU1.

| | |
|---|---|
| Backend | `Hearst-Corporation/hearst-connect-backend` → Railway `hearst-connect-backend-production.up.railway.app` |
| Front | Vercel **`hearst-connect-v1`** → https://hearst-connect-v1.vercel.app |
| Variable | `HEARST_API_URL` (Railway) |

Références : `.cursor/rules/30-no-gpu1.mdc`, `docs/ENDPOINT-MAPPING.md`, `README.md`.

## UI — ligne directrice

**Référence** : `/admin` (pilotage des souscriptions). Composants : `src/components/admin/dashboard/`, `src/components/actions/`. `/admin/dashboard` redirige ici.

## État code (main @ 899833c)

- `pnpm check` vert (375 tests vitest)
- e2e utiles : `access-control`, `audit-closure`, `veracity` (plus de specs capture PNG)
- `docs/` allégé : `ENDPOINT-MAPPING.md` + ce fichier seulement (hors `.keep`)

## Déploiement

- **Backend** : push `main` GitHub → Railway auto
- **Front** : `PROD_AUTODEPLOY: false` → `vercel --prod` manuel après push `main`
- Prod Vercel en retard possible — vérifier avant de dire « c'est en ligne »

## Commandes

```bash
cd "/Users/adrienbeyondcrypto/Desktop/Herst Connect V1"
pnpm install --frozen-lockfile
pnpm check
pnpm dev                              # :4105
E2E_PORT=4105 node scripts/open-dashboard-chrome.mjs
```

## Pièges

1. GPU1 / connect-api ≠ Railway
2. `pnpm` only (pas `npm install`)
3. Pas de commit sans demande explicite d'Adrien
4. Pas de données inventées (`check:mocks`)
5. Vercel : **`hearst-connect-v1`** uniquement

## Prompt court

```
Hearst Connect V1, branche main. Backend Railway (HEARST_API_URL).
GPU1 interdit. UI référence = /admin (Catalyst + pilotage). `/admin/dashboard` redirige.
Autres pages admin à aligner une par une. Pas de commit sans demande.
```
