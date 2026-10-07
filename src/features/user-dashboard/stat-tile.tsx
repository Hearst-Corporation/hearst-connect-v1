'use client'

import { ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '@heroicons/react/16/solid'
import type { ComponentType, SVGProps } from 'react'
import { RichSparkline } from '@/components/charts'
import { formatPercent } from '@/lib/format'
import type { Signal } from '@/lib/vaults/model'

/**
 * Premium KPI tile — Heroicon eyebrow, label, big value, a freshness dot, an
 * optional 12-point sparkline trend and a MEASURED signed delta.
 *
 * Honest by construction: `value` is already resolved to a string ("—" when the
 * source is absent — never a fabricated 0). `delta` is passed only when a real
 * series of ≥2 points supports it (see `deltaOf`); null renders nothing. The big
 * value uses proportional figures (no tabular-nums at display size).
 */

export function deltaOf(points: readonly { readonly value: number }[] | null): number | null {
  if (points === null || points.length < 2) return null
  const first = points[0].value
  const last = points[points.length - 1].value
  if (first === 0 || !Number.isFinite(first)) return null
  return (last - first) / first
}

export function StatTile({
  icon: Icon,
  label,
  value,
  signal,
  trend,
  delta,
  meter,
  footnote,
  aside,
  tone,
}: Readonly<{
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: string
  signal: Signal
  trend?: readonly number[]
  delta?: number | null
  /** Ratio 0–1 → barre de progression sous la valeur. Pour les tuiles dont la
   *  mesure EST une proportion ; jamais une donnée dérivée d'autre chose. */
  meter?: number | null
  /** Ligne de contexte sous la valeur (ex. écart au pair). */
  footnote?: string | null
  /** Contrevaleur posée SUR LA LIGNE de la valeur, pas dessous : elle dit la
   *  même quantité dans une autre unité (« ≈ 0.1164 BTC »), là où `footnote`
   *  porte un fait distinct. Deux rôles, deux places. */
  aside?: string | null
  /** `accent` : aplat vert de marque, encre sombre. Pour LA mesure d'une
   *  rangée — celle qui porte la promesse du produit — et jamais plus d'une
   *  par écran, sans quoi l'accent cesse d'en être un. */
  tone?: 'accent'
}>) {
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta)
  const up = hasDelta && (delta as number) >= 0
  const DeltaIcon = up ? ArrowTrendingUpIcon : ArrowTrendingDownIcon

  /* La bande basse n'existe que si elle a quelque chose à porter — voir plus
     bas. Les trois conditions sont nommées ici plutôt que répétées dans le
     rendu : elles servent à décider de la bande ET de son contenu. */
  const showMeter = meter !== null && meter !== undefined && Number.isFinite(meter)
  const showTrend = trend !== undefined && trend.length >= 2
  const hasFoot = showMeter || Boolean(footnote) || showTrend

  return (
    <div className={`stat-tile${tone === 'accent' ? ' is-accent' : ''}`}>
      <div className="stat-eyebrow">
        <Icon className="size-4" aria-hidden="true" />
        <span>{label}</span>
        <i className="stat-signal" data-signal={signal} aria-hidden="true" />
      </div>
      <div className="stat-value-row">
        <strong className="stat-value mono">{value}</strong>
        {aside ? <span className="stat-aside mono">{aside}</span> : null}
        {hasDelta ? (
          <span className={`stat-delta mono${up ? ' is-up' : ' is-down'}`}>
            <DeltaIcon className="size-3" aria-hidden="true" />
            {formatPercent((delta as number) * 100, { maximumFractionDigits: 1, signed: true })}
          </span>
        ) : null}
      </div>
      {/* Bande basse commune : barre, note ou sparkline occupent la MÊME rangée
          d'une tuile à l'autre, pour que la ligne du bas soit continue.

          Rendue SEULEMENT si elle porte quelque chose : vide, elle occupait
          quand même sa rangée et poussait libellé et valeur vers le haut, ce
          qui creusait un vide sous le chiffre — visible sur la ligne « Your
          position », dont aucune tuile n'a de jauge. Les rangées des tuiles qui
          ont un complément restent alignées entre elles, puisque leur bande, elle,
          existe toujours. */}
      {hasFoot ? (
        <div className="stat-foot">
          {showMeter ? (
            <div className="stat-meter" role="presentation">
              <span style={{ width: `${Math.max(0, Math.min(100, meter * 100))}%` }} />
            </div>
          ) : null}
          {footnote ? <p className="stat-footnote">{footnote}</p> : null}
          {showTrend ? (
            <div className="stat-spark">
              <RichSparkline data={[...trend]} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
