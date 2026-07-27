/**
 * Données de DÉMONSTRATION.
 *
 * Ce module ne parle à aucune base : il alimente le dashboard le temps que la
 * source de données réelle soit branchée. Les écrans qui l'utilisent l'annoncent
 * explicitement — rien ici ne doit être présenté comme une mesure réelle
 * (doctrine Hearst §3).
 */

export type AccessEvent = {
  id: string
  workspace: string
  actor: string
  actorEmail: string
  action: string
  channel: 'SSO' | 'API' | 'Console'
  status: 'Autorisé' | 'Refusé' | 'En attente'
  at: string
}

export type Member = {
  id: string
  name: string
  email: string
  role: 'Propriétaire' | 'Administrateur' | 'Membre'
  team: string
  status: 'Actif' | 'Invité' | 'Suspendu'
  initials: string
}

export type Workspace = {
  id: string
  name: string
  region: string
  members: number
  connections: number
}

export const accessEvents: AccessEvent[] = [
  {
    id: 'evt_8412',
    workspace: 'Hearst Corporation',
    actor: 'Adrien',
    actorEmail: 'adrien@hearstcorporation.io',
    action: 'Connexion console',
    channel: 'Console',
    status: 'Autorisé',
    at: '27 juil. 2026, 09:14',
  },
  {
    id: 'evt_8411',
    workspace: 'Hearst Corporation',
    actor: 'Service de facturation',
    actorEmail: 'billing@hearstcorporation.io',
    action: 'Rotation de clé API',
    channel: 'API',
    status: 'Autorisé',
    at: '27 juil. 2026, 08:02',
  },
  {
    id: 'evt_8409',
    workspace: 'Atelier Nord',
    actor: 'Camille Fournier',
    actorEmail: 'camille@atelier-nord.fr',
    action: 'Accès au registre clients',
    channel: 'SSO',
    status: 'En attente',
    at: '26 juil. 2026, 18:47',
  },
  {
    id: 'evt_8404',
    workspace: 'Atelier Nord',
    actor: 'Poste inconnu',
    actorEmail: 'unknown@—',
    action: 'Tentative depuis une IP non listée',
    channel: 'API',
    status: 'Refusé',
    at: '26 juil. 2026, 16:31',
  },
  {
    id: 'evt_8398',
    workspace: 'Hearst Corporation',
    actor: 'Léa Marchand',
    actorEmail: 'lea@hearstcorporation.io',
    action: 'Invitation acceptée',
    channel: 'SSO',
    status: 'Autorisé',
    at: '25 juil. 2026, 11:05',
  },
  {
    id: 'evt_8390',
    workspace: 'Studio Lyon',
    actor: 'Noé Berthier',
    actorEmail: 'noe@studio-lyon.fr',
    action: 'Export du journal d’accès',
    channel: 'Console',
    status: 'Autorisé',
    at: '24 juil. 2026, 15:22',
  },
]

export const members: Member[] = [
  {
    id: 'usr_01',
    name: 'Adrien',
    email: 'adrien@hearstcorporation.io',
    role: 'Propriétaire',
    team: 'Direction',
    status: 'Actif',
    initials: 'A',
  },
  {
    id: 'usr_02',
    name: 'Léa Marchand',
    email: 'lea@hearstcorporation.io',
    role: 'Administrateur',
    team: 'Opérations',
    status: 'Actif',
    initials: 'LM',
  },
  {
    id: 'usr_03',
    name: 'Camille Fournier',
    email: 'camille@atelier-nord.fr',
    role: 'Membre',
    team: 'Atelier Nord',
    status: 'Invité',
    initials: 'CF',
  },
  {
    id: 'usr_04',
    name: 'Noé Berthier',
    email: 'noe@studio-lyon.fr',
    role: 'Membre',
    team: 'Studio Lyon',
    status: 'Actif',
    initials: 'NB',
  },
  {
    id: 'usr_05',
    name: 'Yasmine Attia',
    email: 'yasmine@hearstcorporation.io',
    role: 'Membre',
    team: 'Sécurité',
    status: 'Suspendu',
    initials: 'YA',
  },
]

export const workspaces: Workspace[] = [
  { id: 'ws_hearst', name: 'Hearst Corporation', region: 'eu-west-3', members: 12, connections: 34 },
  { id: 'ws_nord', name: 'Atelier Nord', region: 'eu-west-3', members: 5, connections: 9 },
  { id: 'ws_lyon', name: 'Studio Lyon', region: 'eu-central-1', members: 7, connections: 11 },
]

export const connections = [
  { id: 'cnx_okta', name: 'Okta', kind: 'Fournisseur d’identité', status: 'Connecté', since: 'mars 2026' },
  { id: 'cnx_gsuite', name: 'Google Workspace', kind: 'Annuaire', status: 'Connecté', since: 'janv. 2026' },
  { id: 'cnx_scim', name: 'SCIM v2', kind: 'Provisionnement', status: 'Connecté', since: 'mai 2026' },
  { id: 'cnx_slack', name: 'Slack', kind: 'Notifications', status: 'À configurer', since: '—' },
]
