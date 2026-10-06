'use client'

/**
 * Le pendant mobile d'un sélecteur `.ud-seg` : sous 768px, les pilules ne
 * tiennent plus sur une ligne et la piste perdait sa forme en passant à la
 * ligne. Comme sur /account, un `select` natif blanc les remplace — le même
 * `chart-switch-select`, que le CSS ne montre que sous 768px.
 *
 * Les deux vivent dans le DOM et partagent UN état : la piste porte la classe
 * `seg-collapsible`, que le CSS masque à cette largeur. Aucune détection de
 * largeur en JS, aucune désynchronisation possible.
 */
export function SegSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: Readonly<{
  label: string
  value: T
  options: readonly Readonly<{ value: T; label: string }>[]
  onChange: (value: T) => void
  className?: string
}>) {
  return (
    <select
      className={`chart-switch-select seg-select${className ? ` ${className}` : ''}`}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
