#!/bin/zsh
# La tâche planifiée de la chaîne Hearst (Sepolia), lancée toutes les heures par launchd.
#   1. publie les mois clos pas encore attestés dans HearstReserveRegistry (rien à faire la plupart du temps) ;
#   2. publie les relevés du réseau bitcoin dans HearstMiningOracle.
# Le mot de passe du keystore `hearst-publisher` vient du Trousseau macOS (service « hearst-publisher-keystore »),
# copié le temps de l'exécution dans un fichier lisible du seul utilisateur, puis effacé.
set -euo pipefail
export PATH="$HOME/.foundry/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")/.."

RPC="${HEARST_CHAIN_RPC_URL:-https://ethereum-sepolia-rpc.publicnode.com}"
PW_DIR=$(mktemp -d)
trap 'rm -rf "$PW_DIR"' EXIT
security find-generic-password -s hearst-publisher-keystore -w > "$PW_DIR/pw"
chmod 600 "$PW_DIR/pw"

echo "── $(date '+%Y-%m-%d %H:%M:%S')"
HEARST_KEYSTORE_PASSWORD_FILE="$PW_DIR/pw" node scripts/demo-chain.mjs \
  --rpc-url "$RPC" \
  --deployer hearst-publisher --publisher hearst-publisher \
  --admin 0xF4B2719bD911f3D2D52Ee108c8CaFb8570f63c0c \
  --publisher-address 0xc4197d502133ECAf7983663E69BA4b895831196D \
  --registry 0x0d0756DfB37F8162Cb7bA633912772D3D4545d62 \
  --oracle 0x489C70Bf7892F6B0F44e318F206a5BB11C3c127e 2>&1 | grep -v -E 'MODULE_TYPELESS|Reparsing|type": "module|trace-warnings|^(blockHash|logsBloom|logs|cumulativeGasUsed|effectiveGasPrice|contractAddress|root|blobGas|type|transactionIndex) '
