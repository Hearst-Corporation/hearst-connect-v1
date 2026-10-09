// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice Interface minimale d'un flux de prix Chainlink (BTC/USD).
interface IPriceFeed {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/// @title Économie du minage Hearst Connect
/// @notice La source unique du bloc « Mining Economics » de l'espace client. Le contrat garde :
///         - les relevés du réseau bitcoin, publiés par la clé opérationnelle : difficulté, hashrate,
///           hauteur de bloc (d'où la récompense, halvings compris) et frais moyens par bloc ;
///         - le cours du bitcoin : un flux Chainlink BTC/USD s'il est branché, sinon le cours publié ;
///         - les paramètres du parc, fixés par la gouvernance : prix de l'électricité, rendement des
///           machines (J/TH), coût machine par TH/s et durée d'amortissement.
///         Il en CALCULE le reste à chaque lecture (`economics`) : bitcoin produit par TH/s et par
///         jour, hashprice, coût pour miner un bitcoin (électricité seule et tout compris), marge
///         face au cours. Personne ne publie un coût de production : il découle des relevés.
/// @dev    Le contrat ne détient aucun fonds. Montants en dollars à 8 décimales (`E8`) comme
///         Chainlink, sauf mention contraire.
contract HearstMiningOracle is AccessControl {
    /// @notice Rôle autorisé à publier les relevés du réseau (clé opérationnelle de Hearst).
    bytes32 public constant PUBLISHER_ROLE = keccak256("PUBLISHER_ROLE");

    /// @notice Flux de prix BTC/USD (Chainlink). Adresse nulle = le cours publié fait foi.
    IPriceFeed public immutable PRICE_FEED;

    uint256 internal constant BPS = 10_000;
    uint256 internal constant TWO_POW_32 = 2 ** 32;
    uint256 internal constant HALVING_INTERVAL = 210_000;
    uint256 internal constant INITIAL_SUBSIDY_SATS = 50 * 1e8;

    /// @notice Relevés du réseau bitcoin, tels que publiés.
    struct Network {
        uint128 difficulty; // difficulté du réseau (entier, ex. 132 716 002 350 731)
        uint128 hashrateHs; // hashrate mesuré du réseau, en H/s
        uint32 blockHeight; // hauteur du dernier bloc : fixe la récompense (halvings)
        uint64 feesPerBlockSats; // frais de transaction moyens par bloc, en sats
        uint64 btcUsdE8; // cours publié (ignoré si un flux Chainlink est branché)
        uint64 updatedAt; // horodatage du bloc de publication
    }

    /// @notice Paramètres du parc, fixés par la gouvernance.
    struct Terms {
        uint32 powerUsdPerKwhE6; // prix de l'électricité (65 000 = 0,065 $/kWh)
        uint32 efficiencyJthE2; // rendement des machines (1 100 = 11 J/TH)
        uint64 hardwareUsdPerThsE6; // coût machine par TH/s (11 200 000 = 11,20 $)
        uint16 amortizationDays; // amortissement des machines (1 460 = 4 ans)
        uint32 maxAge; // au-delà, un relevé (ou le cours) est périmé, en secondes
    }

    /// @notice Tout ce que le bloc affiche, relevés et calculs, en une lecture.
    struct Economics {
        // Relevés
        uint256 btcUsdE8; // cours du bitcoin
        uint256 difficulty;
        uint256 hashrateHs;
        uint256 blockHeight;
        uint256 blockRewardSats; // récompense + frais moyens d'un bloc
        uint256 powerUsdPerKwhE6;
        uint256 efficiencyJthE2;
        // Calculs
        uint256 satsPerThDayE9; // bitcoin produit par TH/s et par jour, en sats à 9 décimales
        uint256 hashpriceUsdPerPhDayE8; // revenu d'un PH/s pendant un jour
        uint256 energyCostPerBtcUsdE8; // électricité seule pour miner 1 BTC
        uint256 costPerBtcUsdE8; // électricité + machines amorties : notre prix pour miner 1 BTC
        int256 marginPerBtcUsdE8; // cours − coût
        int256 marginBps; // (cours − coût) ÷ cours
        // Fraîcheur
        uint256 networkUpdatedAt;
        uint256 priceUpdatedAt;
        bool priceFromFeed;
        bool stale; // un relevé ou le cours a dépassé `maxAge`
    }

    Network public network;
    Terms public terms;

    event NetworkPublished(Network network);
    event TermsUpdated(Terms terms);

    error ZeroAddress();
    error InvalidNetwork();
    error InvalidTerms();
    error NoNetwork();
    error InvalidPrice();

    constructor(address admin, address publisher, address priceFeed, Terms memory initialTerms) {
        if (admin == address(0) || publisher == address(0)) revert ZeroAddress();
        PRICE_FEED = IPriceFeed(priceFeed);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PUBLISHER_ROLE, publisher);
        _setTerms(initialTerms);
    }

    // ── Écriture ──────────────────────────────────────────────────────────

    /// @notice Publie les relevés du réseau. `btcUsdE8` est ignoré si un flux Chainlink est branché
    ///         (0 accepté dans ce cas).
    function publishNetwork(
        uint128 difficulty,
        uint128 hashrateHs,
        uint32 blockHeight,
        uint64 feesPerBlockSats,
        uint64 btcUsdE8
    ) external onlyRole(PUBLISHER_ROLE) {
        if (difficulty == 0 || hashrateHs == 0 || blockHeight < network.blockHeight) {
            revert InvalidNetwork();
        }
        if (address(PRICE_FEED) == address(0) && btcUsdE8 == 0) revert InvalidPrice();
        network = Network({
            difficulty: difficulty,
            hashrateHs: hashrateHs,
            blockHeight: blockHeight,
            feesPerBlockSats: feesPerBlockSats,
            btcUsdE8: btcUsdE8,
            // forge-lint: disable-next-line(unsafe-typecast)
            updatedAt: uint64(block.timestamp)
        });
        emit NetworkPublished(network);
    }

    /// @notice Change les paramètres du parc (gouvernance). L'événement garde l'historique.
    function setTerms(Terms calldata newTerms) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTerms(newTerms);
    }

    // ── Lecture ───────────────────────────────────────────────────────────

    /// @notice Récompense d'un bloc à une hauteur donnée, halvings compris (en sats).
    function subsidyAt(uint256 height) public pure returns (uint256) {
        uint256 halvings = height / HALVING_INTERVAL;
        return halvings >= 64 ? 0 : INITIAL_SUBSIDY_SATS >> halvings;
    }

    /// @notice Cours du bitcoin (USD, 8 décimales), sa date et sa provenance.
    function btcUsd() public view returns (uint256 priceE8, uint256 updatedAt, bool fromFeed) {
        if (address(PRICE_FEED) == address(0)) {
            if (network.btcUsdE8 == 0) revert InvalidPrice();
            return (network.btcUsdE8, network.updatedAt, false);
        }
        (, int256 answer,, uint256 feedUpdatedAt,) = PRICE_FEED.latestRoundData();
        if (answer <= 0) revert InvalidPrice();
        uint8 dec = PRICE_FEED.decimals();
        // forge-lint: disable-next-line(unsafe-typecast)
        uint256 raw = uint256(answer);
        priceE8 = dec >= 8 ? raw / 10 ** (dec - 8) : raw * 10 ** (8 - dec);
        return (priceE8, feedUpdatedAt, true);
    }

    /// @notice L'économie du minage, relevés et calculs, telle que le bloc l'affiche.
    function economics() external view returns (Economics memory e) {
        Network memory n = network;
        if (n.updatedAt == 0) revert NoNetwork();
        Terms memory t = terms;

        (e.btcUsdE8, e.priceUpdatedAt, e.priceFromFeed) = btcUsd();
        e.difficulty = n.difficulty;
        e.hashrateHs = n.hashrateHs;
        e.blockHeight = n.blockHeight;
        e.blockRewardSats = subsidyAt(n.blockHeight) + n.feesPerBlockSats;
        e.powerUsdPerKwhE6 = t.powerUsdPerKwhE6;
        e.efficiencyJthE2 = t.efficiencyJthE2;
        e.networkUpdatedAt = n.updatedAt;

        // Un TH/s calcule 1e12 × 86 400 hachages par jour ; un bloc en demande difficulté × 2^32
        // en moyenne. Bitcoin produit = blocs trouvés × récompense.
        e.satsPerThDayE9 = (1e12 * 86_400 * e.blockRewardSats * 1e9) / (uint256(n.difficulty) * TWO_POW_32);

        // Hashprice : 1 PH/s = 1 000 TH/s ; sats → BTC (÷ 1e8) ; on retire les 9 décimales des sats.
        e.hashpriceUsdPerPhDayE8 = (e.satsPerThDayE9 * 1000 * e.btcUsdE8) / (1e8 * 1e9);

        // Électricité d'un TH/s pendant un jour : J/TH × 86 400 s ÷ 3,6e6 J/kWh = J/TH × 0,024 kWh,
        // soit J/TH(E2) × 24 × $/kWh(E6) ÷ 1e5 en dollars E6. Machine : coût par TH/s ÷ jours d'amortissement.
        // Coût d'un bitcoin = dépense d'un TH/s par jour ÷ bitcoin qu'il produit par jour.
        // USD E6 → E8 (× 1e2), et 1 BTC = 1e8 sats à 9 décimales (× 1e17) : × 1e19 au total.
        // Les divisions viennent en dernier, pour ne rien perdre en précision.
        if (e.satsPerThDayE9 > 0) {
            e.energyCostPerBtcUsdE8 = (uint256(t.efficiencyJthE2) * 24 * t.powerUsdPerKwhE6 * 1e14) / e.satsPerThDayE9;
            e.costPerBtcUsdE8 = e.energyCostPerBtcUsdE8 + (uint256(t.hardwareUsdPerThsE6) * 1e19)
                / (uint256(t.amortizationDays) * e.satsPerThDayE9);
        } else {
            e.energyCostPerBtcUsdE8 = type(uint256).max;
            e.costPerBtcUsdE8 = type(uint256).max;
        }

        // forge-lint: disable-next-line(unsafe-typecast)
        if (e.costPerBtcUsdE8 <= uint256(type(int256).max)) {
            // forge-lint: disable-next-line(unsafe-typecast)
            e.marginPerBtcUsdE8 = int256(e.btcUsdE8) - int256(e.costPerBtcUsdE8);
            // forge-lint: disable-next-line(unsafe-typecast)
            e.marginBps = (e.marginPerBtcUsdE8 * int256(BPS)) / int256(e.btcUsdE8);
        } else {
            e.marginPerBtcUsdE8 = type(int256).min;
            e.marginBps = type(int256).min;
        }

        e.stale = block.timestamp > n.updatedAt + t.maxAge || block.timestamp > e.priceUpdatedAt + t.maxAge;
    }

    // ── Interne ───────────────────────────────────────────────────────────

    function _setTerms(Terms memory t) private {
        if (t.powerUsdPerKwhE6 == 0 || t.efficiencyJthE2 == 0 || t.amortizationDays == 0 || t.maxAge == 0) {
            revert InvalidTerms();
        }
        terms = t;
        emit TermsUpdated(t);
    }
}
