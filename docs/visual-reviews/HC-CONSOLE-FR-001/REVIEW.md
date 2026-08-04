# HC-CONSOLE-FR-001 — revue visuelle

Branche `remediation/audit-2026-08-03`, départ `6c5507f`. Doctrine §1 (français).
Glossaire : `docs/design-system/CONSOLE-FR-GLOSSARY.md`.
Serveur `next dev 16.2.12` @ localhost:3000, backend réel.

## Ce que les captures prouvent

La console d'administration est **intégralement en français**, sans état mixte.
Vérifié par balayage navigateur des **17 routes admin actives** : 0 résidu
anglais d'interface.

- **admin-desktop / laptop / mobile** — accueil : nav (Accueil, Clients,
  Conformité, Opérations, Administration, Couverture des données, Exécution),
  KPI (Coffres actifs, Mouvements récents, Sources en direct, Valeur du
  patrimoine), badges d'état **En direct / Référence / Indisponible**,
  « File de décisions », « Se déconnecter », « Rôle : OWNER », libellés
  d'événements FR (Métriques de minage transmises, Dépôt, Électricité payée),
  « Anomalies clients / adrien · aucun dossier investisseur », « il y a 7 j ».
  Déconnexion visible sur mobile (UI-02 préservé).
- **dashboard-fr** — Servi / Partiel / Non ouvert / Taux de couverture.
- **operations-fr** — indexeur affiché **STALLED** (code technique conservé),
  KPI et journal en français.
- **vaults-table-fr** — en-têtes Coffre / Client / État / Valeur totale /
  Déployé / Disponible / Stratégies / Écart d'allocation / Dernier
  rééquilibrage / Action en attente. `scope`/`caption` conservés (a11y).
- **runtime-fr** — Version 0.1.0 / Chaîne 31337 (BAPI-03 préservé).
- **chart-fr** — quand la donnée manque, état nommé (« indisponible »), jamais
  de fausse courbe.
- **form-fr** — formulaire keeper (Field/Label Catalyst), confirmation FR, mot
  technique CONFIRM conservé.
- **unavailable-fr / error-fr** — états honnêtes en français.

## Véracité préservée (aucune régression P0)

La traduction ne touche QUE la présentation : les codes de statut techniques
(LIVE, UNAVAILABLE, STALLED, NOT_CONFIGURED, rpc_error), les identifiants
(chainId, 0x…, Series 1, requestId), unités (BTC, bps, pt, %) et les `reason:`
snake_case restent inchangés. Une absence reste une absence nommée
(Indisponible / Non configuré / Non renseigné), jamais convertie en 0 ni en
« En direct ». Les 231 tests (dont la véracité VER-01..05) restent verts.

## Contrats préservés

Catalyst intact (aucune primitive réécrite). Accent mint unique. Contrat de
thème inchangé (console dark-only). Aucune donnée de démonstration injectée.

## Console / réseau

Toutes les routes admin : **0 erreur console** (e2e). `<html lang="fr">`.

## Limites

`formatRelativeTime` traduit (« il y a 7 j ») ; les libellés d'événements et
d'anomalies traduits au glossaire. La vitrine publique était déjà française et
ne régresse pas. Test lecteur d'écran non inclus.
