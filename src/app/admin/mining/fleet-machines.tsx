import { DashCard, PanelState } from '@/components/admin/dashboard'
import { formatNumber } from '@/lib/format'
import { FleetMachineTable } from './fleet-machine-table'

/**
 * Le parc, machine par machine.
 *
 * Quatre compteurs ne disaient rien de ce qu'on exploite : on voyait « 96 » et
 * « 94 », jamais OÙ, QUOI, depuis QUAND, ni combien chaque machine produit.
 * Ici : les quatre chiffres qui résument le parc, sa répartition par site (là
 * où se jouent l'énergie et le risque pays), puis la liste — chaque machine
 * avec son modèle, sa mise en service, sa puissance, son uptime et sa
 * production. Les machines hors ligne remontent en tête : c'est elles qu'on
 * va chercher.
 */

export type Machine = {
  readonly id: string
  readonly model: string
  readonly site: string
  readonly country: string
  readonly pluggedAt: string
  readonly hashrateThs: number
  readonly efficiencyJth: number | null
  readonly uptime30dPct: number
  readonly btcProduced30d: number
  readonly status: 'online' | 'offline' | string
  /** Le vault client auquel la machine est affectée. */
  readonly vaultId?: string | null
}

const phs = (ths: number) => `${formatNumber(ths / 1000, { maximumFractionDigits: 1 })} PH/s`

export function FleetMachines({ machines }: Readonly<{ machines: readonly Machine[] | null }>) {
  if (machines === null || machines.length === 0) {
    return (
      <DashCard eyebrow="Fleet" title="Compute infrastructure" subtitle="The machines that produce the bitcoin">
        <PanelState title="The machine registry could not be read." />
      </DashCard>
    )
  }


  const sites = [...machines.reduce((map, m) => {
    const key = `${m.site} · ${m.country}`
    const cur = map.get(key) ?? { ths: 0, count: 0 }
    return map.set(key, { ths: cur.ths + m.hashrateThs, count: cur.count + 1 })
  }, new Map<string, { ths: number; count: number }>())].sort((a, b) => b[1].ths - a[1].ths)
  const maxSite = Math.max(...sites.map(([, v]) => v.ths), 1)

  const ordered = [...machines].sort(
    (a, b) => Number(a.status === 'online') - Number(b.status === 'online') || b.hashrateThs - a.hashrateThs,
  )

  return (
    <DashCard
      eyebrow="Fleet"
      title="Compute infrastructure"
      subtitle={`${formatNumber(machines.length)} machines on ${sites.length} sites — the same fleet the client’s share is cut from`}
    >
      <div className="flex flex-col gap-6">
        {/* La répartition par site : où est la puissance. */}
        <div>
          <p className="mb-3 text-xs text-fg-tertiary">Hashrate by site</p>
          {/* Hauteur de ligne fixe : chaque site occupe la même rangée, et le
              libellé de droite ne passe plus sur deux lignes. */}
          <ul className="flex flex-col gap-1.5">
            {sites.map(([name, v]) => (
              <li key={name} className="grid h-7 grid-cols-[14rem_minmax(0,1fr)_11rem] items-center gap-4">
                <span className="truncate text-sm text-fg">{name}</span>
                <span className="h-2 rounded-full bg-[var(--ud-inset)]">
                  <span className="block h-full rounded-full bg-[var(--hearst-green)]" style={{ width: `${(v.ths / maxSite) * 100}%` }} />
                </span>
                <span className="text-right text-xs whitespace-nowrap tabular-nums text-fg-tertiary">
                  {phs(v.ths)} · {formatNumber(v.count)} machines
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* La liste : les machines hors ligne d'abord, cinq, puis paginée. */}
        <FleetMachineTable machines={ordered} />
      </div>
    </DashCard>
  )
}
