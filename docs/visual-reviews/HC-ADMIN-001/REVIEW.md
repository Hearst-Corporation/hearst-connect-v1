# HC-ADMIN-001 — revue visuelle

Captures prises sur `pnpm dev`, branche `feat/hc-admin-001-backend-admin-layout`,
contre le backend de production `https://connect-api.hearst.app`.
**Console navigateur vierge sur les six captures.**

## Ce qui est authentique

Les trois sondes publiques (`/health`, `/ready`, `/api/v1/runtime`) répondent
réellement : HTTP 200, `X-Request-Id` et `X-RateLimit-Remaining` visibles dans
la trace d'appel de chaque section. Aucune donnée n'a été fabriquée pour ces
captures, et aucun serveur de test n'a été utilisé.

Les routes authentifiées affichent « non configuré » parce que
`SESSION_SIGNING_KEY` — secret du backend — n'est pas disponible sur ce poste.
Cet état est le comportement correct du contrat, pas un placeholder : le
frontend refuse d'inventer une donnée qu'il ne peut pas obtenir.

## Captures

| Fichier | Route | Ce qu'elle démontre |
|---|---|---|
| `desktop-1440x900.png` | `/admin` | Registre à 26 endpoints, sondes live, navigation en trois groupes |
| `laptop-1280x800.png` | `/admin/api-explorer` | Registre complet, par catégorie, avec cURL expurgé |
| `mobile-375x812.png` | `/admin` | Navigation fermée, barre supérieure mobile |
| `mobile-drawer-375x812.png` | `/admin` | Tiroir ouvert |
| `vault-not-configured-1440x900.png` | `/admin/vault` | État de contrat honnête ; aucun index de stratégie inventé |
| `keeper-disabled-1440x900.png` | `/admin/keeper` | Fail-closed : actions inertes, aucun hash de transaction |

## Limites assumées

Les états `LIVE` sur données métier ne sont pas capturés : ils exigent
`SESSION_SIGNING_KEY` et un compte backend réel. Les produire aurait demandé un
serveur de simulation — la mission l'autorise pour les tests, mais interdit de
présenter sa sortie comme une preuve de backend live. Nous avons préféré ne pas
en produire plutôt que d'en produire une ambiguë.
