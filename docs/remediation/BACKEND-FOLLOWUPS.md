# Suites backend — constats BLOCKED_FRONTEND

> Constats de l'audit 2026-08-03 qui NE PEUVENT PAS être corrigés depuis ce
> frontend : ils dépendent d'un mécanisme, d'un endpoint ou d'un état côté
> backend (`Hearst-Corporation/hearst-connect-backend`). Aucune fausse donnée
> frontend n'est fabriquée pour les masquer — l'état réel reste affiché
> honnêtement (« unavailable », statut nommé).

## SEC-07 — Révocation de session après déconnexion

**État : BLOCKED_EXTERNAL.**

**Constat.** Un cookie capturé AVANT la déconnexion reste valide après : `endSession()`
supprime le cookie côté navigateur (`cookies().delete`), mais rien n'invalide la
session/le jeton porteur côté serveur. Un attaquant qui a copié le cookie garde
l'accès jusqu'à l'expiration du jeton backend.

**Preuve que c'est bloqué côté frontend (sondes réelles, 2026-08-04) :**
- Registre `src/lib/backend/endpoints.ts` : aucun endpoint `logout` / `revoke` / `signout`.
- `POST {HEARST_API_URL}/api/v1/auth/logout` → **HTTP 404**.
- `POST {HEARST_API_URL}/api/v1/auth/revoke` → **HTTP 404**.

Cette architecture est volontairement sans état serveur (cookie autonome chiffré,
SEC-02). Une révocation réelle exige l'UNE des deux capacités, toutes deux backend :

**Contrat backend requis (au choix) :**
1. **Endpoint de révocation de jeton.** `POST /api/v1/auth/logout` (Bearer), qui
   ajoute le jeton à une liste de révocation côté backend et le refuse ensuite.
   Le frontend appellerait cet endpoint dans `logout()` avant de supprimer le cookie.
2. **Introspection de jeton / jti + liste de révocation.** Le backend expose un
   identifiant de jeton révocable (`jti`) et vérifie une liste de révocation à
   chaque appel authentifié.

**Ce que le frontend fera dès que (1) existe :** dans `src/lib/actions.ts`
(`logout`) et `src/lib/session.ts` (`endSession`), émettre l'appel de révocation
backend avant d'effacer le cookie ; en cas d'échec de l'appel, effacer quand même
le cookie (déconnexion locale garantie) mais journaliser l'échec de révocation.

**Mitigation frontend déjà en place (n'est PAS une révocation) :** l'expiration du
cookie est alignée sur celle du jeton backend (`startSession`), donc la fenêtre
d'exposition est bornée par la durée de vie du jeton — elle n'est pas réduite à zéro.

---

## BAPI-14 — État réel du backend (indexeur STALLED, patrimoine illisible)

**État : BLOCKED_EXTERNAL (état de données, pas un défaut de code).**

L'indexeur backend était STALLED et le snapshot du coffre en `rpc_error` au moment
de l'audit. Le frontend l'affiche désormais honnêtement (Lot 1 : « unavailable »,
jamais « 0 ● Live »). La remise en marche de l'indexeur et de la source RPC est
une opération backend/infra. Aucun correctif frontend possible ni souhaitable.

---

## BAPI-09 — Anti-force-brute permissif sur /api/v1/auth/login

**État : BLOCKED_EXTERNAL.**

La limitation de débit sur l'authentification est appliquée par le backend
(1 seul 429 sur 85 tentatives observées). Le frontend ne peut pas imposer un
rate-limit d'authentification fiable (contournable en appelant le backend
directement). À traiter côté backend (rate-limit par IP/compte, backoff).
