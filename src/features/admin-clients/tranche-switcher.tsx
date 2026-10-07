'use client'

import { SegSelect } from '@/components/admin/seg-select'
import { Link } from '@/components/catalyst/link'
import { useRouter } from 'next/navigation'

/**
 * LE CHOIX DE LA TRANCHE — en tête de la fiche, avant tout chiffre.
 *
 * Chaque versement a ouvert son propre vault : ses machines, ses dépôts et
 * retraits, ses rééquilibrages, ses rewards, son échéance. Rien n'est commun.
 * La fiche entière se lit donc POUR UNE tranche, et ce sélecteur dit laquelle ;
 * le total du client reste écrit à côté, pour ne pas le perdre de vue.
 *
 * Le sélecteur de la console (`.ud-seg`) ; sous 768px, le select blanc de
 * /account, comme les autres sous-menus.
 */
export type TrancheTab = Readonly<{ vaultId: string; label: string; detail: string; href: string }>

export function TrancheSwitcher({
  tabs,
  active,
  total,
}: Readonly<{ tabs: readonly TrancheTab[]; active: string; total: string }>) {
  const router = useRouter()
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <SegSelect
        label="Tranche"
        value={active}
        options={tabs.map((t) => ({ value: t.vaultId, label: `${t.label} · ${t.detail}` }))}
        onChange={(vaultId) => {
          const tab = tabs.find((t) => t.vaultId === vaultId)
          if (tab) router.push(tab.href)
        }}
      />
      <nav aria-label="Tranches" className="ud-seg seg-collapsible">
        {tabs.map((t) => (
          <Link
            key={t.vaultId}
            href={t.href}
            aria-current={t.vaultId === active ? 'page' : undefined}
            className={`ud-seg-btn inline-flex items-center gap-2 no-underline${t.vaultId === active ? ' active' : ''}`}
          >
            {t.label}
            <span className="tabular-nums opacity-60">{t.detail}</span>
          </Link>
        ))}
      </nav>
      <p className="text-xs text-fg-tertiary">{total}</p>
    </div>
  )
}
