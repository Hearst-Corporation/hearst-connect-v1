// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {HearstReserveRegistry} from "../src/HearstReserveRegistry.sol";

/// Déploie le registre.
///   REGISTRY_ADMIN      gouvernance (idéalement un multisig Safe) : rôles et corrections
///   REGISTRY_PUBLISHER  clé opérationnelle qui publie chaque mois
///   FEE_BPS             frais sur le miné net d'électricité (défaut 1500 = 15 %)
///   REFILL_CAP_BPS      part max du miné pour recharger le buffer (défaut 5000 = 50 %)
/// Exemple (Sepolia) : forge script script/Deploy.s.sol --rpc-url sepolia --account hearst-deployer --broadcast --verify
contract Deploy is Script {
    function run() external returns (HearstReserveRegistry registry) {
        address admin = vm.envAddress("REGISTRY_ADMIN");
        address publisher = vm.envAddress("REGISTRY_PUBLISHER");
        uint16 feeBps = uint16(vm.envOr("FEE_BPS", uint256(1500)));
        uint16 refillCapBps = uint16(vm.envOr("REFILL_CAP_BPS", uint256(5000)));

        vm.startBroadcast();
        registry = new HearstReserveRegistry(admin, publisher, feeBps, refillCapBps);
        vm.stopBroadcast();

        console.log("HearstReserveRegistry :", address(registry));
        console.log("  admin     :", admin);
        console.log("  publisher :", publisher);
        console.log("  frais (bps du net) :", feeBps);
        console.log("  recharge max (bps) :", refillCapBps);
    }
}
