import 'server-only'

import type { PortalAttestation } from '@/features/client-portal/load'
import { reserveRegistryAddress } from '@/lib/env'
import { chainClient, contractLink } from './client'

/**
 * LES CHIFFRES D'UN VAULT — vérifiés sur la chaîne, dans `HearstReserveRegistry`
 * (contracts/src/HearstReserveRegistry.sol).
 *
 * Chaque mois clos, Hearst publie la racine Merkle des lignes de tous les
 * vaults. Le backend remet au client SA ligne et SA preuve ; ce module demande
 * au contrat si la ligne fait partie du mois publié, respecte les règles de
 * l'offre et convertit ses montants USDC au cours de clôture publié
 * (`verifyVault`), puis lit la comparaison au simple achat
 * (`vsHoldBps`) et la date de publication (`attestation`).
 *
 * Une ligne que le contrat refuse n'est jamais affichée : elle est comptée
 * dans `rejected`, et l'écran le dit.
 */

const VAULT_LINE = {
  name: 'line',
  type: 'tuple',
  components: [
    { name: 'vaultKey', type: 'bytes32' },
    { name: 'minedSats', type: 'uint64' },
    { name: 'electricitySats', type: 'uint64' },
    { name: 'feeSats', type: 'uint64' },
    { name: 'refillSats', type: 'uint64' },
    { name: 'toReserveSats', type: 'uint64' },
    { name: 'withdrawnSats', type: 'uint64' },
    { name: 'reserveSats', type: 'uint64' },
    { name: 'withdrawnTotalSats', type: 'uint64' },
    { name: 'bufferSats', type: 'uint64' },
    { name: 'holdSats', type: 'uint64' },
    { name: 'electricityUsdc', type: 'uint64' },
    { name: 'bufferUsdc', type: 'uint64' },
  ],
} as const

const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'verifyVault',
    stateMutability: 'view',
    inputs: [{ name: 'period', type: 'uint32' }, VAULT_LINE, { name: 'proof', type: 'bytes32[]' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'vsHoldBps',
    stateMutability: 'pure',
    inputs: [VAULT_LINE],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'attestation',
    stateMutability: 'view',
    inputs: [{ name: 'period', type: 'uint32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'merkleRoot', type: 'bytes32' },
          { name: 'reportHash', type: 'bytes32' },
          {
            name: 'totals',
            type: 'tuple',
            components: [
              { name: 'minedSats', type: 'uint64' },
              { name: 'electricitySats', type: 'uint64' },
              { name: 'feeSats', type: 'uint64' },
              { name: 'refillSats', type: 'uint64' },
              { name: 'toReserveSats', type: 'uint64' },
              { name: 'withdrawnSats', type: 'uint64' },
              { name: 'reserveSats', type: 'uint64' },
              { name: 'vaultCount', type: 'uint32' },
              { name: 'btcCloseUsdE8', type: 'uint64' },
            ],
          },
          { name: 'publishedAt', type: 'uint64' },
        ],
      },
      { name: 'revision', type: 'uint256' },
    ],
  },
] as const

/** Un mois d'un vault tel que le contrat l'a vérifié, en BTC. */
export type ChainVaultMonth = Readonly<{
  period: number
  /** AAAA-MM */
  month: string
  minedBtc: number
  electricityBtc: number
  feeBtc: number
  refillBtc: number
  toReserveBtc: number
  withdrawnBtc: number
  reserveBtc: number
  withdrawnTotalBtc: number
  bufferBtc: number
  holdBtc: number
  /** Facture d'électricité du mois et buffer restant, en dollars (USDC) — vérifiés contre le cours de clôture. */
  electricityUsd: number
  bufferUsd: number
}>

/** Le livre on-chain d'un vault : ses mois vérifiés, le dernier, et d'où ils viennent. */
export type ChainVaultLedger = Readonly<{
  vaultId: string
  registry: string
  explorerUrl: string | null
  /** Mois vérifiés, du plus ancien au plus récent. */
  months: readonly ChainVaultMonth[]
  latest: ChainVaultMonth
  /** (réserve + déjà versé + buffer restant) ÷ simple achat, en % — calculé par le contrat. */
  vsHoldPct: number
  /** Publication du dernier mois vérifié sur la chaîne. */
  publishedAt: string
  revision: number
  /** Lignes remises par le backend que le contrat a refusées. */
  rejected: number
}>

const LINE_FIELDS = [
  'minedSats',
  'electricitySats',
  'feeSats',
  'refillSats',
  'toReserveSats',
  'withdrawnSats',
  'reserveSats',
  'withdrawnTotalSats',
  'bufferSats',
  'holdSats',
  'electricityUsdc',
  'bufferUsdc',
] as const

type Line = { vaultKey: `0x${string}` } & Record<(typeof LINE_FIELDS)[number], bigint>

function lineOf(raw: Readonly<Record<string, string>>): Line | null {
  const key = raw.vaultKey
  if (typeof key !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(key)) return null
  const out: Record<string, bigint> = {}
  for (const f of LINE_FIELDS) {
    const v = raw[f]
    if (typeof v !== 'string' || !/^\d+$/.test(v)) return null
    out[f] = BigInt(v)
  }
  return { vaultKey: key as `0x${string}`, ...(out as Record<(typeof LINE_FIELDS)[number], bigint>) }
}

const btc = (sats: bigint) => Number(sats) / 1e8
const monthOf = (period: number) => `${Math.floor(period / 100)}-${String(period % 100).padStart(2, '0')}`

function monthFrom(period: number, l: Line): ChainVaultMonth {
  return {
    period,
    month: monthOf(period),
    minedBtc: btc(l.minedSats),
    electricityBtc: btc(l.electricitySats),
    feeBtc: btc(l.feeSats),
    refillBtc: btc(l.refillSats),
    toReserveBtc: btc(l.toReserveSats),
    withdrawnBtc: btc(l.withdrawnSats),
    reserveBtc: btc(l.reserveSats),
    withdrawnTotalBtc: btc(l.withdrawnTotalSats),
    bufferBtc: btc(l.bufferSats),
    holdBtc: btc(l.holdSats),
    electricityUsd: Number(l.electricityUsdc) / 1e6,
    bufferUsd: Number(l.bufferUsdc) / 1e6,
  }
}

/**
 * Vérifie sur la chaîne les lignes remises par le backend, vault par vault.
 * `null` : pas de nœud ou pas de registre configuré, ou la chaîne ne répond pas.
 * Un vault sans aucune ligne vérifiée est absent de la carte.
 */
export async function readVaultLedgers(
  attestations: readonly PortalAttestation[] | null,
): Promise<ReadonlyMap<string, ChainVaultLedger> | null> {
  const client = chainClient()
  const address = reserveRegistryAddress()
  if (client === null || address === null || attestations === null) return null

  try {
    const checked = await Promise.all(
      attestations.map(async (a) => {
        const line = lineOf(a.line)
        if (line === null || !a.proof.every((p) => /^0x[0-9a-fA-F]{64}$/.test(p))) return { a, line: null, ok: false }
        const ok = await client.readContract({
          address,
          abi: REGISTRY_ABI,
          functionName: 'verifyVault',
          args: [a.period, line, a.proof as `0x${string}`[]],
        })
        return { a, line, ok }
      }),
    )

    const byVault = new Map<string, typeof checked>()
    for (const c of checked) byVault.set(c.a.vaultId, [...(byVault.get(c.a.vaultId) ?? []), c])

    const out = new Map<string, ChainVaultLedger>()
    await Promise.all(
      [...byVault].map(async ([vaultId, rows]) => {
        const good = rows
          .filter((r): r is { a: PortalAttestation; line: Line; ok: true } => r.ok && r.line !== null)
          .sort((x, y) => x.a.period - y.a.period)
        const last = good.at(-1)
        if (last === undefined) return
        const [bps, [att, revision]] = await Promise.all([
          client.readContract({ address, abi: REGISTRY_ABI, functionName: 'vsHoldBps', args: [last.line] }),
          client.readContract({ address, abi: REGISTRY_ABI, functionName: 'attestation', args: [last.a.period] }),
        ])
        out.set(vaultId, {
          vaultId,
          registry: address,
          explorerUrl: contractLink(address),
          months: good.map((r) => monthFrom(r.a.period, r.line)),
          latest: monthFrom(last.a.period, last.line),
          vsHoldPct: Number(bps) / 100,
          publishedAt: new Date(Number(att.publishedAt) * 1000).toISOString(),
          revision: Number(revision),
          rejected: rows.length - good.length,
        })
      }),
    )
    return out
  } catch {
    return null
  }
}

/** L'attestation publiée d'un mois : l'empreinte de son rapport, sa date et son numéro de révision. */
export type ChainAttestation = Readonly<{ period: number; reportHash: string; publishedAt: string; revision: number; registry: string; explorerUrl: string | null }>

export async function readAttestation(period: number): Promise<ChainAttestation | null> {
  const client = chainClient()
  const address = reserveRegistryAddress()
  if (client === null || address === null) return null
  try {
    const [att, revision] = await client.readContract({ address, abi: REGISTRY_ABI, functionName: 'attestation', args: [period] })
    return {
      period,
      reportHash: att.reportHash,
      publishedAt: new Date(Number(att.publishedAt) * 1000).toISOString(),
      revision: Number(revision),
      registry: address,
      explorerUrl: contractLink(address),
    }
  } catch {
    // Mois pas encore publié (NotPublished) ou chaîne injoignable.
    return null
  }
}
