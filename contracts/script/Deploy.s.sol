// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {HearstReserveRegistry} from "../src/HearstReserveRegistry.sol";

/// Déploie le registre.
///   REGISTRY_ADMIN      gouvernance (idéalement un multisig Safe) : rôles et corrections
///   REGISTRY_PUBLISHER  clé opérationnelle qui publie chaque mois
/// Exemple (Sepolia) : forge script script/Deploy.s.sol --rpc-url sepolia --account hearst-deployer --broadcast --verify
contract Deploy is Script {
    function run() external returns (HearstReserveRegistry registry) {
        address admin = vm.envAddress("REGISTRY_ADMIN");
        address publisher = vm.envAddress("REGISTRY_PUBLISHER");

        vm.startBroadcast();
        registry = new HearstReserveRegistry(admin, publisher);
        vm.stopBroadcast();

        console.log("HearstReserveRegistry :", address(registry));
        console.log("  admin     :", admin);
        console.log("  publisher :", publisher);
    }
}
