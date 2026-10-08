// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title Registre de réserve Hearst Connect
/// @notice Chaque mois clôturé, Hearst publie ici une attestation : une racine Merkle qui résume
///         les lignes de tous les vaults, les totaux publics et l'empreinte du rapport mensuel.
///         Le contrat applique les règles de l'offre V2 :
///         - les frais Hearst valent `FEE_BPS` du bitcoin miné NET d'électricité (rien si le mois perd) ;
///         - la recharge du buffer d'électricité prend au plus `REFILL_CAP_BPS` du bitcoin miné du mois ;
///         - le miné se répartit exactement entre frais, recharge et réserve du client.
///         Un client prouve que SA ligne fait partie de l'attestation ET qu'elle respecte ces règles
///         (`verifyVault`), et lit où il en est face à un simple achat de bitcoin (`vsHoldBps`).
/// @dev    Le contrat ne détient aucun fonds. Les attestations sont en ajout seul : une correction
///         crée une nouvelle révision (par l'administrateur, avec un motif public), l'ancienne reste lisible.
contract HearstReserveRegistry is AccessControl {
    /// @notice Rôle autorisé à publier une nouvelle période (clé opérationnelle de Hearst).
    bytes32 public constant PUBLISHER_ROLE = keccak256("PUBLISHER_ROLE");

    /// @notice Frais Hearst, en points de base du miné net d'électricité (1500 = 15 %).
    uint16 public immutable FEE_BPS;
    /// @notice Part maximale du miné du mois vendue pour recharger le buffer (5000 = 50 %).
    uint16 public immutable REFILL_CAP_BPS;

    uint16 internal constant MAX_FEE_BPS = 3000;
    uint16 internal constant BPS = 10_000;

    /// @notice Totaux publics d'une période, en satoshis (1 BTC = 100 000 000 sats).
    struct Totals {
        uint64 minedSats; // bitcoin miné par le parc pour l'ensemble des vaults
        uint64 electricitySats; // électricité du mois, convertie en sats au cours de clôture
        uint64 feeSats; // frais Hearst
        uint64 refillSats; // bitcoin vendu pour recharger les buffers d'électricité
        uint64 toReserveSats; // part versée aux réserves des clients ce mois-ci
        uint64 withdrawnSats; // bitcoin versé aux clients ce mois-ci
        uint64 reserveSats; // réserves cumulées de tous les vaults en fin de mois
        uint32 vaultCount; // nombre de vaults couverts par la racine
    }

    /// @notice La ligne d'un vault pour une période, telle que remise au client avec sa preuve.
    struct VaultLine {
        bytes32 vaultKey; // identifiant opaque : keccak256(sel secret ‖ identifiant interne)
        uint64 minedSats; // bitcoin miné pour ce vault
        uint64 electricitySats; // son électricité du mois, en sats au cours de clôture
        uint64 feeSats; // frais Hearst
        uint64 refillSats; // vendu pour recharger son buffer
        uint64 toReserveSats; // versé à sa réserve ce mois-ci
        uint64 withdrawnSats; // versé au client ce mois-ci
        uint64 reserveSats; // sa réserve en fin de mois
        uint64 withdrawnTotalSats; // cumul de ce qui lui a été versé depuis le dépôt
        uint64 holdSats; // ce que son dépôt aurait acheté au marché le jour du dépôt
    }

    /// @notice Une attestation publiée pour une période.
    struct Attestation {
        bytes32 merkleRoot; // racine des lignes par vault
        bytes32 reportHash; // empreinte SHA-256 du rapport mensuel (PDF)
        Totals totals;
        uint64 publishedAt; // horodatage du bloc de publication
    }

    /// @dev période (AAAAMM, ex. 202611) → révisions, de la première à la dernière.
    mapping(uint32 period => Attestation[] revisions) private _attestations;

    /// @notice Dernière période publiée (0 tant qu'aucune).
    uint32 public latestPeriod;

    event PeriodAttested(
        uint32 indexed period, uint256 indexed revision, bytes32 merkleRoot, bytes32 reportHash, Totals totals
    );
    event PeriodRevised(uint32 indexed period, uint256 indexed revision, string reason);

    error InvalidPeriod(uint32 period);
    error PeriodNotAfterLatest(uint32 period, uint32 latest);
    error NotPublished(uint32 period);
    error EmptyRoot();
    error ZeroAddress();
    error InvalidTerms();
    /// @dev Les totaux ne respectent pas les règles de l'offre (le code dit laquelle).
    error InvalidTotals(uint8 rule);

    /// @param admin        Gouvernance (multisig Hearst) : gère les rôles et publie les corrections.
    /// @param publisher    Clé opérationnelle qui publie chaque mois.
    /// @param feeBps       Frais sur le miné net d'électricité (1500 = 15 %, au plus 30 %).
    /// @param refillCapBps Part maximale du miné du mois pour recharger le buffer (5000 = 50 %).
    constructor(address admin, address publisher, uint16 feeBps, uint16 refillCapBps) {
        if (admin == address(0) || publisher == address(0)) revert ZeroAddress();
        if (feeBps > MAX_FEE_BPS || refillCapBps > BPS) revert InvalidTerms();
        FEE_BPS = feeBps;
        REFILL_CAP_BPS = refillCapBps;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PUBLISHER_ROLE, publisher);
    }

    // ── Écriture ──────────────────────────────────────────────────────────

    /// @notice Publie l'attestation d'un mois clôturé. Les périodes avancent strictement.
    function publish(uint32 period, bytes32 merkleRoot, bytes32 reportHash, Totals calldata totals)
        external
        onlyRole(PUBLISHER_ROLE)
    {
        _checkPeriod(period);
        if (period <= latestPeriod) revert PeriodNotAfterLatest(period, latestPeriod);
        if (merkleRoot == bytes32(0)) revert EmptyRoot();
        _checkTotals(totals);

        latestPeriod = period;
        _store(period, merkleRoot, reportHash, totals);
    }

    /// @notice Corrige une période déjà publiée : ajoute une révision, l'ancienne reste consultable.
    function revise(
        uint32 period,
        bytes32 merkleRoot,
        bytes32 reportHash,
        Totals calldata totals,
        string calldata reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_attestations[period].length == 0) revert NotPublished(period);
        if (merkleRoot == bytes32(0)) revert EmptyRoot();
        _checkTotals(totals);

        uint256 revision = _store(period, merkleRoot, reportHash, totals);
        emit PeriodRevised(period, revision, reason);
    }

    // ── Lecture ───────────────────────────────────────────────────────────

    /// @notice Dernière révision d'une période, et son numéro (0 = publication d'origine).
    function attestation(uint32 period) external view returns (Attestation memory, uint256 revision) {
        uint256 count = _attestations[period].length;
        if (count == 0) revert NotPublished(period);
        return (_attestations[period][count - 1], count - 1);
    }

    /// @notice Une révision précise d'une période.
    function attestationAt(uint32 period, uint256 revision) external view returns (Attestation memory) {
        return _attestations[period][revision];
    }

    /// @notice Nombre de révisions d'une période (0 = jamais publiée).
    function revisionCount(uint32 period) external view returns (uint256) {
        return _attestations[period].length;
    }

    /// @notice Vrai si la ligne fait partie de la dernière révision de la période ET respecte les règles de l'offre.
    /// @dev    `line.vaultKey` est opaque : la chaîne ne révèle ni le client ni le vault.
    function verifyVault(uint32 period, VaultLine calldata line, bytes32[] calldata proof) public view returns (bool) {
        uint256 count = _attestations[period].length;
        if (count == 0 || !lineFollowsRules(line)) return false;
        return MerkleProof.verifyCalldata(proof, _attestations[period][count - 1].merkleRoot, vaultLeaf(period, line));
    }

    /// @notice Vérifie deux mois consécutifs d'un même vault : les deux lignes sont attestées et
    ///         la réserve d'un mois découle de la précédente (+ versé à la réserve − versé au client).
    function verifyContinuity(
        uint32 prevPeriod,
        VaultLine calldata prev,
        bytes32[] calldata prevProof,
        VaultLine calldata line,
        bytes32[] calldata proof
    ) external view returns (bool) {
        if (_nextPeriod(prevPeriod) == 0 || prev.vaultKey != line.vaultKey || prev.holdSats != line.holdSats) {
            return false;
        }
        if (uint256(prev.reserveSats) + line.toReserveSats < line.withdrawnSats) return false;
        if (uint256(prev.reserveSats) + line.toReserveSats - line.withdrawnSats != line.reserveSats) return false;
        if (uint256(prev.withdrawnTotalSats) + line.withdrawnSats != line.withdrawnTotalSats) return false;
        return verifyVault(prevPeriod, prev, prevProof) && verifyVault(_nextPeriod(prevPeriod), line, proof);
    }

    /// @notice Règles de l'offre appliquées à une ligne, sans preuve : répartition exacte du miné,
    ///         frais = FEE_BPS du miné net d'électricité, recharge plafonnée.
    function lineFollowsRules(VaultLine calldata line) public view returns (bool) {
        if (uint256(line.feeSats) + line.refillSats + line.toReserveSats != line.minedSats) return false;
        if (line.feeSats != feeFor(line.minedSats, line.electricitySats)) return false;
        return uint256(line.refillSats) * BPS <= uint256(line.minedSats) * REFILL_CAP_BPS;
    }

    /// @notice Frais Hearst pour un mois : FEE_BPS du miné net d'électricité, zéro si l'électricité dépasse le miné.
    function feeFor(uint64 minedSats, uint64 electricitySats) public view returns (uint64) {
        if (electricitySats >= minedSats) return 0;
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint64((uint256(minedSats - electricitySats) * FEE_BPS) / BPS);
    }

    /// @notice Où en est le client face à un simple achat : (réserve + déjà versé) ÷ ce qu'aurait acheté
    ///         son dépôt, en points de base (10 700 = 107 %).
    function vsHoldBps(VaultLine calldata line) external pure returns (uint256) {
        if (line.holdSats == 0) return 0;
        return ((uint256(line.reserveSats) + line.withdrawnTotalSats) * BPS) / line.holdSats;
    }

    /// @notice Feuille Merkle d'une ligne de vault, au format standard d'OpenZeppelin
    ///         (double hachage ; types : uint32 puis les dix champs de VaultLine).
    function vaultLeaf(uint32 period, VaultLine calldata line) public pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(period, line))));
    }

    // ── Interne ───────────────────────────────────────────────────────────

    function _store(uint32 period, bytes32 merkleRoot, bytes32 reportHash, Totals calldata totals)
        private
        returns (uint256 revision)
    {
        _attestations[period].push(
            Attestation({
                merkleRoot: merkleRoot,
                reportHash: reportHash,
                totals: totals,
                // casting to 'uint64' is safe because a block timestamp fits in 64 bits for billions of years
                // forge-lint: disable-next-line(unsafe-typecast)
                publishedAt: uint64(block.timestamp)
            })
        );
        revision = _attestations[period].length - 1;
        emit PeriodAttested(period, revision, merkleRoot, reportHash, totals);
    }

    /// @dev Les totaux sont des sommes de lignes arrondies vers le bas : les frais totaux ne peuvent
    ///      pas dépasser FEE_BPS du net total, ni la recharge totale son plafond.
    ///      Règles : 1 = répartition du miné, 2 = frais trop élevés, 3 = recharge trop élevée, 4 = aucun vault.
    function _checkTotals(Totals calldata t) private view {
        if (t.vaultCount == 0) revert InvalidTotals(4);
        if (uint256(t.feeSats) + t.refillSats + t.toReserveSats != t.minedSats) revert InvalidTotals(1);
        uint256 net = t.electricitySats >= t.minedSats ? 0 : t.minedSats - t.electricitySats;
        if (uint256(t.feeSats) * BPS > net * FEE_BPS) revert InvalidTotals(2);
        if (uint256(t.refillSats) * BPS > uint256(t.minedSats) * REFILL_CAP_BPS) revert InvalidTotals(3);
    }

    /// @dev Période au format AAAAMM : année 2024–2099, mois 01–12.
    function _checkPeriod(uint32 period) private pure {
        if (!_validPeriod(period)) revert InvalidPeriod(period);
    }

    function _validPeriod(uint32 period) private pure returns (bool) {
        uint32 year = period / 100;
        uint32 month = period % 100;
        return year >= 2024 && year <= 2099 && month >= 1 && month <= 12;
    }

    /// @dev Le mois suivant (202612 → 202701), 0 si la période est invalide.
    function _nextPeriod(uint32 period) private pure returns (uint32) {
        if (!_validPeriod(period)) return 0;
        return period % 100 == 12 ? (period / 100 + 1) * 100 + 1 : period + 1;
    }
}
