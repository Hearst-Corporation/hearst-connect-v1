// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {HearstReserveRegistry} from "../src/HearstReserveRegistry.sol";

contract HearstReserveRegistryTest is Test {
    HearstReserveRegistry internal registry;

    address internal admin = makeAddr("admin");
    address internal publisher = makeAddr("publisher");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant REPORT = keccak256("rapport-202609.pdf");

    function setUp() public {
        registry = new HearstReserveRegistry(admin, publisher);
    }

    // ── Données d'exemple ─────────────────────────────────────────────────

    function _line(bytes32 key, uint64 mined) internal pure returns (HearstReserveRegistry.VaultLine memory) {
        // frais 15 %, recharge 0, le reste à la réserve ; réserve cumulée arbitraire
        uint64 fee = (mined * 15) / 100;
        return HearstReserveRegistry.VaultLine({
            vaultKey: key,
            minedSats: mined,
            feeSats: fee,
            refillSats: 0,
            toReserveSats: mined - fee,
            reserveSats: 500_000_000 + mined - fee
        });
    }

    function _totals() internal pure returns (HearstReserveRegistry.Totals memory) {
        return HearstReserveRegistry.Totals({
            minedSats: 30_000_000,
            feeSats: 4_500_000,
            refillSats: 0,
            toReserveSats: 25_500_000,
            reserveSats: 1_025_500_000,
            vaultCount: 2
        });
    }

    /// Racine d'un arbre à deux feuilles, comme OpenZeppelin : paires triées puis hachées.
    function _root2(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encode(a, b)) : keccak256(abi.encode(b, a));
    }

    function _leaf(uint32 period, HearstReserveRegistry.VaultLine memory l) internal view returns (bytes32) {
        return registry.vaultLeaf(period, l);
    }

    // ── Construction ──────────────────────────────────────────────────────

    function test_constructor_grantsRoles() public view {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(registry.hasRole(registry.PUBLISHER_ROLE(), publisher));
        assertFalse(registry.hasRole(registry.PUBLISHER_ROLE(), stranger));
    }

    function test_constructor_revertsOnZeroAddress() public {
        vm.expectRevert(HearstReserveRegistry.ZeroAddress.selector);
        new HearstReserveRegistry(address(0), publisher);
    }

    // ── Publication ───────────────────────────────────────────────────────

    function test_publish_storesAttestation() public {
        bytes32 root = keccak256("racine");
        vm.warp(1_790_000_000);
        vm.prank(publisher);
        registry.publish(202_609, root, REPORT, _totals());

        (HearstReserveRegistry.Attestation memory a, uint256 revision) = registry.attestation(202_609);
        assertEq(revision, 0);
        assertEq(a.merkleRoot, root);
        assertEq(a.reportHash, REPORT);
        assertEq(a.totals.toReserveSats, 25_500_000);
        assertEq(a.totals.vaultCount, 2);
        assertEq(a.publishedAt, 1_790_000_000);
        assertEq(registry.latestPeriod(), 202_609);
    }

    function test_publish_emitsEvent() public {
        bytes32 root = keccak256("racine");
        vm.expectEmit(true, true, false, true);
        emit HearstReserveRegistry.PeriodAttested(202_609, 0, root, REPORT, _totals());
        vm.prank(publisher);
        registry.publish(202_609, root, REPORT, _totals());
    }

    function test_publish_revertsForStranger() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, registry.PUBLISHER_ROLE()
            )
        );
        vm.prank(stranger);
        registry.publish(202_609, keccak256("racine"), REPORT, _totals());
    }

    function test_publish_revertsOnInvalidPeriod() public {
        uint32[4] memory bad = [uint32(202_613), 202_600, 202_301, 0];
        for (uint256 i; i < bad.length; i++) {
            vm.expectRevert(abi.encodeWithSelector(HearstReserveRegistry.InvalidPeriod.selector, bad[i]));
            vm.prank(publisher);
            registry.publish(bad[i], keccak256("racine"), REPORT, _totals());
        }
    }

    function test_publish_periodsMustAdvance() public {
        vm.startPrank(publisher);
        registry.publish(202_609, keccak256("a"), REPORT, _totals());
        vm.expectRevert(abi.encodeWithSelector(HearstReserveRegistry.PeriodNotAfterLatest.selector, 202_609, 202_609));
        registry.publish(202_609, keccak256("b"), REPORT, _totals());
        vm.expectRevert(abi.encodeWithSelector(HearstReserveRegistry.PeriodNotAfterLatest.selector, 202_608, 202_609));
        registry.publish(202_608, keccak256("c"), REPORT, _totals());
        registry.publish(202_610, keccak256("d"), REPORT, _totals());
        vm.stopPrank();
        assertEq(registry.latestPeriod(), 202_610);
    }

    function test_publish_revertsOnEmptyRoot() public {
        vm.expectRevert(HearstReserveRegistry.EmptyRoot.selector);
        vm.prank(publisher);
        registry.publish(202_609, bytes32(0), REPORT, _totals());
    }

    /// Fuzz : Foundry essaie des centaines de périodes au hasard.
    function testFuzz_publish_acceptsOnlyValidPeriods(uint32 period) public {
        uint32 year = period / 100;
        uint32 month = period % 100;
        bool valid = year >= 2024 && year <= 2099 && month >= 1 && month <= 12;
        if (!valid) vm.expectRevert(abi.encodeWithSelector(HearstReserveRegistry.InvalidPeriod.selector, period));
        vm.prank(publisher);
        registry.publish(period, keccak256("racine"), REPORT, _totals());
        if (valid) assertEq(registry.latestPeriod(), period);
    }

    // ── Révisions ─────────────────────────────────────────────────────────

    function test_revise_addsRevisionAndKeepsHistory() public {
        vm.prank(publisher);
        registry.publish(202_609, keccak256("v0"), REPORT, _totals());

        vm.expectEmit(true, true, false, true);
        emit HearstReserveRegistry.PeriodRevised(202_609, 1, unicode"correction du cours de clôture");
        vm.prank(admin);
        registry.revise(202_609, keccak256("v1"), REPORT, _totals(), unicode"correction du cours de clôture");

        (HearstReserveRegistry.Attestation memory latest, uint256 revision) = registry.attestation(202_609);
        assertEq(revision, 1);
        assertEq(latest.merkleRoot, keccak256("v1"));
        assertEq(registry.attestationAt(202_609, 0).merkleRoot, keccak256("v0"));
        assertEq(registry.revisionCount(202_609), 2);
    }

    function test_revise_onlyAdmin() public {
        vm.prank(publisher);
        registry.publish(202_609, keccak256("v0"), REPORT, _totals());
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, publisher, registry.DEFAULT_ADMIN_ROLE()
            )
        );
        vm.prank(publisher);
        registry.revise(202_609, keccak256("v1"), REPORT, _totals(), "x");
    }

    function test_revise_revertsWhenNotPublished() public {
        vm.expectRevert(abi.encodeWithSelector(HearstReserveRegistry.NotPublished.selector, 202_609));
        vm.prank(admin);
        registry.revise(202_609, keccak256("v1"), REPORT, _totals(), "x");
    }

    // ── Preuves Merkle ────────────────────────────────────────────────────

    function test_verifyVault_twoVaults() public {
        HearstReserveRegistry.VaultLine memory a = _line(keccak256("vault-A"), 20_000_000);
        HearstReserveRegistry.VaultLine memory b = _line(keccak256("vault-B"), 10_000_000);
        bytes32 la = _leaf(202_609, a);
        bytes32 lb = _leaf(202_609, b);
        vm.prank(publisher);
        registry.publish(202_609, _root2(la, lb), REPORT, _totals());

        bytes32[] memory proofA = new bytes32[](1);
        proofA[0] = lb;
        bytes32[] memory proofB = new bytes32[](1);
        proofB[0] = la;
        assertTrue(registry.verifyVault(202_609, a, proofA));
        assertTrue(registry.verifyVault(202_609, b, proofB));
    }

    function test_verifyVault_rejectsTamperedLine() public {
        HearstReserveRegistry.VaultLine memory a = _line(keccak256("vault-A"), 20_000_000);
        HearstReserveRegistry.VaultLine memory b = _line(keccak256("vault-B"), 10_000_000);
        bytes32 lb = _leaf(202_609, b);
        bytes32 root = _root2(_leaf(202_609, a), lb); // calculé avant le prank : vaultLeaf est un appel externe
        vm.prank(publisher);
        registry.publish(202_609, root, REPORT, _totals());

        bytes32[] memory proofA = new bytes32[](1);
        proofA[0] = lb;
        a.toReserveSats += 1; // un satoshi de trop : la preuve ne tient plus
        assertFalse(registry.verifyVault(202_609, a, proofA));
        assertFalse(registry.verifyVault(202_610, _line(keccak256("vault-A"), 20_000_000), proofA)); // période inconnue
    }
}
