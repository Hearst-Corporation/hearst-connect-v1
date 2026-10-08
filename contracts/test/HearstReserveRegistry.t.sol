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

    uint16 internal constant FEE = 1500; // 15 % du miné net d'électricité
    uint16 internal constant CAP = 5000; // recharge ≤ 50 % du miné
    bytes32 internal constant REPORT = keccak256("rapport-202611.pdf");

    function setUp() public {
        registry = new HearstReserveRegistry(admin, publisher, FEE, CAP);
    }

    // ── Données d'exemple (ordres de grandeur du modèle : 1 M$, mois 2) ───

    /// Une ligne qui respecte les règles : frais = 15 % de (miné − électricité), le reste à la réserve.
    function _line(bytes32 key, uint64 mined, uint64 elec, uint64 refill)
        internal
        view
        returns (HearstReserveRegistry.VaultLine memory l)
    {
        uint64 fee = registry.feeFor(mined, elec);
        l = HearstReserveRegistry.VaultLine({
            vaultKey: key,
            minedSats: mined,
            electricitySats: elec,
            feeSats: fee,
            refillSats: refill,
            toReserveSats: mined - fee - refill,
            withdrawnSats: 0,
            reserveSats: 100_000_000 + mined - fee - refill,
            withdrawnTotalSats: 0,
            holdSats: 1_054_600_000
        });
    }

    function _totals() internal pure returns (HearstReserveRegistry.Totals memory) {
        // 111 806 441 miné, 36 789 295 d'électricité → frais 11 252 571
        return HearstReserveRegistry.Totals({
            minedSats: 111_806_441,
            electricitySats: 36_789_295,
            feeSats: 11_252_571,
            refillSats: 0,
            toReserveSats: 100_553_870,
            withdrawnSats: 0,
            reserveSats: 201_107_740,
            vaultCount: 1
        });
    }

    /// Racine d'un arbre à deux feuilles, comme OpenZeppelin : paires triées puis hachées.
    function _root2(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encode(a, b)) : keccak256(abi.encode(b, a));
    }

    // ── Construction ──────────────────────────────────────────────────────

    function test_constructor_setsRolesAndTerms() public view {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(registry.hasRole(registry.PUBLISHER_ROLE(), publisher));
        assertFalse(registry.hasRole(registry.PUBLISHER_ROLE(), stranger));
        assertEq(registry.FEE_BPS(), 1500);
        assertEq(registry.REFILL_CAP_BPS(), 5000);
    }

    function test_constructor_revertsOnZeroAddress() public {
        vm.expectRevert(HearstReserveRegistry.ZeroAddress.selector);
        new HearstReserveRegistry(address(0), publisher, FEE, CAP);
    }

    function test_constructor_revertsOnAbusiveFee() public {
        vm.expectRevert(HearstReserveRegistry.InvalidTerms.selector);
        new HearstReserveRegistry(admin, publisher, 3001, CAP);
    }

    // ── Frais ─────────────────────────────────────────────────────────────

    function test_feeFor_isFifteenPercentOfNet() public view {
        assertEq(registry.feeFor(111_806_441, 36_789_295), 11_252_571); // (111 806 441 − 36 789 295) × 15 %
        assertEq(registry.feeFor(1000, 1000), 0); // électricité = miné : aucun frais
        assertEq(registry.feeFor(1000, 5000), 0); // mois à perte : aucun frais
    }

    function testFuzz_feeFor_neverAboveCapOfNet(uint64 mined, uint64 elec) public view {
        uint64 fee = registry.feeFor(mined, elec);
        uint256 net = elec >= mined ? 0 : mined - elec;
        assertLe(uint256(fee) * 10_000, net * FEE);
    }

    // ── Publication ───────────────────────────────────────────────────────

    function test_publish_storesAttestation() public {
        bytes32 root = keccak256("racine");
        vm.warp(1_793_000_000);
        vm.prank(publisher);
        registry.publish(202_611, root, REPORT, _totals());

        (HearstReserveRegistry.Attestation memory a, uint256 revision) = registry.attestation(202_611);
        assertEq(revision, 0);
        assertEq(a.merkleRoot, root);
        assertEq(a.reportHash, REPORT);
        assertEq(a.totals.feeSats, 11_252_571);
        assertEq(a.totals.vaultCount, 1);
        assertEq(a.publishedAt, 1_793_000_000);
        assertEq(registry.latestPeriod(), 202_611);
    }

    function test_publish_emitsEvent() public {
        bytes32 root = keccak256("racine");
        vm.expectEmit(true, true, false, true);
        emit HearstReserveRegistry.PeriodAttested(202_611, 0, root, REPORT, _totals());
        vm.prank(publisher);
        registry.publish(202_611, root, REPORT, _totals());
    }

    function test_publish_revertsForStranger() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, registry.PUBLISHER_ROLE()
            )
        );
        vm.prank(stranger);
        registry.publish(202_611, keccak256("racine"), REPORT, _totals());
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
        registry.publish(202_611, keccak256("a"), REPORT, _totals());
        vm.expectRevert(abi.encodeWithSelector(HearstReserveRegistry.PeriodNotAfterLatest.selector, 202_611, 202_611));
        registry.publish(202_611, keccak256("b"), REPORT, _totals());
        vm.expectRevert(abi.encodeWithSelector(HearstReserveRegistry.PeriodNotAfterLatest.selector, 202_610, 202_611));
        registry.publish(202_610, keccak256("c"), REPORT, _totals());
        registry.publish(202_612, keccak256("d"), REPORT, _totals());
        vm.stopPrank();
        assertEq(registry.latestPeriod(), 202_612);
    }

    function test_publish_revertsOnEmptyRoot() public {
        vm.expectRevert(HearstReserveRegistry.EmptyRoot.selector);
        vm.prank(publisher);
        registry.publish(202_611, bytes32(0), REPORT, _totals());
    }

    function test_publish_rejectsTotalsThatBreakTheRules() public {
        HearstReserveRegistry.Totals memory t = _totals();
        vm.startPrank(publisher);

        t.toReserveSats += 1; // le miné ne se répartit plus exactement
        vm.expectRevert(abi.encodeWithSelector(HearstReserveRegistry.InvalidTotals.selector, uint8(1)));
        registry.publish(202_611, keccak256("r"), REPORT, t);

        t = _totals();
        t.feeSats += 1000; // frais au-dessus de 15 % du net
        t.toReserveSats -= 1000;
        vm.expectRevert(abi.encodeWithSelector(HearstReserveRegistry.InvalidTotals.selector, uint8(2)));
        registry.publish(202_611, keccak256("r"), REPORT, t);

        t = _totals();
        t.refillSats = 60_000_000; // recharge au-dessus de 50 % du miné
        t.toReserveSats = t.minedSats - t.feeSats - t.refillSats;
        vm.expectRevert(abi.encodeWithSelector(HearstReserveRegistry.InvalidTotals.selector, uint8(3)));
        registry.publish(202_611, keccak256("r"), REPORT, t);

        t = _totals();
        t.vaultCount = 0;
        vm.expectRevert(abi.encodeWithSelector(HearstReserveRegistry.InvalidTotals.selector, uint8(4)));
        registry.publish(202_611, keccak256("r"), REPORT, t);
        vm.stopPrank();
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
        registry.publish(202_611, keccak256("v0"), REPORT, _totals());

        vm.expectEmit(true, true, false, true);
        emit HearstReserveRegistry.PeriodRevised(202_611, 1, unicode"correction du cours de clôture");
        vm.prank(admin);
        registry.revise(202_611, keccak256("v1"), REPORT, _totals(), unicode"correction du cours de clôture");

        (HearstReserveRegistry.Attestation memory latest, uint256 revision) = registry.attestation(202_611);
        assertEq(revision, 1);
        assertEq(latest.merkleRoot, keccak256("v1"));
        assertEq(registry.attestationAt(202_611, 0).merkleRoot, keccak256("v0"));
        assertEq(registry.revisionCount(202_611), 2);
    }

    function test_revise_onlyAdmin() public {
        vm.prank(publisher);
        registry.publish(202_611, keccak256("v0"), REPORT, _totals());
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, publisher, registry.DEFAULT_ADMIN_ROLE()
            )
        );
        vm.prank(publisher);
        registry.revise(202_611, keccak256("v1"), REPORT, _totals(), "x");
    }

    function test_revise_revertsWhenNotPublished() public {
        vm.expectRevert(abi.encodeWithSelector(HearstReserveRegistry.NotPublished.selector, 202_611));
        vm.prank(admin);
        registry.revise(202_611, keccak256("v1"), REPORT, _totals(), "x");
    }

    // ── Lignes de vault ───────────────────────────────────────────────────

    function test_verifyVault_twoVaults() public {
        HearstReserveRegistry.VaultLine memory a = _line(keccak256("vault-A"), 111_806_441, 36_789_295, 0);
        HearstReserveRegistry.VaultLine memory b = _line(keccak256("vault-B"), 46_958_705, 15_451_504, 0);
        bytes32 la = registry.vaultLeaf(202_611, a);
        bytes32 lb = registry.vaultLeaf(202_611, b);
        bytes32 root = _root2(la, lb);
        vm.prank(publisher);
        registry.publish(202_611, root, REPORT, _totals());

        bytes32[] memory proofA = new bytes32[](1);
        proofA[0] = lb;
        bytes32[] memory proofB = new bytes32[](1);
        proofB[0] = la;
        assertTrue(registry.verifyVault(202_611, a, proofA));
        assertTrue(registry.verifyVault(202_611, b, proofB));
    }

    function test_verifyVault_rejectsLineThatBreaksTheRules() public {
        // Une ligne aux frais gonflés, pourtant bien dans l'arbre : verifyVault la refuse quand même.
        HearstReserveRegistry.VaultLine memory greedy = _line(keccak256("vault-A"), 111_806_441, 36_789_295, 0);
        greedy.feeSats += 1_000_000;
        greedy.toReserveSats -= 1_000_000;
        HearstReserveRegistry.VaultLine memory b = _line(keccak256("vault-B"), 46_958_705, 15_451_504, 0);
        bytes32 lb = registry.vaultLeaf(202_611, b);
        bytes32 root = _root2(registry.vaultLeaf(202_611, greedy), lb);
        vm.prank(publisher);
        registry.publish(202_611, root, REPORT, _totals());

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = lb;
        assertFalse(registry.lineFollowsRules(greedy));
        assertFalse(registry.verifyVault(202_611, greedy, proof));
    }

    function test_lineFollowsRules_refillCap() public view {
        assertTrue(registry.lineFollowsRules(_line(keccak256("v"), 100_000_000, 30_000_000, 50_000_000)));
        assertFalse(registry.lineFollowsRules(_line(keccak256("v"), 100_000_000, 30_000_000, 50_000_001)));
    }

    function test_verifyVault_rejectsTamperedLine() public {
        HearstReserveRegistry.VaultLine memory a = _line(keccak256("vault-A"), 111_806_441, 36_789_295, 0);
        HearstReserveRegistry.VaultLine memory b = _line(keccak256("vault-B"), 46_958_705, 15_451_504, 0);
        bytes32 lb = registry.vaultLeaf(202_611, b);
        bytes32 root = _root2(registry.vaultLeaf(202_611, a), lb); // calculé avant le prank : vaultLeaf est un appel externe
        vm.prank(publisher);
        registry.publish(202_611, root, REPORT, _totals());

        bytes32[] memory proofA = new bytes32[](1);
        proofA[0] = lb;
        a.reserveSats += 1; // un satoshi de trop : la preuve ne tient plus
        assertFalse(registry.verifyVault(202_611, a, proofA));
        a.reserveSats -= 1;
        assertFalse(registry.verifyVault(202_612, a, proofA)); // période inconnue
    }

    function test_vsHoldBps() public view {
        HearstReserveRegistry.VaultLine memory l = _line(keccak256("v"), 0, 0, 0);
        l.holdSats = 1_000_000_000;
        l.reserveSats = 1_000_000_000;
        l.withdrawnTotalSats = 70_000_000;
        assertEq(registry.vsHoldBps(l), 10_700); // 107 % du simple achat
    }

    // ── Continuité d'un mois à l'autre ────────────────────────────────────

    function _publishSingle(uint32 period, HearstReserveRegistry.VaultLine memory l) internal {
        bytes32 root = registry.vaultLeaf(period, l); // arbre à une feuille : la racine est la feuille
        HearstReserveRegistry.Totals memory t = HearstReserveRegistry.Totals({
            minedSats: l.minedSats,
            electricitySats: l.electricitySats,
            feeSats: l.feeSats,
            refillSats: l.refillSats,
            toReserveSats: l.toReserveSats,
            withdrawnSats: l.withdrawnSats,
            reserveSats: l.reserveSats,
            vaultCount: 1
        });
        vm.prank(publisher);
        registry.publish(period, root, REPORT, t);
    }

    function test_verifyContinuity_acrossYearEnd() public {
        HearstReserveRegistry.VaultLine memory dec = _line(keccak256("v"), 111_806_441, 36_789_295, 0);
        HearstReserveRegistry.VaultLine memory jan = _line(keccak256("v"), 110_000_000, 36_789_295, 0);
        jan.withdrawnSats = 20_000_000; // le client retire 0,2 BTC en janvier
        jan.reserveSats = dec.reserveSats + jan.toReserveSats - jan.withdrawnSats;
        jan.withdrawnTotalSats = 20_000_000;
        _publishSingle(202_612, dec);
        _publishSingle(202_701, jan);

        bytes32[] memory none = new bytes32[](0);
        assertTrue(registry.verifyContinuity(202_612, dec, none, jan, none));

        jan.reserveSats += 1; // une réserve qui ne découle pas du mois précédent
        assertFalse(registry.verifyContinuity(202_612, dec, none, jan, none));
    }
}
