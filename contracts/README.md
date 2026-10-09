# Registre de réserve Hearst — smart contract

Chaque mois clôturé, Hearst publie sur Ethereum une **attestation** de la réserve de ses clients. Elle comprend :

- les totaux publics du mois : bitcoin miné, frais Hearst, part vendue pour recharger les buffers d'électricité, part versée aux réserves, réserves cumulées, nombre de vaults ;
- une **racine Merkle**, une empreinte unique de toutes les lignes par vault ;
- l'**empreinte du rapport PDF** du mois.

Chaque client reçoit sa ligne et une **preuve**. N'importe qui peut alors vérifier sur la chaîne que cette ligne fait partie de l'attestation (`verifyVault`), sans que les montants des autres clients ni leur identité soient publiés.

Le contrat **ne détient aucun fonds**. Il sert de registre public, horodaté et infalsifiable. Une erreur ne s'efface pas : elle se corrige par une nouvelle révision, signée par la gouvernance, avec un motif public. L'ancienne version reste lisible.

---

## Les règles que le contrat applique

Elles sont fixées au déploiement et ne changent plus (`FEE_BPS`, `REFILL_CAP_BPS`) :

| Règle | Valeur V2 | Vérifiée où |
|---|---|---|
| Frais Hearst | 15 % du miné **net d'électricité** ; zéro si le mois perd | chaque ligne (`lineFollowsRules`) et les totaux (`publish`) |
| Répartition | miné = frais + recharge du buffer + versé à la réserve | ligne et totaux |
| Recharge du buffer | au plus 50 % du miné du mois | ligne et totaux |
| Continuité | réserve du mois = réserve précédente + versé à la réserve − versé au client | `verifyContinuity`, sur deux mois d'un même vault |
| Face au simple achat | (réserve + déjà versé + buffer restant) ÷ ce qu'aurait acheté le dépôt | `vsHoldBps` (10 700 = 107 %) |
| Montants en dollars | facture d'électricité et buffer en USDC = leurs montants en sats au cours de clôture du mois (à 1 sat près) | `lineMatchesPrice`, appelée par `verifyVault` ; le cours est publié dans les totaux (`btcCloseUsdE8`) |

`verifyVault` ne répond `true` que si la ligne est dans l'attestation **et** respecte ces règles : une ligne aux frais gonflés est refusée même si Hearst l'a publiée. Le buffer d'électricité restant (en USDC, au client) entre dans `vsHoldBps`, converti en sats au cours de clôture.

## Les chiffres de chaque vault dans l'espace client

L'espace client n'affiche pas les chiffres d'un vault tels que le backend les donne. Il les fait d'abord **vérifier par le registre**.

1. Le backend remet, pour chaque vault du client et chaque mois attesté, la ligne (`VaultLine`, en satoshis) et sa preuve Merkle (`GET /api/v1/me/attestations`).
2. L'application appelle `verifyVault(période, ligne, preuve)` pour chaque ligne (`src/lib/chain/reserve-registry.ts`). Une ligne refusée n'est jamais affichée.
3. Sur la dernière ligne vérifiée, elle lit `vsHoldBps` et la date de publication (`attestation`).

| À l'écran | Vient de |
|---|---|
| Réserve | `reserveSats` de la dernière ligne vérifiée |
| Bitcoin produit | somme des `toReserveSats` des mois vérifiés |
| Déjà retiré | `withdrawnTotalSats` |
| « If bought that day » (simple achat) | `holdSats` |
| Face au simple achat | `vsHoldBps`, calculé par le contrat (buffer compté en sats au cours de clôture) |
| Détail d'un mois (relevé, distributions) | `minedSats`, `feeSats`, `refillSats`, `toReserveSats` |
| Buffer d'électricité (USDC), facture du mois | `bufferUsdc`, `electricityUsdc`, recoupés avec les sats au cours de clôture |
| « Verified on Ethereum to <mois> » | le dernier mois vérifié |
| Disponible au retrait | réserve vérifiée − retraits en attente (le backend) |

Restent au backend ce qui n'existe pas sur la chaîne : les dates (dépôt, blocage), les retraits en attente, le mois en cours tant qu'il n'est pas attesté.

`scripts/demo-chain.mjs` déploie les deux contrats, publie chaque mois de la démo (22 mois, novembre 2024 → août 2026, 6 vaults) et les relevés du réseau, puis affiche les variables à configurer.

## L'économie du minage on-chain — `HearstMiningOracle`

Le bloc **Mining Economics** de l'espace client est lu dans ce contrat, chiffre par chiffre. Le contrat n'affiche pas un coût que Hearst lui aurait donné : il le **calcule** à chaque lecture (`economics()`), à partir de trois sources.

| Source | Ce qu'elle apporte | Qui l'écrit |
|---|---|---|
| Relevés du réseau | difficulté, hashrate mesuré, hauteur du dernier bloc, frais moyens par bloc | la clé opérationnelle (`PUBLISHER_ROLE`), via `script-js/publish-network.mjs` (mempool.space) |
| Cours BTC/USD | le prix du bitcoin | un flux **Chainlink** s'il est branché au déploiement ; sinon il est publié avec les relevés (Coinbase) |
| Paramètres du parc | électricité ($/kWh), rendement (J/TH), coût machine par TH/s, amortissement, fraîcheur maximale | la gouvernance (`setTerms`), avec un événement public à chaque changement |

Les calculs du contrat :

- **récompense d'un bloc** = subvention à cette hauteur (halvings compris) + frais moyens ;
- **bitcoin produit par TH/s et par jour** = 1e12 × 86 400 ÷ (difficulté × 2³²) × récompense ;
- **hashprice** = ce bitcoin × 1 000 (PH/s) × cours ;
- **coût d'un bitcoin** = (électricité d'un TH/s par jour + machine amortie par jour) ÷ bitcoin produit par jour. L'électricité seule est aussi exposée (`energyCostPerBtcUsdE8`) ;
- **marge** = cours − coût, en dollars et en points de base ;
- **`stale`** passe à vrai si un relevé ou le cours a plus de `maxAge` secondes. L'espace client l'écrit alors en pied de bloc.

Relevés du 9 octobre 2026 : difficulté 132,72 T, cours 82 500 $, 11 J/TH à 0,065 $/kWh. Le contrat calcule un coût de **52 022 $** par bitcoin, dont 35 951 $ d'électricité, une marge de +30 478 $ (36,9 %) et un hashprice de 39,38 $ par PH/s et par jour.

```bash
# déploiement (mêmes rôles que le registre)
REGISTRY_ADMIN=… REGISTRY_PUBLISHER=… BTC_USD_FEED=… \
  forge script script/DeployMiningOracle.s.sol --rpc-url sepolia --account hearst-deployer --broadcast --verify

# publication des relevés (toutes les heures, par cron ou launchd)
cd script-js
MINING_ORACLE_ADDRESS=0x… node publish-network.mjs --rpc-url $SEPOLIA_RPC_URL --account hearst-publisher
node publish-network.mjs --dry-run      # lit les relevés sans rien envoyer

# lecture
cast call $MINING_ORACLE_ADDRESS "economics()" --rpc-url sepolia
```

Côté application, `HEARST_CHAIN_RPC_URL` et `HEARST_MINING_ORACLE_ADDRESS` (voir `.env.example` à la racine) branchent le bloc sur le contrat. Le lecteur est `src/lib/chain/mining-oracle.ts`. Le cours du contrat sert aussi à toutes les conversions en dollars de l'espace client.

## 1. Les notions en cinq minutes

| Notion | Ce que c'est ici |
|---|---|
| **Smart contract** | Un programme déployé à une adresse sur Ethereum. Son code et ses données sont publics, et on ne peut plus le modifier une fois déployé. |
| **Transaction** | Une écriture (déployer, publier un mois). Elle est signée par une clé privée et coûte du *gas*, payé en ETH. |
| **Appel en lecture** | Une lecture (`attestation`, `verifyVault`). C'est gratuit et sans clé. |
| **Rôles** | `DEFAULT_ADMIN_ROLE` gère les rôles et publie les corrections : ce sera un multisig. `PUBLISHER_ROLE` publie chaque mois : c'est la clé opérationnelle. |
| **Racine Merkle** | Une empreinte de 32 octets qui résume toutes les lignes. Changer un seul satoshi d'une seule ligne change la racine. |
| **Preuve Merkle** | Quelques empreintes qui relient *une* ligne à la racine. Elles ne révèlent rien des autres lignes. |
| **vaultKey** | `keccak256(sel secret ‖ identifiant du vault)`. Sans le sel, impossible de relier une clé à un client. |
| **Sepolia** | Le réseau de test d'Ethereum : même fonctionnement, ETH gratuit. On y fait tout avant le mainnet. |

## 2. Les outils

**Foundry** est la boîte à outils standard, déjà installée dans `~/.foundry/bin` :

- `forge` compile, teste et déploie ;
- `cast` lit la chaîne, envoie des transactions et gère les clés ;
- `anvil` lance une blockchain locale ;
- `chisel` est une console Solidity.

Mise à jour : `foundryup`. Si la commande n'est pas trouvée, ajouter `~/.foundry/bin` au `PATH`, par exemple dans `~/.zshrc` :

```bash
export PATH="$HOME/.foundry/bin:$PATH"
```

Bibliothèques, gérées par Soldeer et déclarées dans `foundry.toml` :

- `forge-std`, pour les tests et les scripts ;
- OpenZeppelin Contracts 5.7, pour les rôles et la vérification Merkle, deux briques auditées et standard.

## 3. Le dossier

```
contracts/
├── src/HearstReserveRegistry.sol        le registre de réserve
├── src/HearstMiningOracle.sol           l'économie du minage (relevés réseau, cours, coût d'un bitcoin)
├── test/HearstReserveRegistry.t.sol     tests unitaires (rôles, périodes, révisions, preuves) + fuzzing
├── test/MerkleFixture.t.sol             l'arbre JS et le contrat donnent les mêmes résultats
├── test/fixtures/merkle-202611.json     attestation d'exemple (5 vaults fictifs, sel public)
├── script/Deploy.s.sol                  déploiement
├── script/Publish.s.sol                 publication d'un mois
├── script/DeployMiningOracle.s.sol      déploiement de l'oracle
├── script-js/publish-network.mjs        publication des relevés du réseau (mempool.space, Coinbase)
└── ../scripts/demo-chain.mjs            la chaîne de la démo : déploie les deux contrats et les remplit
├── script-js/build-merkle.mjs           fabrique racine + preuves à partir des lignes du mois
├── script-js/samples/202611.json        lignes d'exemple
├── foundry.toml                         configuration (compilateur, réseaux, Etherscan)
└── .env.example                         variables à copier en .env (jamais commité)
```

## 4. Commandes de tous les jours

```bash
cd contracts
forge soldeer install      # première fois : télécharge les bibliothèques
forge build                # compile
forge test                 # 44 tests (registre 28, oracle 16), dont des essais aléatoires sur les périodes et les relevés
forge test -vvvv --match-test test_verifyVault_twoVaults   # le détail d'un test
forge test --gas-report    # coût en gas de chaque fonction
forge fmt                  # formate le code
forge lint                 # signale les mauvaises pratiques
```

Côté Node, pour l'arbre Merkle :

```bash
cd contracts/script-js
npm install                # première fois
npm run sample             # régénère test/fixtures/merkle-202611.json
```

## 5. Essai complet sur une blockchain locale

Sans clé, sans ETH, en une minute. Anvil fournit dix comptes de test déverrouillés.

```bash
cd contracts
anvil                                            # terminal 1 : la chaîne locale tourne

# terminal 2
A0=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266    # compte de test n°0 → admin
A1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8    # compte de test n°1 → publisher

REGISTRY_ADMIN=$A0 REGISTRY_PUBLISHER=$A1 FEE_BPS=1500 REFILL_CAP_BPS=5000 \
  forge script script/Deploy.s.sol --rpc-url local --unlocked --sender $A0 --broadcast
# → HearstReserveRegistry : 0x5FbDB2315678afecb367f032d93F642f64180aa3

REGISTRY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3 \
ATTESTATION_FILE=test/fixtures/merkle-202611.json \
  forge script script/Publish.s.sol --rpc-url local --unlocked --sender $A1 --broadcast

cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "latestPeriod()(uint32)" --rpc-url local
# → 202611
```

Vérifié le 8 octobre 2026 :

- une publication depuis le compte admin est refusée (`AccessControlUnauthorizedAccount`) ;
- celle du publisher passe ;
- `verifyVault` répond `true` pour la ligne exacte du vault V-0003 et `false` avec un satoshi de plus.

## 6. Préparer les clés (une seule fois)

**Règle :** aucune clé privée en clair, ni dans `.env`, ni dans le code, ni dans le chat. Foundry range les clés dans un **keystore chiffré** (`~/.foundry/keystores/`), déverrouillé par un mot de passe au moment de signer.

```bash
cast wallet new                                   # génère une clé : noter l'adresse, ne jamais partager la clé privée
cast wallet import hearst-deployer --interactive  # colle la clé privée + choisit un mot de passe
cast wallet import hearst-publisher --interactive # idem pour la clé de publication mensuelle
cast wallet list                                  # vérifie : hearst-deployer, hearst-publisher
cast wallet address --account hearst-deployer     # affiche l'adresse
```

Les mots de passe des keystores se rangent dans le Trousseau macOS. Les scripts utilisent ensuite `--account hearst-deployer` : Foundry demande le mot de passe et signe localement.

**En production**, les rôles se répartissent ainsi :

- **Admin** : un **compte Fireblocks** de Hearst, avec une politique d'approbation à plusieurs dirigeants (TAP). C'est lui qui gère les rôles et signe les corrections : une correction exige le quorum. Tous les paiements de l'offre passent déjà par Fireblocks (dépôts, retraits, électricité, restitutions) ; les clés des contrats y vivent aussi. Une clé seule ne doit jamais pouvoir réécrire l'historique.
- **Publisher** : un **compte Fireblocks dédié**, signé par API avec le co-signer, avec juste assez d'ETH pour publier. La tâche planifiée (`ops/hearst-chain.yml`) demande la signature à Fireblocks : la clé ne quitte jamais Fireblocks, et la politique limite ce compte à `publish` et `publishNetwork`. Si l'accès est compromis, l'admin révoque le rôle (`revokeRole`) et en nomme un autre. Le pire qu'il puisse faire est de publier un mois faux, qui reste visible et se corrige par révision. Sur Sepolia, la clé de publication est un compte Rabby (HEARST CONNECT B) dans le keystore Foundry et les secrets GitHub : test uniquement.
- **Deployer** : sert une seule fois, il n'a aucun droit sur le contrat.

## 7. Déployer sur Sepolia (réseau de test)

1. **ETH de test** : envoyer l'adresse `hearst-deployer` (puis `hearst-publisher`) sur un faucet Sepolia, comme le faucet Ethereum Sepolia de Google Cloud Web3 ou celui d'Alchemy. Quelques centièmes d'ETH de test suffisent.
2. **Nœud RPC** : créer un compte gratuit chez Alchemy ou Infura, puis copier l'URL Sepolia.
3. **Clé Etherscan** : etherscan.io → API Keys. La clé v2 vaut pour toutes les chaînes. Elle permet de publier le code source vérifié.
4. Copier `.env.example` en `.env` et remplir `SEPOLIA_RPC_URL`, `ETHERSCAN_API_KEY`, `REGISTRY_ADMIN` et `REGISTRY_PUBLISHER`.
5. Déployer et vérifier :

```bash
cd contracts
source .env
forge script script/Deploy.s.sol --rpc-url sepolia --account hearst-deployer --broadcast --verify
```

L'adresse du contrat s'affiche. Sur sepolia.etherscan.io, l'onglet **Contract** montre le code vérifié. Les onglets **Read Contract** et **Write Contract** permettent de l'utiliser à la main.

## 8. Publier un mois

1. Exporter les lignes du mois clôturé au format de `script-js/samples/202611.json` : le cours de clôture du mois (`btcCloseUsdE8`, USD à 8 décimales) puis, pour chaque vault, le miné, la recharge du buffer, le versement au client, la réserve et le cumul versé du mois précédent, et `holdSats` (ce que son dépôt aurait acheté le jour du dépôt), en satoshis, avec la facture d'électricité du mois et le buffer restant en USDC (`electricityUsdc`, `bufferUsdc`, 6 décimales). Le script convertit l'USDC en sats au cours de clôture, calcule les frais, la part versée à la réserve et la nouvelle réserve.
2. Construire l'attestation. Le sel vient du Trousseau, jamais d'un fichier :

   ```bash
   cd contracts/script-js
   export VAULT_KEY_SALT=$(security find-generic-password -s hearst-vault-salt -w)
   node build-merkle.mjs export-202612.json ../attestations/202612.json rapport-202612.pdf
   ```

   Le script refuse un fichier incohérent : doublon, recharge au-dessus du plafond, versement supérieur à la réserve, période invalide.
3. Publier :

   ```bash
   cd contracts && source .env
   ATTESTATION_FILE=attestations/202612.json \
     forge script script/Publish.s.sol --rpc-url sepolia --account hearst-publisher --broadcast
   ```

4. Envoyer à chaque client sa ligne et sa `proof`, extraites de `attestations/202612.json`. Ce fichier contient les identifiants internes : il reste hors du dépôt (`.gitignore`).

Le sel se crée une seule fois, puis se conserve. Le changer rendrait les clés de vault incomparables d'un mois à l'autre.

```bash
security add-generic-password -s hearst-vault-salt -a hearst -w "0x$(openssl rand -hex 32)"
```

## 9. Coûts

- **Publication mensuelle** : environ 190 000 gas. À 1–5 gwei, cela fait 0,0002 à 0,001 ETH par mois.
- **Déploiement** : une seule fois, de l'ordre du million de gas.
- **Lectures et vérifications client** : gratuites.

## 10. Avant le mainnet

- [ ] Fixer le taux de frais Hearst (`feeBps` dans l'export ; l'exemple utilise 15 %)
- [ ] Créer dans Fireblocks le compte admin (quorum de dirigeants) et le compte de publication (utilisateur API, co-signer)
- [ ] Un ou deux mois réels publiés sur Sepolia, avec les preuves vérifiées par un client test
- [ ] Revue de code externe, ou au minimum une seconde lecture par un développeur Solidity
- [ ] Déploiement mainnet : `--rpc-url mainnet`, avec le compte admin Fireblocks comme `REGISTRY_ADMIN`
- [ ] Afficher l'adresse du contrat et le lien « Vérifier sur Etherscan » dans l'espace client Hearst Connect
