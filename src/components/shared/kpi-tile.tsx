import type { ComponentType, SVGProps } from 'react'

/**
 * La tuile KPI du produit — la MÊME des deux côtés.
 *
 * Le client et l'administrateur regardent les mêmes faits : un chiffre, ce
 * qu'il mesure, et d'où il vient. Ils les regardaient pourtant à travers deux
 * jeux de composants distincts — `StatTile` côté /account, `BentoCard` et
 * `DashCard` côté /admin — réglés séparément, donc dérivant l'un de l'autre à
 * chaque retouche.
 *
 * Cette tuile porte le réglage arrêté sur /account : picto cerclé en vert,
 * libellé en 11px gris, valeur en 28px, note de pied à 3px sous sa jauge. Elle
 * n'a AUCUNE dépendance au CSS de /account — tout passe par les tokens globaux
 * (`--color-fg*`, `--color-console-*`), qui portent déjà les mêmes valeurs des
 * deux côtés.
 *
 * Honnête par construction : `value` arrive déjà résolue en chaîne — « — »
 * quand la source est absente, jamais un zéro fabriqué.
 */

export type KpiTone = 'default' | 'accent'

export function KpiTile({
  icon: Icon,
  label,
  value,
  unit,
  footnote,
  meterPct,
  tone = 'default',
}: Readonly<{
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  /** Déjà résolue : « — » pour une absence, jamais un zéro inventé. */
  value: string
  /** Unité courte à droite du chiffre, dans un corps plus petit. */
  unit?: string
  footnote?: string
  /** Part remplie de la jauge, en pourcentage. Absente = pas de jauge. */
  meterPct?: number | null
  tone?: KpiTone
}>) {
  const accent = tone === 'accent'

  return (
    <div
      className={
        accent
          ? 'flex flex-col gap-1 rounded-xl bg-[#9eea7a] px-4 py-3.5 text-[#06140a]'
          : 'flex flex-col gap-1 rounded-xl border border-console-line bg-console-card px-4 py-3.5'
      }
    >
      <div
        className={`flex items-center gap-1.5 text-[11px] ${accent ? 'text-[#06140a]/70' : 'text-fg-tertiary'}`}
      >
        {Icon !== undefined ? (
          <Icon className={`size-4 ${accent ? 'text-[#06140a]' : 'text-accent-400'}`} />
        ) : null}
        <span className="truncate">{label}</span>
      </div>

      <div className="flex items-baseline gap-1.5">
        {/* 28px : le corps arrêté pour les grands chiffres du produit. Chiffres
            proportionnels, pas tabulaires — à cette taille le tabulaire creuse
            des blancs entre les glyphes. */}
        <span className="text-[28px] leading-none font-medium tracking-[-0.02em]">{value}</span>
        {unit !== undefined ? (
          <span className={`text-sm ${accent ? 'text-[#06140a]/70' : 'text-fg-tertiary'}`}>
            {unit}
          </span>
        ) : null}
      </div>

      {/* La bande de pied n'existe QUE si elle porte quelque chose : rendue à
          vide, elle creusait un blanc sous le chiffre. */}
      {meterPct !== null && meterPct !== undefined ? (
        <div
          className={`mt-1.5 h-1 overflow-hidden rounded-full ${accent ? 'bg-[#06140a]/20' : 'bg-console-inset'}`}
        >
          <div
            className={`h-full rounded-full ${accent ? 'bg-[#06140a]' : 'bg-accent-400'}`}
            style={{ width: `${Math.min(Math.max(meterPct, 0), 100)}%` }}
          />
        </div>
      ) : null}

      {footnote !== undefined ? (
        <div
          className={`mt-[3px] text-[11px] ${accent ? 'text-[#06140a]/70' : 'text-fg-tertiary'}`}
        >
          {footnote}
        </div>
      ) : null}
    </div>
  )
}
