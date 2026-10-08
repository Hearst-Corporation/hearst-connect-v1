#!/usr/bin/env node
// Construit l'attestation d'un mois clôturé pour HearstReserveRegistry :
// racine Merkle, totaux publics, et la preuve de chaque vault (à remettre au client avec sa ligne).
//
// Usage : node build-merkle.mjs <entrée.json> <sortie.json> [rapport.pdf]
//
// L'identifiant de vault n'apparaît jamais tel quel : vaultKey = keccak256(sel ‖ identifiant).
// Le sel (32 octets en hexadécimal) vient de la variable VAULT_KEY_SALT et ne doit jamais être commité.
// Un fichier marqué "sample": true utilise un sel public d'exemple.

import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {StandardMerkleTree} from '@openzeppelin/merkle-tree';
import {keccak256} from 'ethereum-cryptography/keccak';
import {bytesToHex, concatBytes, hexToBytes, utf8ToBytes} from 'ethereum-cryptography/utils';

// Doit rester identique à HearstReserveRegistry.vaultLeaf.
const LEAF_ENCODING = ['bytes32', 'uint32', 'uint64', 'uint64', 'uint64', 'uint64', 'uint64'];
const AMOUNTS = ['minedSats', 'feeSats', 'refillSats', 'toReserveSats', 'reserveSats'];
const UINT64_MAX = 2n ** 64n - 1n;
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

// ── Contrôles ─────────────────────────────────────────────────────────────
const period = Number(input.period);
const year = Math.floor(period / 100);
const month = period % 100;
if (!Number.isInteger(period) || year < 2024 || year > 2099 || month < 1 || month > 12) {
  fail(`période invalide : ${input.period} (attendu AAAAMM)`);
}
if (!Array.isArray(input.vaults) || input.vaults.length === 0) fail('aucun vault dans le fichier');

const seen = new Set();
const lines = input.vaults.map((v, i) => {
  if (typeof v.id !== 'string' || v.id === '') fail(`vault n°${i + 1} : identifiant manquant`);
  if (seen.has(v.id)) fail(`vault ${v.id} présent deux fois`);
  seen.add(v.id);

  const amounts = Object.fromEntries(
    AMOUNTS.map((k) => {
      const raw = v[k];
      if (raw === undefined || !/^\d+$/.test(String(raw))) fail(`vault ${v.id} : ${k} doit être un entier de satoshis`);
      const n = BigInt(raw);
      if (n > UINT64_MAX) fail(`vault ${v.id} : ${k} dépasse uint64`);
      return [k, n];
    }),
  );

  // Le miné se répartit entre frais, recharge du buffer et réserve : pas un satoshi de plus ou de moins.
  if (amounts.feeSats + amounts.refillSats + amounts.toReserveSats !== amounts.minedSats) {
    fail(`vault ${v.id} : frais + recharge + réserve ≠ miné`);
  }
  if (input.feeBps !== undefined && amounts.feeSats !== (amounts.minedSats * BigInt(input.feeBps)) / 10_000n) {
    fail(`vault ${v.id} : frais différents de ${input.feeBps / 100} % du miné`);
  }
  if (amounts.reserveSats < amounts.toReserveSats) fail(`vault ${v.id} : réserve cumulée inférieure au versement du mois`);

  return {id: v.id, vaultKey: vaultKeyOf(v.id), ...amounts};
});

// ── Arbre ─────────────────────────────────────────────────────────────────
const values = lines.map((l) => [l.vaultKey, period, ...AMOUNTS.map((k) => l[k].toString())]);
const tree = StandardMerkleTree.of(values, LEAF_ENCODING);

const sum = (k) => lines.reduce((acc, l) => acc + l[k], 0n);
const totals = Object.fromEntries(AMOUNTS.map((k) => [k, sum(k)]));
for (const [k, n] of Object.entries(totals)) if (n > UINT64_MAX) fail(`total ${k} dépasse uint64`);

const reportHash = reportPath
  ? '0x' + createHash('sha256').update(readFileSync(reportPath)).digest('hex')
  : '0x' + '0'.repeat(64);
if (!reportPath) console.warn('Attention : aucun rapport PDF fourni, reportHash vaut zéro.');

const output = {
  period,
  merkleRoot: tree.root,
  reportHash,
  leafEncoding: LEAF_ENCODING,
  totals: {...Object.fromEntries(AMOUNTS.map((k) => [k, totals[k].toString()])), vaultCount: lines.length},
  vaults: lines.map((l, i) => ({
    id: l.id,
    vaultKey: l.vaultKey,
    ...Object.fromEntries(AMOUNTS.map((k) => [k, l[k].toString()])),
    leaf: tree.leafHash(values[i]),
    proof: tree.getProof(i),
  })),
};

writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
console.log(`Période ${period} : ${lines.length} vaults, racine ${tree.root}`);
console.log(`→ ${outputPath}`);
