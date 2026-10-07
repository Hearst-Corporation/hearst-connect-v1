export type View = 'all' | 'onUs' | 'pipeline' | 'active' | 'closed'

/** La vue dans l'adresse : `/admin/clients/active`, `/admin/clients/waiting`… */
export const CLIENT_VIEW_PATH: Record<View, string> = {
  all: '/admin/clients',
  onUs: '/admin/clients/waiting',
  pipeline: '/admin/clients/pipeline',
  active: '/admin/clients/active',
  closed: '/admin/clients/closed',
}
