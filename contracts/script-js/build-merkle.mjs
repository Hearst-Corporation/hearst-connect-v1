#!/usr/bin/env node
// Construit l'attestation d'un mois clôturé pour HearstReserveRegistry :
// racine Merkle, totaux publics, et la ligne + la preuve de chaque vault (à remettre au client).
//
// Usage : node build-merkle.mjs <entrée.json> <sortie.json> [rapport.pdf]
//
// L'entrée donne, par vault, les faits du mois : miné, électricité (en sats au cours de clôture),
// recharge du buffer, versement au client, et l'état du mois précédent (réserve, cumul versé).
// Le script calcule le reste avec les MÊMES règles que le contrat :
//   frais     = feeBps du miné net d'électricité (0 si l'électricité dépasse le miné)
//   réserve   = miné − frais − recharge, ajouté à la réserve du mois précédent, moins le versement
//   recharge  ≤ refillCapBps du miné
//
// L'identifiant de vault n'apparaît jamais tel quel : vaultKey = keccak256(sel ‖ identifiant).
// Le sel (32 octets en hexadécimal) vient de VAULT_KEY_SALT et ne doit jamais être commité.
// Un fichier marqué "sample": true utilise un sel public d'exemple.

import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {StandardMerkleTree} from '@openzeppelin/merkle-tree';
import {keccak256} from 'ethereum-cryptography/keccak';
import {bytesToHex, concatBytes, hexToBytes, utf8ToBytes} from 'ethereum-cryptography/utils';

// Doit rester identique à HearstReserveRegistry.vaultLeaf : la période puis les champs de VaultLine.
const LINE_FIELDS = [
  'minedSats',
  'electricitySats',
  'feeSats',
  'refillSats',
  'toReserveSats',
  'withdrawnSats',
  'reserveSats',
  'withdrawnTotalSats',
  'holdSats',
];
const LEAF_ENCODING = ['uint32', 'bytes32', ...LINE_FIELDS.map(() => 'uint64')];
const TOTAL_FIELDS = ['minedSats', 'electricitySats', 'feeSats', 'refillSats', 'toReserveSats', 'withdrawnSats', 'reserveSats'];
const INPUT_FIELDS = ['minedSats', 'electricitySats', 'refillSats', 'withdrawnSats', 'prevReserveSats', 'prevWithdrawnTotalSats', 'holdSats'];
const UINT64_MAX = 2n ** 64n - 1n;
const BPS = 10_000n;
const SAMPLE_SALT = '0x' + bytesToHex(keccak256(utf8ToBytes('hearst-sample-salt (public, exemple seulement)')));

const fail = (msg) => {
  console.error(`Erreur : ${msg}`);
  process.exit(1);
};

const [inputPath, outputPath, reportPath] = process.argv.slice(2);
if (!inputPath || !outputPath) fail('usage : node build-merkle.mjs <entrée.json> <sortie.json> [rapport.pdf]');

const input = JSON.parse(readFileSync(inputPath, 'utf8'));

// ── Sel ───────────────────────────────────────────────────────────────────
let salt = process.env.VAULT_KEY_SALT;
if (!salt) {
  if (!input.sample) fail('VAULT_KEY_SALT manquant (32 octets en hexadécimal, gardé hors du dépôt).');
  console.warn('Attention : fichier d’exemple, sel public utilisé.');
  salt = SAMPLE_SALT;
}
if (!/^0x[0-9a-fA-F]{64}$/.test(salt)) fail('VAULT_KEY_SALT doit faire 32 octets : 0x suivi de 64 caractères hexadécimaux.');
const saltBytes = hexToBytes(salt.slice(2));
const vaultKeyOf = (id) => '0x' + bytesToHex(keccak256(concatBytes(saltBytes, utf8ToBytes(id))));

// ── Règles de l'offre (doivent égaler FEE_BPS et REFILL_CAP_BPS du contrat déployé) ──
const feeBps = BigInt(input.feeBps ?? fail('feeBps manquant'));
const refillCapBps = BigInt(input.refillCapBps ?? fail('refillCapBps manquant'));
const feeFor = (mined, elec) => (elec >= mined ? 0n : ((mined - elec) * feeBps) / BPS);

// ── Contrôles et calcul des lignes ────────────────────────────────────────
const period = Number(input.period);
const year = Math.floor(period / 100);
const month = period % 100;
if (!Number.isInteger(period) || year < 2024 || year > 2099 || month < 1 || month > 12) {
  fail(`période invalide : ${input.period} (attendu AAAAMM)`);
}
if (!Array.isArray(input.vaults) || input.vaults.length === 0) fail('aucun vault dans le fichier');

const sats = (v, k) => {
  const raw = v[k];
  if (raw === undefined || !/^\d+$/.test(String(raw))) fail(`vault ${v.id} : ${k} doit être un entier de satoshis`);
  const n = BigInt(raw);
  if (n > UINT64_MAX) fail(`vault ${v.id} : ${k} dépasse uint64`);
  return n;
};

const seen = new Set();
const lines = input.vaults.map((v, i) => {
  if (typeof v.id !== 'string' || v.id === '') fail(`vault n°${i + 1} : identifiant manquant`);
  if (seen.has(v.id)) fail(`vault ${v.id} présent deux fois`);
  seen.add(v.id);
  const f = Object.fromEntries(INPUT_FIELDS.map((k) => [k, sats(v, k)]));

  const feeSats = feeFor(f.minedSats, f.electricitySats);
  if (f.refillSats * BPS > f.minedSats * refillCapBps) fail(`vault ${v.id} : recharge au-dessus du plafond`);
  if (feeSats + f.refillSats > f.minedSats) fail(`vault ${v.id} : frais + recharge dépassent le miné`);
  const toReserveSats = f.minedSats - feeSats - f.refillSats;
  if (f.prevReserveSats + toReserveSats < f.withdrawnSats) fail(`vault ${v.id} : versement supérieur à la réserve`);
  if (f.holdSats === 0n) fail(`vault ${v.id} : holdSats manquant`);

  const line = {
    minedSats: f.minedSats,
    electricitySats: f.electricitySats,
    feeSats,
    refillSats: f.refillSats,
    toReserveSats,
    withdrawnSats: f.withdrawnSats,
    reserveSats: f.prevReserveSats + toReserveSats - f.withdrawnSats,
    withdrawnTotalSats: f.prevWithdrawnTotalSats + f.withdrawnSats,
    holdSats: f.holdSats,
  };
  for (const [k, n] of Object.entries(line)) if (n > UINT64_MAX) fail(`vault ${v.id} : ${k} dépasse uint64`);
  return {id: v.id, vaultKey: vaultKeyOf(v.id), ...line};
});

// ── Arbre ─────────────────────────────────────────────────────────────────
const values = lines.map((l) => [period, l.vaultKey, ...LINE_FIELDS.map((k) => l[k].toString())]);
const tree = StandardMerkleTree.of(values, LEAF_ENCODING);

const totals = Object.fromEntries(TOTAL_FIELDS.map((k) => [k, lines.reduce((acc, l) => acc + l[k], 0n)]));
for (const [k, n] of Object.entries(totals)) if (n > UINT64_MAX) fail(`total ${k} dépasse uint64`);

const reportHash = reportPath
  ? '0x' + createHash('sha256').update(readFileSync(reportPath)).digest('hex')
  : '0x' + '0'.repeat(64);
if (!reportPath) console.warn('Attention : aucun rapport PDF fourni, reportHash vaut zéro.');

const str = (o) => Object.fromEntries(Object.entries(o).map(([k, n]) => [k, n.toString()]));
const output = {
  period,
  merkleRoot: tree.root,
  reportHash,
  feeBps: Number(feeBps),
  refillCapBps: Number(refillCapBps),
  leafEncoding: LEAF_ENCODING,
  totals: {...str(totals), vaultCount: lines.length},
  vaults: lines.map((l, i) => ({
    id: l.id,
    vaultKey: l.vaultKey,
    ...str(Object.fromEntries(LINE_FIELDS.map((k) => [k, l[k]]))),
    vsHoldBps: Number(((l.reserveSats + l.withdrawnTotalSats) * BPS) / l.holdSats),
    leaf: tree.leafHash(values[i]),
    proof: tree.getProof(i),
  })),
};

writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
console.log(`Période ${period} : ${lines.length} vaults, racine ${tree.root}`);
console.log(`→ ${outputPath}`);
