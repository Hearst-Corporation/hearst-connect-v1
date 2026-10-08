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
| Face au simple achat | (réserve + déjà versé) ÷ ce qu'aurait acheté le dépôt | `vsHoldBps` (10 700 = 107 %) |

`verifyVault` ne répond `true` que si la ligne est dans l'attestation **et** respecte ces règles : une ligne aux frais gonflés est refusée même si Hearst l'a publiée. `vsHoldBps` ne compte que le bitcoin ; le buffer d'électricité restant (en USDC) n'y entre pas.

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
├── src/HearstReserveRegistry.sol        le contrat
├── test/HearstReserveRegistry.t.sol     tests unitaires (rôles, périodes, révisions, preuves) + fuzzing
├── test/MerkleFixture.t.sol             l'arbre JS et le contrat donnent les mêmes résultats
├── test/fixtures/merkle-202611.json     attestation d'exemple (5 vaults fictifs, sel public)
├── script/Deploy.s.sol                  déploiement
├── script/Publish.s.sol                 publication d'un mois
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
forge test                 # 25 tests, dont 256 essais aléatoires sur les périodes
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

- **Admin** : un **Safe multisig** (app.safe.global), par exemple 2 signatures sur 3 dirigeants. C'est lui qui gère les rôles et signe les corrections. Une clé seule ne doit jamais pouvoir réécrire l'historique.
- **Publisher** : une clé dédiée, avec juste assez d'ETH pour publier, idéalement sur un portefeuille matériel ou un KMS. Si elle est compromise, l'admin la révoque (`revokeRole`) et en nomme une autre. Le pire qu'elle puisse faire est de publier un mois faux, qui reste visible et se corrige par révision.
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

1. Exporter les lignes du mois clôturé au format de `script-js/samples/202611.json`. Pour chaque vault, en satoshis : miné, électricité du mois (convertie au cours de clôture), recharge du buffer, versement au client, réserve et cumul versé du mois précédent, et `holdSats` (ce que son dépôt aurait acheté le jour du dépôt). Le script calcule les frais, la part versée à la réserve et la nouvelle réserve.
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
- [ ] Créer le Safe admin et choisir la clé publisher
- [ ] Un ou deux mois réels publiés sur Sepolia, avec les preuves vérifiées par un client test
- [ ] Revue de code externe, ou au minimum une seconde lecture par un développeur Solidity
- [ ] Déploiement mainnet : `--rpc-url mainnet`, avec le Safe comme `REGISTRY_ADMIN`
- [ ] Afficher l'adresse du contrat et le lien « Vérifier sur Etherscan » dans l'espace client Hearst Connect
