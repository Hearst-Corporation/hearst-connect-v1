// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {HearstReserveRegistry} from "../src/HearstReserveRegistry.sol";

/// Vérifie que l'arbre construit côté serveur (script-js/build-merkle.mjs) et le contrat parlent la même langue :
/// mêmes feuilles, même racine, chaque preuve acceptée.
/// Régénérer la fixture : cd script-js && npm run sample
contract MerkleFixtureTest is Test {
    string internal constant FIXTURE = "test/fixtures/merkle-202611.json";

    HearstReserveRegistry internal registry;
    string internal json;
    uint32 internal period;

    function setUp() public {
        address publisher = makeAddr("publisher");
        json = vm.readFile(FIXTURE);
        registry = new HearstReserveRegistry(
            makeAddr("admin"),
            publisher,
            uint16(vm.parseJsonUint(json, ".feeBps")),
            uint16(vm.parseJsonUint(json, ".refillCapBps"))
        );
        // forge-lint: disable-next-line(unsafe-typecast)
        period = uint32(vm.parseJsonUint(json, ".period"));

        HearstReserveRegistry.Totals memory totals = HearstReserveRegistry.Totals({
            minedSats: _u64(".totals.minedSats"),
            electricitySats: _u64(".totals.electricitySats"),
            feeSats: _u64(".totals.feeSats"),
            refillSats: _u64(".totals.refillSats"),
            toReserveSats: _u64(".totals.toReserveSats"),
            withdrawnSats: _u64(".totals.withdrawnSats"),
            reserveSats: _u64(".totals.reserveSats"),
            // forge-lint: disable-next-line(unsafe-typecast)
            vaultCount: uint32(vm.parseJsonUint(json, ".totals.vaultCount"))
        });
        bytes32 root = vm.parseJsonBytes32(json, ".merkleRoot");
        bytes32 report = vm.parseJsonBytes32(json, ".reportHash");
        vm.prank(publisher);
        registry.publish(period, root, report, totals);
    }

    function test_everyVaultProofVerifies() public view {
        uint256 count = vm.parseJsonUint(json, ".totals.vaultCount");
        assertGt(count, 0);
        for (uint256 i; i < count; i++) {
            string memory p = string.concat(".vaults[", vm.toString(i), "]");
            HearstReserveRegistry.VaultLine memory line = _line(p);
            bytes32[] memory proof = vm.parseJsonBytes32Array(json, string.concat(p, ".proof"));

            assertEq(registry.vaultLeaf(period, line), vm.parseJsonBytes32(json, string.concat(p, ".leaf")), "feuille");
            assertTrue(registry.verifyVault(period, line, proof), "preuve");
            assertEq(registry.vsHoldBps(line), vm.parseJsonUint(json, string.concat(p, ".vsHoldBps")), "vs hold");
        }
    }

    function test_alteredAmountFails() public view {
        HearstReserveRegistry.VaultLine memory line = _line(".vaults[0]");
        bytes32[] memory proof = vm.parseJsonBytes32Array(json, ".vaults[0].proof");
        line.reserveSats += 1;
        assertFalse(registry.verifyVault(period, line, proof));
    }

    function test_proofOfAnotherVaultFails() public view {
        HearstReserveRegistry.VaultLine memory line = _line(".vaults[0]");
        bytes32[] memory proof = vm.parseJsonBytes32Array(json, ".vaults[1].proof");
        assertFalse(registry.verifyVault(period, line, proof));
    }

    function _line(string memory p) internal view returns (HearstReserveRegistry.VaultLine memory) {
        return HearstReserveRegistry.VaultLine({
            vaultKey: vm.parseJsonBytes32(json, string.concat(p, ".vaultKey")),
            minedSats: _u64(string.concat(p, ".minedSats")),
            electricitySats: _u64(string.concat(p, ".electricitySats")),
            feeSats: _u64(string.concat(p, ".feeSats")),
            refillSats: _u64(string.concat(p, ".refillSats")),
            toReserveSats: _u64(string.concat(p, ".toReserveSats")),
            withdrawnSats: _u64(string.concat(p, ".withdrawnSats")),
            reserveSats: _u64(string.concat(p, ".reserveSats")),
            withdrawnTotalSats: _u64(string.concat(p, ".withdrawnTotalSats")),
            holdSats: _u64(string.concat(p, ".holdSats"))
        });
    }

    function _u64(string memory key) internal view returns (uint64) {
        uint256 v = vm.parseJsonUint(json, key);
        assertLe(v, type(uint64).max);
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint64(v);
    }
}
