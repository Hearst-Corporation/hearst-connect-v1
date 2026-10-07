/**
 * L'adresse d'un relevé : `/account/documents/2028-09/vault-2` (un mois, un
 * vault) ou `/account/documents/2028` (le rapport annuel). Ni `?` ni `=`.
 */
export function statementHref(period: string, vault?: number | string): string {
  return `/account/documents/${period}${vault !== undefined && vault !== '' && period.length > 4 ? `/vault-${vault}` : ''}`
}
