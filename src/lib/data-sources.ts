import { apiGet } from './api-client'
import { resolved, type Resolved } from './resolved'

/**
 * Sources de données du dashboard — état réel du branchement.
 *
 * Le backend `connect-api.hearst.app` (`Hearst-Corporation/hearst-connect-backend`)
 * sert le produit financier : `/api/v1/{dashboard,btc,mining,vault,series1,
 * backtest,rebalancing,profile,runtime,ai/context/*}`. Il n'expose aujourd'hui
 * **aucune** route de gestion d'accès — ni membres, ni journal d'accès, ni
 * connecteurs d'annuaire, ni espaces de travail.
 *
 * Les surfaces ci-dessous sont donc déclarées non branchées, avec la raison
 * exacte. Aucune n'invente de contenu en attendant : elles rendent un état.
 * Le jour où une route existe, elle se déclare ici, et là seulement.
 */

export type Workspace = { id: string; name: string; region: string; members: number | null }
export type Member = { id: string; name: string; email: string; role: string; team: string | null; status: string }
export type AccessEvent = {
  id: string
  actor: string
  actorEmail: string
  workspace: string
  action: string
  channel: string
  status: string
  at: string
}
export type Connection = { id: string; name: string; kind: string; status: string; since: string | null }

/** Raison unique, factuelle, partagée par les surfaces non exposées. */
const NO_ACCESS_API =
  "Le backend Hearst Connect n'expose aucune route de gestion d'accès : son contrat couvre le produit financier (dashboard, btc, mining, vault, series1, backtest). Aucun endpoint ne correspond à cette surface."

/**
 * Sonde de disponibilité — la seule route réellement appelable aujourd'hui.
 * Sert à distinguer « backend injoignable » de « backend là, surface absente ».
 */
export async function fetchBackendHealth(): Promise<Resolved<{ status: string }>> {
  const result = await apiGet<{ status?: string }>('/health', { enveloped: false })

  if (!result.ok) return result.failure as Resolved<{ status: string }>

  const status = typeof result.data?.status === 'string' ? result.data.status : null
  return status === null
    ? resolved.error('Réponse /health hors contrat.', { route: '/health', requestId: result.requestId })
    : resolved.live({ status }, { route: '/health', field: 'status', requestId: result.requestId })
}

export async function fetchWorkspaces(): Promise<Resolved<Workspace[]>> {
  return resolved.notConfigured<Workspace[]>(NO_ACCESS_API)
}

export async function fetchMembers(): Promise<Resolved<Member[]>> {
  return resolved.notConfigured<Member[]>(NO_ACCESS_API)
}

export async function fetchAccessEvents(): Promise<Resolved<AccessEvent[]>> {
  return resolved.notConfigured<AccessEvent[]>(NO_ACCESS_API)
}

export async function fetchConnections(): Promise<Resolved<Connection[]>> {
  return resolved.notConfigured<Connection[]>(NO_ACCESS_API)
}
