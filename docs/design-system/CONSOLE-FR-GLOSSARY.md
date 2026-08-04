# Glossaire canonique — console d'administration (français)

> Mission HC-CONSOLE-FR-001. La doctrine fixe le **français** comme langue
> produit (`HEARST-CONNECT-V1-DESIGN-SYSTEM-DOCTRINE.md` §1). Ce glossaire est la
> source unique de traduction : un même concept a **une seule** traduction dans
> toute la console. Ancré sur le français déjà présent (vitrine, `mouvements.ts`).
>
> Règle : on traduit la **présentation utilisateur**, jamais l'identifiant
> technique interne, l'unité, le symbole, le code réseau ni la valeur backend.

## Navigation & shell

| EN | FR canonique | Contexte |
|----|--------------|----------|
| Home | Accueil | rail, destination principale |
| Clients | Clients | (inchangé) |
| Compliance | Conformité | |
| Operations | Opérations | |
| Administration | Administration | (inchangé) |
| Data coverage | Couverture des données | surface |
| Runtime | Exécution | état du service |
| Surfaces | Surfaces | (inchangé) |
| Sign out | Se déconnecter | action de déconnexion |
| Role | Rôle | |
| Account | Compte | |
| Secondary screens | Écrans secondaires | |
| cockpit (label aria de shell) | poste de pilotage | ex. « poste de pilotage bitcoin » |

## Statuts (présentation ; l'identifiant technique reste inchangé)

| Identifiant technique (inchangé) | Présentation FR |
|----------------------------------|-----------------|
| live | En direct |
| loading | Chargement |
| empty | Aucune donnée |
| partial | Partiel |
| error | Erreur |
| unavailable | Indisponible |
| not_configured | Non configuré |
| stale | Données obsolètes |
| simulated | Simulé |
| reference (éditorial) | Référence |
| Served | Servi |
| Not open / Not yet open | Non ouvert |
| Reachable | Joignable |
| Not reported | Non renseigné |
| Configured | Configuré |
| Not set | Non défini |
| Not exposed | Non exposé |

## Domaine métier (coffres, capital, mining, produit)

| EN | FR canonique | Note |
|----|--------------|------|
| Vault | Coffre | ex. « registre des coffres » |
| Vault registry | Registre des coffres | |
| Estate | Patrimoine | |
| Estate value | Valeur du patrimoine | |
| Active vaults | Coffres actifs | |
| Vaults listed | Coffres répertoriés | |
| Movements / Recent movements | Mouvements / Mouvements récents | libellés déjà FR dans mouvements.ts |
| Indexed movements | Mouvements indexés | |
| Pockets / Pockets measured | Poches / Poches mesurées | |
| Reserve split | Répartition de la réserve | |
| Curve points / Curve milestones | Points de courbe / Jalons de courbe | |
| Coverage / Coverage ratio | Couverture / Taux de couverture | |
| Total surfaces | Surfaces totales | |
| Deployed / Available capital | Capital déployé / Capital disponible | |
| Deployment ratio | Taux de déploiement | |
| Denomination | Dénomination | |
| Live sources | Sources en direct | |
| Client exceptions | Anomalies clients | |
| Strategies / Strategy pockets | Stratégies / Poches de stratégie | |
| Allocation drift | Écart d'allocation | |
| Last rebalance | Dernier rééquilibrage | |
| Rebalancing / Rebalancing queue | Rééquilibrage / File de rééquilibrage | |
| Deployment queue | File de déploiement | |
| Hashrate | Hashrate | terme technique conservé |
| Produced BTC / Bitcoin produced | BTC produit | |
| Monthly bill | Facture mensuelle | |
| Attestations | Attestations | |
| Coverage threshold | Seuil de couverture | |
| Reserve / Exposure | Réserve / Exposition | |
| Fund cap | Plafond du fonds | |
| Minimum deposit | Dépôt minimum | |
| Duration / Product duration | Durée / Durée du produit | |
| Runs (backtest) | Exécutions | |
| Historical curve | Courbe historique | |
| Registry | Registre | |
| Movement types | Types de mouvement | |
| Latest | Dernier | |
| Types | Types | |
| Financial entries | Écritures financières | |
| Source status / Source health | État de la source / Santé des sources | |
| Ledger / Ledger status | Journal / État du journal | |
| Indexer / Scheduler | Indexeur / Ordonnanceur | |
| Database | Base de données | |
| Contract | Contrat | |
| Environment | Environnement | |
| Version / Chain | Version / Chaîne | |
| Uptime | Disponibilité | |
| Health / Ready / Liveness / Readiness | Santé / Prêt / Vivacité / Disponibilité | |

## API explorer & keeper

| EN | FR canonique |
|----|--------------|
| API explorer | Explorateur d'API |
| Total endpoints | Total des points d'accès |
| Safe reads | Lectures sûres |
| AI context | Contexte IA |
| Actions / Actions with side effects | Actions / Actions à effet de bord |
| Base URL / Backend URL | URL de base / URL du backend |
| Run | Exécuter |
| Submit request | Envoyer la requête |
| Authorization | Autorisation |
| Admin access / Restricted | Accès administrateur / Restreint |
| Keeper enabled | Keeper activé |
| Explicit CONFIRM required | Confirmation explicite requise |
| Keeper | Keeper (terme produit conservé) |

## Actions & états d'interface communs

| EN | FR |
|----|----|
| Try again | Réessayer |
| Loading surface… | Chargement de la surface… |
| Review pending / No pending review | Revue en attente / Aucune revue en attente |
| Operational view | Vue opérationnelle |
| Inspect vault | Inspecter le coffre |
| Open | Ouvrir |
| No data for this period | Aucune donnée pour cette période |
| Waiting on the source | En attente de la source |
| Data unavailable | Donnée indisponible |
| This surface could not be displayed | Cette surface n'a pas pu être affichée |
| Reference (label technique de trace) | Référence |

## À NE PAS traduire (identifiants / techniques)

- Codes de statut backend bruts : `LIVE`, `UNAVAILABLE`, `STALLED`, `rpc_error`,
  `NOT_REPORTED`, `CONFIGURED`, etc. (affichés tels quels comme codes techniques).
- Symboles et unités : `₿`, `BTC`, `USDC`, `bps`, `pt`, `TH`, `%`.
- Identifiants : adresses `0x…`, `chainId`, `requestId`, `vaultId`, `Series 1`.
- Noms de protocoles / champs d'API : `GET /api/v1/…`, `Bearer`, `X-Request-Id`.
- Marque : `Hearst Connect`.
- `Keeper`, `Hashrate` : termes produit/techniques conservés (usage établi).

## Cohérence

Un concept = une traduction. En cas de doute, ce fichier fait foi. Toute
exception (terme anglais conservé) doit être justifiée ici.
