// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {HearstMiningOracle, IPriceFeed} from "../src/HearstMiningOracle.sol";

/// Un flux Chainlink de test : prix et date réglables.
contract MockFeed is IPriceFeed {
    uint8 public immutable override decimals;
    int256 public answer;
    uint256 public updatedAt;

    constructor(uint8 dec) {
        decimals = dec;
    }

    function set(int256 a, uint256 at) external {
        answer = a;
        updatedAt = at;
    }

    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}

contract HearstMiningOracleTest is Test {
    HearstMiningOracle internal oracle;

    address internal admin = makeAddr("admin");
    address internal publisher = makeAddr("publisher");
    address internal stranger = makeAddr("stranger");

    // Relevés du 9 octobre 2026 (mempool.space, Coinbase).
    uint128 internal constant DIFFICULTY = 132_716_002_350_731;
    uint128 internal constant HASHRATE = 976_142_607_862_631_600_000; // ≈ 976 EH/s
    uint32 internal constant HEIGHT = 970_603;
    uint64 internal constant FEES = 2_000_000; // 0,02 BTC par bloc
    uint64 internal constant PRICE = 8_265_700_000_000; // 82 657 $

    function _terms() internal pure returns (HearstMiningOracle.Terms memory) {
        return HearstMiningOracle.Terms({
            powerUsdPerKwhE6: 65_000, // 0,065 $/kWh
            efficiencyJthE2: 1100, // 11 J/TH
            hardwareUsdPerThsE6: 11_200_000, // 11,20 $ par TH/s
            amortizationDays: 1460, // 4 ans
            maxAge: 1 days
        });
    }

    function setUp() public {
        vm.warp(1_791_590_400);
        oracle = new HearstMiningOracle(admin, publisher, address(0), _terms());
    }

    function _publish() internal {
        vm.prank(publisher);
        oracle.publishNetwork(DIFFICULTY, HASHRATE, HEIGHT, FEES, PRICE);
    }

    // ── Rôles et validations ──────────────────────────────────────────────

    function test_onlyPublisherPublishes() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, oracle.PUBLISHER_ROLE()
            )
        );
        vm.prank(stranger);
        oracle.publishNetwork(DIFFICULTY, HASHRATE, HEIGHT, FEES, PRICE);
    }

    function test_onlyAdminSetsTerms() public {
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, publisher, bytes32(0))
        );
        vm.prank(publisher);
        oracle.setTerms(_terms());
    }

    function test_economicsBeforeAnyReadingReverts() public {
        vm.expectRevert(HearstMiningOracle.NoNetwork.selector);
        oracle.economics();
    }

    function test_heightNeverGoesBack() public {
        _publish();
        vm.expectRevert(HearstMiningOracle.InvalidNetwork.selector);
        vm.prank(publisher);
        oracle.publishNetwork(DIFFICULTY, HASHRATE, HEIGHT - 1, FEES, PRICE);
    }

    function test_priceRequiredWithoutFeed() public {
        vm.expectRevert(HearstMiningOracle.InvalidPrice.selector);
        vm.prank(publisher);
        oracle.publishNetwork(DIFFICULTY, HASHRATE, HEIGHT, FEES, 0);
    }

    function test_invalidTermsRejected() public {
        HearstMiningOracle.Terms memory t = _terms();
        t.amortizationDays = 0;
        vm.expectRevert(HearstMiningOracle.InvalidTerms.selector);
        vm.prank(admin);
        oracle.setTerms(t);
    }

    // ── Récompense ────────────────────────────────────────────────────────

    function test_subsidyFollowsHalvings() public view {
        assertEq(oracle.subsidyAt(0), 50e8);
        assertEq(oracle.subsidyAt(839_999), 6.25e8);
        assertEq(oracle.subsidyAt(840_000), 3.125e8);
        assertEq(oracle.subsidyAt(HEIGHT), 3.125e8);
        assertEq(oracle.subsidyAt(1_050_000), 1.5625e8); // halving de 2028
        assertEq(oracle.subsidyAt(64 * 210_000), 0);
    }

    // ── Les calculs, contre les ordres de grandeur connus ─────────────────

    function test_economicsMatchesHandComputation() public {
        _publish();
        HearstMiningOracle.Economics memory e = oracle.economics();

        assertEq(e.btcUsdE8, PRICE);
        assertEq(e.blockRewardSats, 3.125e8 + FEES);

        // 1e12 × 86 400 × 314 500 000 ÷ (D × 2^32) ≈ 47,67 sats par TH/s et par jour.
        uint256 expectedSats = (1e12 * 86_400 * uint256(314_500_000) * 1e9) / (uint256(DIFFICULTY) * 2 ** 32);
        assertEq(e.satsPerThDayE9, expectedSats);
        assertApproxEqRel(e.satsPerThDayE9, 47.67e9, 0.001e18);

        // Hashprice ≈ 47,67 sats × 1 000 × 82 657 $ ÷ 1e8 ≈ 39,4 $ par PH/s et par jour.
        assertApproxEqRel(e.hashpriceUsdPerPhDayE8, 39.4e8, 0.002e18);

        // Électricité : 11 J/TH × 0,024 = 0,264 kWh × 0,065 $ = 0,01716 $ par TH/s et par jour
        // → 0,01716 ÷ 47,67e-8 BTC ≈ 36 000 $ par BTC.
        assertApproxEqRel(e.energyCostPerBtcUsdE8, 36_000e8, 0.002e18);
        // + machine : 11,20 $ ÷ 1 460 j = 0,00767 $ → ≈ 52 090 $ par BTC.
        assertApproxEqRel(e.costPerBtcUsdE8, 52_090e8, 0.002e18);

        assertEq(e.marginPerBtcUsdE8, int256(uint256(PRICE)) - int256(e.costPerBtcUsdE8));
        assertGt(e.marginBps, 3600);
        assertLt(e.marginBps, 3700);
        assertFalse(e.stale);
        assertFalse(e.priceFromFeed);
    }

    function test_costRisesWithDifficulty() public {
        _publish();
        uint256 before = oracle.economics().costPerBtcUsdE8;
        vm.prank(publisher);
        oracle.publishNetwork(DIFFICULTY * 2, HASHRATE, HEIGHT, FEES, PRICE);
        assertApproxEqRel(oracle.economics().costPerBtcUsdE8, before * 2, 0.0001e18);
    }

    function test_costDoublesAtHalving() public {
        _publish();
        uint256 before = oracle.economics().costPerBtcUsdE8;
        vm.prank(publisher);
        oracle.publishNetwork(DIFFICULTY, HASHRATE, 1_050_000, 0, PRICE);
        // Sans frais de bloc, la récompense passe de 3,145 à 1,5625 BTC.
        assertApproxEqRel(oracle.economics().costPerBtcUsdE8, (before * 314_500_000) / 156_250_000, 0.0001e18);
    }

    function test_marginGoesNegativeUnderwater() public {
        _publish();
        vm.prank(publisher);
        oracle.publishNetwork(DIFFICULTY, HASHRATE, HEIGHT, FEES, 40_000e8);
        HearstMiningOracle.Economics memory e = oracle.economics();
        assertLt(e.marginPerBtcUsdE8, 0);
        assertLt(e.marginBps, 0);
    }

    function test_staleAfterMaxAge() public {
        _publish();
        vm.warp(block.timestamp + 1 days + 1);
        assertTrue(oracle.economics().stale);
    }

    function test_termsChangeTheCost() public {
        _publish();
        uint256 before = oracle.economics().energyCostPerBtcUsdE8;
        HearstMiningOracle.Terms memory t = _terms();
        t.powerUsdPerKwhE6 = 130_000;
        vm.prank(admin);
        oracle.setTerms(t);
        assertApproxEqRel(oracle.economics().energyCostPerBtcUsdE8, before * 2, 0.0001e18);
    }

    // ── Flux Chainlink ────────────────────────────────────────────────────

    function test_feedPriceWinsAndIsNormalised() public {
        MockFeed feed = new MockFeed(18);
        feed.set(90_000e18, block.timestamp);
        oracle = new HearstMiningOracle(admin, publisher, address(feed), _terms());
        vm.prank(publisher);
        oracle.publishNetwork(DIFFICULTY, HASHRATE, HEIGHT, FEES, 0);

        HearstMiningOracle.Economics memory e = oracle.economics();
        assertEq(e.btcUsdE8, 90_000e8);
        assertTrue(e.priceFromFeed);

        // Un flux qui n'avance plus rend le bloc périmé, même si le réseau est frais.
        vm.warp(block.timestamp + 2 days);
        vm.prank(publisher);
        oracle.publishNetwork(DIFFICULTY, HASHRATE, HEIGHT, FEES, 0);
        assertTrue(oracle.economics().stale);
    }

    function test_badFeedAnswerReverts() public {
        MockFeed feed = new MockFeed(8);
        feed.set(0, block.timestamp);
        oracle = new HearstMiningOracle(admin, publisher, address(feed), _terms());
        vm.prank(publisher);
        oracle.publishNetwork(DIFFICULTY, HASHRATE, HEIGHT, FEES, 0);
        vm.expectRevert(HearstMiningOracle.InvalidPrice.selector);
        oracle.economics();
    }

    function testFuzz_costNeverBelowEnergy(uint128 difficulty, uint32 height, uint64 price) public {
        difficulty = uint128(bound(difficulty, 1e9, 1e18));
        height = uint32(bound(height, HEIGHT, 6_000_000));
        price = uint64(bound(price, 1e8, 1e15));
        vm.prank(publisher);
        oracle.publishNetwork(difficulty, HASHRATE, height, FEES, price);
        HearstMiningOracle.Economics memory e = oracle.economics();
        assertGe(e.costPerBtcUsdE8, e.energyCostPerBtcUsdE8);
    }
}
