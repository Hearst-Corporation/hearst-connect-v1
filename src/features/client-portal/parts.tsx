/* Les formats de l'espace client — partagés par ses écrans (relevés). */

export const btc = (n: number, d = 4) => `${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })} BTC`
export const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
export const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
