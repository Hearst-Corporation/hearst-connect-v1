// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {HearstReserveRegistry} from "../src/HearstReserveRegistry.sol";

/// Publie l'attestation d'un mois à partir du fichier produit par script-js/build-merkle.mjs.
///   REGISTRY_ADDRESS  adresse du registre déployé
///   ATTESTATION_FILE  ex. attestations/202609.json (ou test/fixtures/merkle-202609.json pour l'exemple)
/// Exemple : forge script script/Publish.s.sol --rpc-url sepolia --account hearst-publisher --broadcast
contract Publish is Script {
    function run() external {
        HearstReserveRegistry registry = HearstReserveRegistry(vm.envAddress("REGISTRY_ADDRESS"));
        string memory json = vm.readFile(vm.envString("ATTESTATION_FILE"));

        // forge-lint: disable-next-line(unsafe-typecast)
        uint32 period = uint32(vm.parseJsonUint(json, ".period"));
        bytes32 root = vm.parseJsonBytes32(json, ".merkleRoot");
        bytes32 report = vm.parseJsonBytes32(json, ".reportHash");
        HearstReserveRegistry.Totals memory totals = HearstReserveRegistry.Totals({
            minedSats: _u64(json, ".totals.minedSats"),
            feeSats: _u64(json, ".totals.feeSats"),
            refillSats: _u64(json, ".totals.refillSats"),
            toReserveSats: _u64(json, ".totals.toReserveSats"),
            reserveSats: _u64(json, ".totals.reserveSats"),
            // forge-lint: disable-next-line(unsafe-typecast)
            vaultCount: uint32(vm.parseJsonUint(json, ".totals.vaultCount"))
        });

        vm.startBroadcast();
        registry.publish(period, root, report, totals);
        vm.stopBroadcast();

        console.log("Periode publiee :", period);
        console.logBytes32(root);
    }

    function _u64(string memory json, string memory key) internal pure returns (uint64) {
        uint256 v = vm.parseJsonUint(json, key);
        require(v <= type(uint64).max, "montant hors uint64");
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint64(v);
    }
}
