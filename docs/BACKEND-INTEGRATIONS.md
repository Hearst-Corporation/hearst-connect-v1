# Intégrations et gouvernance backend — Sumsub, Fireblocks, HubSpot, Gmail, Settings

Date : 2026-10-07. Pour : l'équipe backend (`Hearst-Corporation/hearst-connect-backend`).

Le front (branche `pierre`) consomme désormais des endpoints que le backend réel ne publie pas encore. Ce document en donne le contrat exact. Le **mock** (`src/app/api/demo-backend/mock-data.js`) en est l'implémentation de référence : chaque forme décrite ici y est jouée et testée de bout en bout.

Le registre des endpoints côté front est `src/lib/backend/endpoints.ts` : un endpoint absent de ce registre ne peut pas être appelé par le front.

---

## 0. Principes

1. **Les secrets restent dans le backend.** Clés API Sumsub, Fireblocks, HubSpot, jetons OAuth Google : rien ne transite par le front, ni dans une réponse, ni dans un log.
2. **La console décide, le tiers exécute.** Un admin autorise, approuve, paie, rend ; le backend crée l'opération chez le tiers (Fireblocks), et c'est le statut **du tiers** qui est relayé, tel quel.
3. **Les verdicts externes arrivent par webhook.** Le KYC/AML (Sumsub) et l'état des transactions (Fireblocks) ne sont jamais posés depuis la console en production.
4. **Le backend est l'autorité des étapes.** Il refuse un saut d'étape, et refuse d'appeler les fonds tant que Sumsub n'a pas validé KYC **et** AML. Le front affiche le refus tel quel (`problem.detail`).
5. Toutes les réponses restent dans l'enveloppe habituelle `{ data, meta }`, chaque bloc en `{ value, status, provenance, freshness }`. Les erreurs en `application/problem+json` (`type, title, status, code, detail, requestId`).

Variables d'environnement à prévoir (noms indicatifs, valeurs jamais commitées) :

```
SUMSUB_APP_TOKEN, SUMSUB_SECRET_KEY, SUMSUB_WEBHOOK_SECRET, SUMSUB_LEVEL_NAME
FIREBLOCKS_API_KEY, FIREBLOCKS_API_SECRET_PATH, FIREBLOCKS_WEBHOOK_PUBLIC_KEY, FIREBLOCKS_BASE_URL
HUBSPOT_PRIVATE_APP_TOKEN
GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET   (envoi Gmail au nom de l'opérateur)
```

---

## 1. Sumsub — KYC & AML

### Ce que le front lit

`GET /api/v1/admin/clients/recent` — chaque client porte désormais :

```jsonc
{
  "kycProvider": "Sumsub",
  "kycStatus": "APPROVED | PENDING | REJECTED | NOT_STARTED",
  "amlStatus": "CLEAR | FLAGGED | null",
  "sumsub": {                       // null tant qu'aucun dossier n'existe
    "applicantId": "a7912ee409b3570440fcb7fb",
    "levelName": "kyb-institutional",
    "reviewAnswer": "GREEN | RED | null",
    "reviewedAt": "2026-10-07T12:00:00Z"
  }
}
```

Le front construit le lien cockpit : `https://cockpit.sumsub.com/checkus#/applicant/{applicantId}/basicInfo`.

### Ce que le backend doit faire

- **Créer l'applicant** à l'acceptation d'une offre (ou plus tôt si le métier le veut), au niveau `SUMSUB_LEVEL_NAME`, et stocker `applicantId` sur le client.
- **Recevoir le webhook** `applicantReviewed` (signature HMAC vérifiée avec `SUMSUB_WEBHOOK_SECRET`) → mettre à jour `kycStatus` (`GREEN` → `APPROVED`, `RED` → `REJECTED`), `amlStatus` (screening AML du même examen), `reviewAnswer`, `reviewedAt`.
- Option : renvoyer au front un lien d'onboarding Sumsub (WebSDK) à glisser dans le courriel de proposition.

### Endpoint de démo uniquement

`POST /api/v1/admin/clients/:id/kyc` `{ kyc, aml }` — joue la décision du partenaire pour la démo guidée. **Ne pas l'exposer en production** : en production, la décision n'arrive que par webhook.

---

## 2. Fireblocks — garde et paiements

Tout ce qui déplace de l'argent passe par Fireblocks. Le backend crée la transaction ; la politique de co-signature (TAP) de Fireblocks la fait signer ; le webhook remonte son statut.

### 2.1 Compte et adresse de dépôt — à l'acceptation de l'offre

Quand une offre passe `sent → accepted`, le backend :

1. crée un **vault account** Fireblocks pour le futur vault du client ;
2. génère une **adresse de dépôt** USDC (réseau à arrêter avec le métier ; le mock dit Ethereum) ;
3. l'expose sur l'offre :

```jsonc
"fireblocks": {
  "vaultAccountId": "4821",
  "asset": "USDC",
  "network": "Ethereum",
  "depositAddress": "0x1fc1…a179"
}
```

Cette adresse est imprimée dans le courriel d'appel de fonds (`src/lib/offers/emails.ts`).

### 2.2 Les transactions — `GET /api/v1/admin/transactions?clientId=`

```jsonc
{
  "transactions": {
    "value": [
      {
        "id": "4f1c2a9e-…",                // id de transaction Fireblocks
        "kind": "deposit | conversion | withdrawal | release | electricity | rebalance | protocol",
        "status": "SUBMITTED | PENDING_AUTHORIZATION | PENDING_SIGNATURE | BROADCASTING | CONFIRMING | COMPLETED | FAILED | REJECTED | CANCELLED",
        "clientId": "cli_new_001",
        "vaultId": "31337-0x…",
        "asset": "BTC | USDC",
        "amount": 0.0614,
        "source": "Vault Orbit Capital",
        "destination": "bc1q…",          // adresse whitelistée du client, du payee, ou poche
        "note": "Bitcoin withdrawal to the client’s whitelisted wallet",
        "createdAt": "…",
        "txHash": "0x… | null",            // présent une fois COMPLETED
        "consoleUrl": "https://console.fireblocks.io/v2/transactions/{id}"
      }
    ],
    "provenance": "fireblocks"
  }
}
```

Le statut est **celui de Fireblocks**, jamais inféré. Le front rafraîchit la page toutes les 5 s tant qu'une transaction n'est pas terminale.

### 2.3 Quels gestes créent quelle transaction

| Geste (front) | Endpoint existant | Transaction Fireblocks |
|---|---|---|
| Fonds reçus | `POST /admin/offers/:id/transition {to:"funds_received"}` | **Détectée**, pas créée : webhook de dépôt entrant sur l'adresse du §2.1. En production, c'est ce webhook qui pose `fundsReceivedAt`, pas un clic. |
| Ouvrir le vault | `… {to:"active"}` | `conversion` — USDC → BTC + poches de la stratégie |
| Approuver un retrait client | `POST /admin/approvals/:id/decision` (`apr_wd_*`) | `withdrawal` — BTC vers l'adresse **whitelistée** du client |
| Approuver un rééquilibrage | idem (`apr_reb_*`) | `rebalance` — appel de contrat |
| Approuver un changement de protocole | idem (`apr_proto_*`) | `protocol` — appel de contrat |
| Payer l'électricité | `POST /mining/electricity/pay {vaultId, month, amount}` | `electricity` — USDC vers le payee |
| Rendre la réserve | `POST /admin/vaults/:vaultId/release` | `release` — BTC vers le client |

Une distribution mensuelle validée (`apr_dist_*`) ne déplace rien : c'est une écriture comptable de la réserve.

### 2.4 Webhook Fireblocks

`TRANSACTION_STATUS_UPDATED` (signature vérifiée avec `FIREBLOCKS_WEBHOOK_PUBLIC_KEY`) → mettre à jour la transaction. Un retrait client n'apparaît **confirmé** dans son journal (`/me/movements`) qu'une fois la transaction `COMPLETED`.

---

## 3. Retrait demandé par le client — `POST /api/v1/me/withdrawals`

Nouveau. Le bouton « Withdraw » de `/account` ne menait nulle part.

```jsonc
// requête
{ "amountBtcSats": 6141688 }
// réponse 200
{ "withdrawal": { "value": { "id": "wd_001", "amountBtcSats": 6141688, "status": "PENDING_APPROVAL", "requestedAt": "…" } } }
```

- Limite (autorité backend) : ce que le client a acquis (rewards validés − retraits approuvés) **moins** les retraits déjà en attente. Refus `422 ABOVE_AVAILABLE`. Un écart de moins de 0.0001 BTC au-dessus du disponible vaut « tout le disponible » (arrondi de saisie à 4 décimales).
- La demande entre dans `GET /admin/approvals` en `kind: "withdrawal"`. Approuvée → transaction Fireblocks (§2.3).
- `GET /me/vault` publie `producedBtc`, `accruedBtc`, `availableUsdc`, `pendingWithdrawalBtc` à l'échelle du vault du client.

---

## 4. Courriels — Gmail + HubSpot — `POST /api/v1/admin/offers/:id/emails/:emailId/send`

`emailId` ∈ `proposal | funding | funded | credentials` (gabarits : `src/lib/offers/emails.ts`).

```jsonc
// requête
{ "to": ["treasury@client.com"], "cc": [], "subject": "…", "body": "…" }
// réponse 200
{ "email": { "value": {
  "offerId": "off_new_001", "emailId": "funding",
  "to": ["treasury@client.com"], "cc": [], "subject": "…",
  "sentAt": "…", "gmailMessageId": "18c…", "hubspotEngagementId": "41000002"
} } }
```

Le backend :

1. **Si l'envoi EST l'étape**, la fait passer d'abord, avec les mêmes règles que `/transition` : `proposal` sur une offre `draft` → `sent` ; `funding` sur une offre `accepted` → `funding`. Si l'étape est refusée (KYC non validé), **rien ne part** et le refus est renvoyé tel quel.
2. **Envoie depuis le Gmail de l'opérateur connecté** (Gmail API, OAuth Google Workspace, scope `gmail.send`).
3. **Consigne dans HubSpot** : engagement e-mail associé au contact (`to`) et au deal de l'offre (créer le deal à la création de l'offre, le faire avancer avec les étapes).
4. Ajoute l'envoi à `offer.sentEmails[]` (même forme que la réponse) : le front affiche « Sent … · Logged in HubSpot #… ».

---

## 5. Santé des intégrations — `GET /api/v1/admin/integrations`

Affichée dans Settings → Integrations.

```jsonc
{ "integrations": { "value": [
  {
    "id": "sumsub | fireblocks | hubspot | gmail",
    "name": "Sumsub",
    "role": "KYC & AML",
    "status": "connected | degraded | disconnected | not_configured",
    "environment": "sandbox | production",
    "lastCallAt": "…",       // dernier appel sortant réussi
    "lastWebhookAt": "…",    // dernier webhook reçu (null si sans objet)
    "detail": "12 applicants approved · decisions arrive by webhook"
  }
] } }
```

Sonde légère par service (ex. Sumsub : `GET /resources/applicants/-/levels` ; Fireblocks : `GET /v1/vault/accounts_paged?limit=1` ; HubSpot : `GET /crm/v3/objects/contacts?limit=1` ; Gmail : validité du jeton de l'opérateur). `not_configured` quand les variables manquent — jamais d'erreur 500.

---

## 6. Rappel — endpoints ajoutés au registre front ces derniers jours

| id | Méthode et chemin | Statut |
|---|---|---|
| `admin-offer-transition` | `POST /admin/offers/:id/transition` | à implémenter (parcours d'offre) |
| `admin-client-kyc` | `POST /admin/clients/:id/kyc` | **démo uniquement** |
| `admin-vault-release` | `POST /admin/vaults/:vaultId/release` | à implémenter + Fireblocks |
| `me-withdrawals` | `POST /me/withdrawals` | à implémenter |
| `admin-transactions` | `GET /admin/transactions` | à implémenter (Fireblocks) |
| `admin-offer-email-send` | `POST /admin/offers/:id/emails/:emailId/send` | à implémenter (Gmail + HubSpot) |
| `admin-integrations` | `GET /admin/integrations` | à implémenter |
| `admin-settings` | `GET /admin/settings` | à implémenter (§7) |
| `admin-settings-change` | `POST /admin/settings/changes` | à implémenter (§7) |
| `admin-settings-decision` | `POST /admin/settings/changes/:id/decision` | à implémenter (§7) |
| `admin-audit` | `GET /admin/audit` | à implémenter (§8) |
| `demo-*` | `/demo/state, start, reset, clock, view-as` | **démo uniquement** — ne pas porter |

---

## 7. Settings — réglages gouvernés

Le front (`/admin/settings`) est piloté par un schéma : `src/lib/settings/schema.ts` définit les 12 sections, leurs champs, leur règle d'approbation et leur délai. Le mock en est l'implémentation de référence (`SETTINGS_BASE`, `SETTINGS_GOV`, `currentSettings()` dans `mock-data.js`).

### 7.1 Les sections

| Section | Forme | Règle | Délai (timelock) |
|---|---|---|---|
| `team` | liste `{ id, name, email, role, twoFactor, status }` | `settings` | 0 |
| `policies` | liste fixe `{ id, label, approvers, roles[], thresholdBtc }` | `risk` | 24 h |
| `security` | objet `{ sso, mfaRequired, sessionHours, ipAllowlist[] }` | `settings` | 0 |
| `terms` | objet `{ minTicketUsdc, lockupOptions[], defaultLockupMonths, rewardsCadence, managementFeeBps, performanceFeeBps }` | `risk` | 24 h |
| `profiles` | liste fixe `{ id, label, miningBps, lendingBps, stableBps }`, chaque ligne = 10 000 | `risk` | 24 h |
| `strategies` | liste `{ id, pocket, protocol, status, capUsd, apyPct, apySource, risk }` | `risk` | 24 h (pause : immédiate) |
| `limits` | objet `{ driftBandBps, maxProtocolExposureBps, maxClientExposureUsd, liquidityBufferBps, guardianPause }` | `risk` | 24 h (gardien ON : immédiat) |
| `addressBook` | liste `{ id, owner, label, asset, network, address }` | `treasury` | 48 h (période de refroidissement) |
| `payees` | liste `{ id, name, purpose, asset, address, schedule }` | `treasury` | 48 h |
| `compliance` | objet `{ level, reverifyMonths, blockedJurisdictions[], amlBlockAt, blockOnFlag }` | `settings` | 0 |
| `templates` | liste fixe `{ id, label, subject, hubspotStage, intro }` | `settings` | 0 |
| `notifications` | liste `{ id, event, notify[], channels[] }` | `settings` | 0 |

### 7.2 `GET /api/v1/admin/settings`

```jsonc
{ "settings": { "value": {
  "values": { "team": [...], "terms": {...}, ... },      // EN VIGUEUR : délais passés inclus, changements programmés exclus
  "changes": [ /* SettingsChange, du plus récent au plus ancien */ ],
  "approverRoles": { "settings": ["Admin","Risk","Compliance"], "risk": ["Admin","Risk"], "treasury": ["Admin","Finance"] }
} } }
```

`SettingsChange` : `{ id, section, reason, author, createdAt, status: pending|scheduled|applied|rejected|cancelled, required, approvals: [{ by, at }], rejectedBy, effectiveAt, before, after }`.

### 7.3 `POST /api/v1/admin/settings/changes`

`{ section, value, reason }` — `value` est la section ENTIÈRE après modification. L'auteur est l'utilisateur du jeton (le mock le lit dans `author`, la démo n'ayant qu'une session).

Refus : `400 UNKNOWN_SECTION`, `400 NO_CHANGE` (valeur identique), `409 CHANGE_PENDING` (une demande attend déjà sur la section), `422 ALLOCATION_NOT_100` (profils). À ajouter côté backend : validation de schéma stricte par section (Zod), adresses valides par réseau, `approvers ≥ 1`.

`required` = `policies[<règle de la section>].approvers` au moment de la demande.

### 7.4 `POST /api/v1/admin/settings/changes/:id/decision`

`{ decision: "approve" | "reject" | "cancel" }`. Le décideur est l'utilisateur du jeton (la démo passe `by`).

- **Quatre yeux** : l'auteur ne peut ni approuver ni refuser → `403 FOUR_EYES`.
- **Rôle** : le rôle du décideur doit figurer dans `policies[<règle>].roles` → `403 ROLE_NOT_ALLOWED`. Membre inactif → `403 NOT_A_MEMBER`.
- Un membre n'approuve qu'une fois → `409 ALREADY_APPROVED`.
- Approbations suffisantes → `applied` si le délai de la section est 0, sinon `scheduled` avec `effectiveAt = maintenant + délai`. **Exceptions immédiates** : `limits.guardianPause` passé à `true`, et une modification de `strategies` qui ne fait que mettre des protocoles en pause.
- `cancel` : l'auteur sur une demande `pending`, ou n'importe quel approbateur sur une demande `scheduled` dont le délai n'est pas passé (`409 NOT_CANCELLABLE` sinon).
- Le passage `scheduled → applied` doit être fait par un job (cron) à `effectiveAt`, pas paresseusement à la lecture comme dans le mock.

### 7.5 Ce que les réglages doivent COMMANDER (et pas seulement afficher)

| Réglage | Effet attendu |
|---|---|
| `terms.minTicketUsdc` | `POST /admin/offers` refuse en dessous (`400 BELOW_MINIMUM`) — fait dans le mock. |
| `terms.*`, `profiles` | Une offre enregistre la **version** des termes avec laquelle elle naît (`termsVersion`) et ne change plus ensuite. |
| `limits.driftBandBps` | Seuil de dérive des nouveaux vaults — fait dans le mock. |
| `limits.guardianPause` | Toute approbation de rééquilibrage ou de changement de protocole répond `423 GUARDIAN_PAUSE` — fait dans le mock. Le keeper ne propose plus rien. |
| `strategies` | Un protocole `paused` ou au-delà de `capUsd` ne reçoit plus d'allocation ; `maxProtocolExposureBps` borne chaque vault. |
| `policies` | **À appliquer aux décisions métier** (`/admin/approvals/:id/decision`) : nombre d'approbateurs, rôles, seuil BTC (`withdrawal-large` au-delà de `thresholdBtc`). Aujourd'hui une seule approbation suffit partout. |
| `policies` + `addressBook` + `payees` | **Synchronisés avec Fireblocks** : la politique de transaction (TAP) reflète `policies`, la whitelist reflète `addressBook`/`payees`. Un retrait ne peut partir que vers une adresse active du carnet. |
| `security` | SSO Google Workspace, 2FA obligatoire, durée de session, IP allowlist — appliqués au login et à chaque requête. |
| `compliance` | Niveau Sumsub à la création d'applicant, re-vérification périodique, juridictions refusées, gel automatique sur nouveau signalement (webhook `applicantOnHold`). |
| `templates` | Objet, ligne d'ouverture et étape HubSpot de chaque courriel du parcours (§4). |
| `notifications` | Routage des alertes (Slack, e-mail, SMS) par événement et par rôle. |
| `team` | Comptes et rôles de la console ; le rôle porté par le jeton est celui de `team`. |

## 8. Journal d'audit — `GET /api/v1/admin/audit?limit=`

```jsonc
{ "audit": { "value": [
  { "id": "…", "at": "…", "actor": "Sarah Klein", "action": "Approved a change", "target": "Product terms",
    "detail": null, "category": "settings | decision | offer | payment | email | compliance | client" }
] } }
```

- **En ajout seul** : une table dédiée, jamais mise à jour ni supprimée ; idéalement chaînée (hash de l'entrée précédente) pour qu'une altération se voie.
- Chaque écriture métier y ajoute sa ligne **dans la même transaction** que l'écriture elle-même.
- Le mock la **déduit** de l'état (changements, décisions, étapes d'offre, transactions, courriels, KYC, retraits) ; le backend doit l'**écrire**.
- Filtrage serveur à prévoir (`category`, `actor`, `from`, `to`) et export CSV signé pour les auditeurs.
