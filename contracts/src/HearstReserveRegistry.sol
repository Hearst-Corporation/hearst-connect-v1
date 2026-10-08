// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title Registre de réserve Hearst Connect
/// @notice Chaque mois clôturé, Hearst publie ici une attestation : une racine Merkle qui résume
///         les lignes de tous les vaults (bitcoin miné, frais Hearst, recharge du buffer, part versée
///         à la réserve, réserve cumulée), les totaux publics et l'empreinte du rapport mensuel.
///         Un client prouve que SA ligne fait partie de l'attestation avec `verifyVault`, sans que les
///         montants des autres vaults ni l'identité des clients apparaissent sur la chaîne.
/// @dev    Le contrat ne détient aucun fonds. Les attestations sont en ajout seul : une correction
///         crée une nouvelle révision (par l'administrateur, avec un motif public), l'ancienne reste lisible.
contract HearstReserveRegistry is AccessControl {
    /// @notice Rôle autorisé à publier une nouvelle période (clé opérationnelle de Hearst).
    bytes32 public constant PUBLISHER_ROLE = keccak256("PUBLISHER_ROLE");

    /// @notice Totaux publics d'une période, en satoshis (1 BTC = 100 000 000 sats).
    struct Totals {
        uint64 minedSats; // bitcoin miné par le parc pour l'ensemble des vaults
        uint64 feeSats; // frais Hearst prélevés sur le miné
        uint64 refillSats; // bitcoin vendu pour recharger les buffers d'électricité
        uint64 toReserveSats; // part versée aux réserves des clients ce mois-ci
        uint64 reserveSats; // réserves cumulées de tous les vaults en fin de mois
        uint32 vaultCount; // nombre de vaults couverts par la racine
    }

    /// @notice La ligne d'un vault pour une période, telle que remise au client avec sa preuve.
    struct VaultLine {
        bytes32 vaultKey; // identifiant opaque : keccak256(identifiant interne, sel secret)
        uint64 minedSats; // bitcoin miné pour ce vault
        uint64 feeSats; // frais Hearst
        uint64 refillSats; // vendu pour recharger son buffer d'électricité
        uint64 toReserveSats; // versé à sa réserve ce mois-ci
        uint64 reserveSats; // sa réserve cumulée en fin de mois
    }

    /// @notice Une attestation publiée pour une période.
    struct Attestation {
        bytes32 merkleRoot; // racine des lignes par vault
        bytes32 reportHash; // empreinte SHA-256 du rapport mensuel (PDF)
        Totals totals;
        uint64 publishedAt; // horodatage du bloc de publication
    }

    /// @dev période (AAAAMM, ex. 202609) → révisions, de la première à la dernière.
    mapping(uint32 period => Attestation[] revisions) private _attestations;

    /// @notice Dernière période publiée (0 tant qu'aucune).
    uint32 public latestPeriod;

    event PeriodAttested(
        uint32 indexed period, uint256 indexed revision, bytes32 merkleRoot, bytes32 reportHash, Totals totals
    );
    event PeriodRevised(uint32 indexed period, uint256 indexed revision, string reason);

    error InvalidPeriod(uint32 period);
    error PeriodNotAfterLatest(uint32 period, uint32 latest);
    error AlreadyPublished(uint32 period);
    error NotPublished(uint32 period);
    error EmptyRoot();
    error ZeroAddress();

    /// @param admin     Gouvernance (multisig Hearst) : gère les rôles et publie les corrections.
    /// @param publisher Clé opérationnelle qui publie chaque mois.
    constructor(address admin, address publisher) {
        if (admin == address(0) || publisher == address(0)) revert ZeroAddress();
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

    /// @notice Vérifie qu'une ligne de vault fait partie de la dernière révision d'une période.
    /// @dev    `line.vaultKey` est opaque (keccak256 de l'identifiant interne et d'un sel secret) :
    ///         la chaîne ne révèle ni le client ni le vault.
    function verifyVault(uint32 period, VaultLine calldata line, bytes32[] calldata proof)
        external
        view
        returns (bool)
    {
        uint256 count = _attestations[period].length;
        if (count == 0) return false;
        return MerkleProof.verifyCalldata(proof, _attestations[period][count - 1].merkleRoot, vaultLeaf(period, line));
    }

    /// @notice Feuille Merkle d'une ligne de vault, au format standard d'OpenZeppelin
    ///         (double hachage, compatible avec la bibliothèque JS merkle-tree d’OpenZeppelin côté serveur).
    function vaultLeaf(uint32 period, VaultLine calldata line) public pure returns (bytes32) {
        return keccak256(
            bytes.concat(
                keccak256(
                    abi.encode(
                        line.vaultKey,
                        period,
                        line.minedSats,
                        line.feeSats,
                        line.refillSats,
                        line.toReserveSats,
                        line.reserveSats
                    )
                )
            )
        );
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

    /// @dev Période au format AAAAMM : année 2024–2099, mois 01–12.
    function _checkPeriod(uint32 period) private pure {
        uint32 year = period / 100;
        uint32 month = period % 100;
        if (year < 2024 || year > 2099 || month == 0 || month > 12) revert InvalidPeriod(period);
    }
}
