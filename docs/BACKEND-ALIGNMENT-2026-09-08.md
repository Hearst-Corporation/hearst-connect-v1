# Alignement backend — actions requises sur `pierre`

Date : 2026-09-08. Contre le backend `Hearst-Corporation/hearst-connect-backend` au commit `1e44bed`.

Ce fichier liste les écarts mesurés entre cette branche et le backend réel, puis les changements exacts à faire avant de merger. Deux blocages de production, puis des nettoyages.

---

## 1. BLOCAGE — la soumission de dépôt est refusée par le backend réel

**Symptôme.** `requestDeposit` (`src/lib/backend/deposit-request.ts`) envoie `{ amountUsdc: <number> }` sans `txHash`. Le backend répond **400** à coup sûr :

- `amountUsdc` doit être une **string** décimale (Zod `AmountUsdcSchema`), pas un nombre ;
- le body est **strict** et exige `txHash` (non-omissible) depuis le commit `d606e10` (cleanup des faux ids).

Le backend de démo (`demo-backend/[...path]/route.ts`) masque ce refus : il accepte un nombre nu et invente des 422 `BELOW_MINIMUM` / `CAPACITY_EXCEEDED` que le backend réel n'émet pas.

**Ce que fait le backend réel aujourd'hui.** `POST /api/v1/me/deposits` **enregistre un dépôt on-chain déjà effectué** — `txHash` sert de clé d'idempotence (un rejeu du même hash répond `200 { "credited": false }`). Ce n'est pas un flux "intention sans transaction".

**Décision produit d'abord, code ensuite** :

- Si le métier veut un flux "intention de souscription" (record-maintenant, paye-plus-tard) → ouvrir un ticket backend pour `POST /api/v1/me/subscription-intents`. Ne pas tricoter ça côté front.
- Si le parcours est "paye puis enregistre" (comportement actuel du backend) → corriger ci-dessous.

**Patch (comportement actuel du backend).**

```diff
// src/lib/backend/deposit-request.ts
  const response = await callBackend<Record<string, unknown>>('me-deposits', {
-   body: { amountUsdc: amount },
+   body: { amountUsdc: String(amount), txHash },
  })
```

avec `txHash` récupéré du contrat on-chain confirmé (c'est bien un dépôt *réalisé*). La validation pré-formulaire reste une courtoisie ; l'autorité reste le backend.

**Synchroniser le mock :** la route démo doit valider **la même forme** (`{ amountUsdc: string, txHash: string }`, strict) et répondre la même forme (`{ credited: boolean, positionId? }`), sinon la démo ment sur le contrat.

**Aligner la note d'unités.** La caveat de `me-deposits` dans `src/lib/backend/endpoints.ts` dit « whole USDC on the wire » — vérifier que ça correspond encore au schéma du backend (il accepte une string décimale de 1 à 78 caractères, > 0 ; les sous-unités sont gérées côté chaîne, pas ici).

---

## 2. BLOCAGE — la jauge BTC / position en bitcoin lit une route admin pour les investisseurs

**Symptôme.** `src/features/user-dashboard/load.ts` dérive l'équivalent BTC depuis `GET /api/v1/admin/market/snapshot` (`snapshot.btcUsd`). Cette route est `adminOnly` côté backend → pour un utilisateur investisseur, **403**, donc `marketSnapshot` = absence nommée `no_market_snapshot`, et tout le bloc « position en bitcoin » (position, accrued, HODL gauge) se tait silencieusement. Le mock démo ne force pas les rôles, d'où l'illusion que ça marche.

**Ce que le backend a livré pour ça.** Depuis le commit `1e44bed`, `GET /api/v1/btc` porte un champ **`market`** côté investisseur :

```
data.market = {
  status: "LIVE",
  value: { btcUsd: string, source: string, asOf: string },
  provenance: "db",
  freshness: { asOf: <timestamp de la ligne>, ageSeconds: 0, stale: false }
}
```

États honnêtes, identiques au snapshot admin :
- table de télémétrie vide → `NOT_CONFIGURED` / `no_telemetry_rows` ;
- panne DB → `UNAVAILABLE` / `db_error` ;
- ligne présente → `LIVE`, avec `freshness.asOf` = timestamp de la ligne (pas l'horloge de requête).

**Patch.**

```diff
// src/features/user-dashboard/load.ts
- const MARKET_SNAPSHOT_ENDPOINT = '/api/v1/admin/market/snapshot'
+ const BTC_MARKET_ENDPOINT = '/api/v1/btc'
- // … callBackend<…>('admin-market-snapshot') …
+ // … callBackend<…>('btc') … lire data.market …
```

Le champ `market` n'est PAS dans les faits du contexte IA (`ai/context/btc`) — la contrainte produit y interdit de substituer un cours spot à la position réserve du vault. Ne l'exposez pas non plus aux surfaces IA.

---

## 3. Copy obsolète — le keeper exécute désormais on-chain

`src/lib/backend/endpoints.ts` dit encore (commentaire des routes keeper) *« None of these routes sign a transaction »*. Depuis le commit backend `0604fc8`, **`POST /api/v1/rebalancing/execute` exécute réellement on-chain** et renvoie un résultat d'exécution ; `KEEPER_ENABLED=0` reste le kill-switch 503. En revanche `mining/metrics/report` et `mining/electricity/pay` renvoient toujours le body "blocked" (write helper absent).

**Patch.** Mettre à jour la caveat de `keeper-rebalancing-execute` (« executes on-chain; `KEEPER_ENABLED=0` → 503 ») et tout copy `/admin/keeper` qui prétend que le rebalance ne signe rien. Garder « signs no transaction » uniquement pour report/pay.

---

## 4. `docs/ENDPOINT-MAPPING.md` obsolète

« Mis à jour : 2026-08-22 », antérieur à tout ce qui précède. Refaire la table : la colonne Spec doit refléter `openapi.yaml` du backend (désormais gate de drift en CI contre le code, donc source de vérité) et la colonne Conformité doit compter les deux blocages ci-dessus comme ⏳ / 🚫 jusqu'au correctif.

---

## 5. Garde anti-dérive du mock

Le payload du `demo-backend` n'a pas de contrôle contre le contrat réel. Ajouter un petit script qui compare la liste des paths du mock à `openapi.yaml` du backend (même extraction regex que `scripts/check-openapi-drift.mjs`) et le lancer dans `pnpm check` — sinon la démo mentira à nouveau au prochain changement de contrat.

---

## 6. Nettoyage

`src/lib/backend/auth.ts` : le commentaire « The current Railway deployment still returns the old prefixed format » est obsolète — testé en direct le 2026-09-08, le token Railway est déjà au format brut. Garder `normalizeBearerToken` (défensif, idempotent) mais corriger le commentaire.

---

## Ordre d'exécution

1. **Décision dépôt** (§1 — ticket métier)
2. **Correctif dépôt + mock sync** (§1)
3. **Bascule spot BTC** (§2)
4. Follow-ups rapides : copy keeper (§3), endpoint-mapping (§4), garde mock (§5), commentaire auth (§6)

Les 1–3 sont un préalable au merge sur `main`. Vérifier aussi le composant `btc-reserve-balance.tsx` admin contre le backend réel — le champ `custody` répond `NOT_SUPPORTED`/`no_custody_provider_integrated` aujourd'hui ; s'assurer qu'il rend une absence nommée et non une valeur inventée.
