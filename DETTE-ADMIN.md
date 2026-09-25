# Dette relevée pendant la refonte admin

Trois anomalies constatées en inventoriant les chiffres de `/account`, mises de
côté pour ne pas retarder le chantier admin. Aucune ne bloque la démo ; la
première casserait un vrai compte investisseur.

---

## 1. `/account` appelle un endpoint admin — CRITIQUE

`src/features/user-dashboard/load.ts` lit `/api/v1/admin/market/snapshot` pour
le cours du bitcoin et le hashprice.

**Conséquence** : un investisseur au rôle non-admin verrait tomber, d'un coup,
sa réserve en BTC, sa jauge contre le HODL, les montants en BTC de ses cinq
tuiles et de tout son journal de mouvements — puisque chacun se calcule en
divisant un montant USDC par ce cours.

Le code assume le choix en commentaire (l. 944-947), mais rien ne le protège.

**Remède** : publier le cours sur une route de session, par exemple
`/api/v1/market/snapshot`, et ne réserver à l'admin que ce qui l'exige
vraiment. Côté front, un seul changement de clé.

---

## 2. Deux sources de cours BTC sur le même écran

| Surface | Source |
|---|---|
| Tuiles, jauge HODL, journal | `marketSnapshot.btcUsd` |
| Onglet « BTC price », taux d'entrée de repli | `vault/history[].btcPriceUsdc` |

Les deux peuvent diverger — l'un est un spot, l'autre un snapshot de vault. Le
client lit alors deux cours différents sur le même écran sans le savoir.

**Remède** : choisir la source qui fait foi, et n'utiliser l'autre que pour ce
qu'elle est (un historique). À trancher avec le backend.

---

## 3. Un zéro fabriqué dans le donut des distributions

`src/features/user-dashboard/distributions-donut.tsx` (l. 66-67) :

```ts
btcAmount ?? 0
```

Une ligne de distribution sans montant en bitcoin compte donc pour zéro dans
le total, au lieu de se dire absente. C'est la seule entorse relevée à la
doctrine « une absence est nommée, jamais un zéro ».

**Remède** : écarter la ligne du total et signaler qu'elle n'a pas été lue,
comme le fait déjà la série d'allocation pour une poche sans pourcentage.

---

## Endpoints admin déclarés mais jamais appelés

Quatre read-models existent au registre sans aucun lecteur. Ils sont
disponibles immédiatement :

- `/api/v1/admin/portfolio/exposure`
- `/api/v1/admin/activity/timeseries`
- `/api/v1/admin/vaults/summary`
- `/api/v1/admin/data-health`

---

## Chiffres client sans contrepartie admin

Relevé au 25/09/2026. Chacun est montré au client sans qu'on puisse le
vérifier côté console :

| Chiffre | Manque |
|---|---|
| Available to withdraw, Withdrawn to date, lockup | pas de `/admin/vaults/:id` détaillé |
| Rendement par poche | `vault/bucket-yields` sans lecteur admin |
| Distributions (payé / approuvé / en attente) | approbation possible, lecture impossible |
| Projection Monte-Carlo | aucun endpoint admin |
| Mouvements d'un client | `admin/activity/recent` est global |
| Allocation du vault dans le temps | aucun équivalent |
| Comparaison au HODL | dérivé 100 % dans le front |

---

## 4. Un seul vault a une fiche ouvrable — CORRIGÉ EN PARTIE

Le registre admin (`/api/v1/admin/vaults/registry`) publie cinq vaults, mais
`/api/v1/vault` — la seule source que `loadAdminRegistry` sait résoudre — n'en
publie qu'un, `31337-0x1111…1111`.

Conséquence constatée le 25/09/2026 : **tous les liens vers une fiche de vault
tombaient sur « Page not found »**, y compris depuis la page Vaults elle-même.
Deux causes cumulées :

1. Le mock publiait des identifiants `vault-0`, `vault-1`… que `parseVaultId`
   rejette — il exige la forme `{chainId}-{adresse de 40 hexadécimaux}`. Un
   mock qui publie une forme que le produit refuse ne teste rien. **Corrigé** :
   les identifiants sont désormais conformes, et le premier correspond au vault
   canonique.

2. `/api/v1/vault` ne publie qu'un vault. Les quatre autres du registre
   existent pour peupler les listes, mais leur fiche dira honnêtement qu'elle
   ne les trouve pas. **À corriger côté backend** : soit publier les cinq, soit
   exposer une lecture par identifiant.
