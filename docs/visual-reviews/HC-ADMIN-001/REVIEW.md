# HC-ADMIN-001 — revue visuelle

Captures prises sur `pnpm dev`, branche `feat/hc-admin-001-backend-admin-layout`,
contre le backend canonique `https://hearst-connect-backend-production.up.railway.app`.
**Console navigateur vierge sur les six captures.**

## Ce qui est authentique

Les trois sondes publiques (`/health`, `/ready`, `/api/v1/runtime`) répondent
réellement : HTTP 200, `X-Request-Id` et `X-RateLimit-Remaining` visibles dans
la trace d'appel de chaque section. Aucune donnée n'a été fabriquée pour ces
captures, et aucun serveur de test n'a été utilisé.

**Le bridge authentifié est vérifié.** `SESSION_SIGNING_KEY` a été alignée sur
la valeur du service Railway `hearst-connect-backend` : le backend accepte le
jeton Bearer et répond HTTP 200 sur `/api/v1/dashboard`
(`dashboard-authenticated-1440x900.png`, trace `req 294bde13… · quota 118`).

Le « Non configuré » qui s'affiche alors n'est plus une absence de clé côté
frontend : c'est le `meta.status` calculé par le backend lui-même, avec sa
raison `see per-field reason in data`, transmis sans requalification.

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

Aucun état `LIVE` sur données métier n'est capturé — non par défaut de
configuration, mais parce que le backend lui-même renvoie aujourd'hui
`NOT_CONFIGURED` sur l'agrégat investisseur (contrat non déployé, indexeur
absent). Le frontend le rend tel quel. Ces captures montreront `LIVE` dès que le
backend le renverra, sans aucune modification du frontend.
