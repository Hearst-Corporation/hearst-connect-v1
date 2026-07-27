# HC-AUTH-001 — Revue navigateur & preuves visuelles

- **Date** : 2026-07-27T19:13:30Z
- **Frontend** : commit `7471f39505b05c7502bfaf96f0212fbb6bc80996`, `http://localhost:3000`, `NODE_ENV=development`
- **Backend** : `https://hearst-connect-backend-production.up.railway.app` (production, `serviceVersion` 0.1.0)
- **Outil** : Chromium piloté par Playwright MCP
- **Résultat global** : 9 étapes sur 9 en PASS, 0 erreur console, 0 fuite de token détectée.

## Parcours

| # | Étape | Résultat | Preuve |
|---|-------|----------|--------|
| 1 | Accès anonyme à `/admin` | **PASS** | Redirection vers `/login?reason=expired` |
| 2 | Capture page de login | **PASS** | `login-desktop-1440x900.png` |
| 3 | Login avec mauvais mot de passe | **PASS** | Message « E-mail ou mot de passe incorrect. » — français, générique, aucun détail technique. Champs vidés. `login-error-1440x900.png` |
| 4 | Login réel compte Owner | **PASS** | Redirection vers `/admin`, titre « Vue d'ensemble · Hearst Connect » |
| 5 | Chargement du dashboard | **PASS** | 26 endpoints au registre, `/health` HTTP 200 (511 ms), `/ready` HTTP 200 (497 ms), `/api/v1/runtime` HTTP 200 (780 ms), identité « adrien / rôle OWNER ». `admin-authenticated-1440x900.png` |
| 6 | Rafraîchissement | **PASS** | Toujours sur `/admin`, aucun retour au login |
| 7 | Captures mobile 375x812 | **PASS** | `login-mobile-375x812.png` (déconnecté), `admin-mobile-375x812.png` (connecté) |
| 8 | Logout | **PASS** | Redirection vers `/login` |
| 9 | `/admin` après logout | **PASS** | Redirection vers `/login?reason=expired` — accès refusé |

## Cookie de session

Le cookie `hearst_session` n'est pas lisible depuis JavaScript (`document.cookie` renvoie une
chaîne vide sur `/admin` authentifié) — la preuve directe que `httpOnly` est effectif. Ses
attributs déclarés proviennent de `src/lib/session.ts` (lignes 118-131), source de vérité du
`Set-Cookie` :

| Attribut | Valeur | Note |
|----------|--------|------|
| `name` | `hearst_session` | |
| `httpOnly` | `true` | Confirmé côté navigateur : invisible à JS |
| `secure` | `false` en local | Conditionné à `process.env.NODE_ENV === 'production'`. Comportement voulu ; **pas un échec**. Voir limites. |
| `sameSite` | `lax` | |
| `path` | `/` | |
| `maxAge` | `session.expiresAt - now` | Dérivé de l'expiration du jeton backend, pas d'une constante |

**Cohérence du TTL** — vérifiée et conforme. Connexion à 19:11:53Z ; le dashboard affiche
« Valide jusqu'au 2026-07-27T20:11:53.000Z », soit exactement **3600 s / 1 heure**. Le cookie
meurt donc avec le jeton backend. Aucune durée fixe de 7 jours n'apparaît, ni dans le
comportement observé ni dans le code.

## Vérification anti-fuite

Recherche menée sur la page `/admin` en session authentifiée.

| Emplacement | Résultat |
|-------------|----------|
| HTML (`document.documentElement.outerHTML`, 41 805 caractères) | `backendToken` : 0 · `eyJ` : 0 · `Bearer ` : 0 · `hearst_session` : 0 · `accessToken` : 0 |
| `localStorage` | Une seule clé : `theme` = `"dark"` — légitime |
| `sessionStorage` | Vide |
| `document.cookie` | Chaîne vide |
| URL | `http://localhost:3000/admin` — aucun paramètre |
| Captures PNG | Les 5 fichiers grepés contre la valeur du mot de passe : 0 occurrence |

**0 occurrence, conforme à l'attendu.** Le dashboard n'expose que l'existence de la session
(badge « Live ») et sa date d'expiration ; la valeur du jeton n'apparaît nulle part. La section
« Configuration serveur » affiche les noms de variables et leur état, jamais leur valeur.

## Console

**0 erreur.** Un avertissement unique et non fonctionnel :

```
The resource http://localhost:3000/_next/static/chunks/src_styles_tailwind_*.css
was preloaded using link preload but not used within a few seconds from the window's load event.
```

C'est du bruit du serveur de développement Next.js (préchargement CSS), absent d'un build de
production. Les autres messages sont `React DevTools`, `[HMR] connected` et `[Fast Refresh]`.

## Limites honnêtes de cette vérification

- **`secure=false` non testable en conditions réelles.** Le parcours s'est déroulé en
  `NODE_ENV=development` sur `http://localhost`. Que le drapeau bascule bien à `true` en
  production est lu dans le code, pas observé sur un déploiement HTTPS.
- **Attributs du cookie lus en source, pas capturés sur le fil.** `httpOnly` étant effectif, la
  page ne peut pas énumérer le cookie ; l'API de contexte Playwright n'a pas pu être invoquée
  depuis cet environnement MCP. `httpOnly` et le TTL sont donc prouvés par observation indirecte
  (invisibilité à JS, date d'expiration affichée par le dashboard) et les autres attributs
  (`sameSite`, `path`) par lecture de `src/lib/session.ts`. Ils n'ont pas été relevés sur un
  en-tête `Set-Cookie` brut.
- **`commitSha` du backend indisponible.** `GET /api/v1/runtime` renvoie `commitSha: null` — le
  champ existe mais n'est pas renseigné par le déploiement Railway courant. Reporté comme `null`
  dans le manifeste plutôt que deviné.
- **Expiration réelle du jeton non attendue.** Le TTL d'une heure est vérifié par calcul sur la
  date annoncée, pas en laissant la session expirer pour observer la déconnexion.
- **Aucune suite de tests automatisés** dans ce repo (conforme au CLAUDE.md) : la couverture
  repose entièrement sur ce parcours manuel piloté.
- **Périmètre** : authentification et session uniquement. Les 26 endpoints du registre n'ont pas
  été exercés un à un ; seuls `/health`, `/ready` et `/api/v1/runtime` ont été observés via le
  rendu du dashboard.
