'use client'

import { AppStoreCards, type AppStoreCardItem } from '@/components/ui/app-store-cards'

const ITEMS: readonly AppStoreCardItem[] = [
  {
    id: 'access',
    category: 'Accès',
    title: 'Un portail unique pour tous vos espaces Hearst',
    paragraphs: [
      'Hearst Connect regroupe identités, autorisations et journaux d’accès dans une console unique — sans multiplier les outils ni les mots de passe.',
      'Chaque membre voit uniquement ce que son rôle autorise : la donnée affichée vient du backend, jamais d’un placeholder.',
    ],
    image: '/brand/console-preview.png',
    imageStyle: { top: -120 },
    theme: 'light',
  },
  {
    id: 'vaults',
    category: 'Coffres',
    title: 'Pilotage des vaults et des stratégies',
    paragraphs: [
      'Suivez l’état des coffres, les adresses de contrat et les mouvements indexés — avec un état nommé quand la source est absente.',
      'Les graphiques et KPIs ne s’inventent pas : une série vide reste vide, une indisponibilité s’affiche comme telle.',
    ],
    image: '/brand/console-glow.png',
    imageStyle: { bottom: -40, width: '110%', left: -20 },
    theme: 'dark',
  },
  {
    id: 'compliance',
    category: 'Conformité',
    title: 'KYC et obligations, sans angle mort',
    paragraphs: [
      'La console Conformité centralise les dossiers clients et les points de vigilance issus des endpoints Railway.',
      'Chaque statut est traçable : pas de badge vert forcé quand le backend ne confirme rien.',
    ],
    image: '/brand/console-preview.png',
    theme: 'dark',
    imageStyle: { width: '200%', left: -100 },
  },
  {
    id: 'operations',
    category: 'Opérations',
    title: 'Journal des mouvements en temps réel',
    paragraphs: [
      'Opérations agrège les événements on-chain et off-chain avec libellés en français et horodatage relatif.',
      'Filtrez, inspectez, exportez — toujours à partir de données mesurées, jamais simulées.',
    ],
    image: '/brand/console-glow.png',
    imageStyle: { bottom: -80 },
    theme: 'light',
  },
] as const

/** Motion App Store shared-layout — copy et visuels Hearst Connect. */
export function AppStoreDemo() {
  return (
    <AppStoreCards
      title="Aujourd’hui"
      avatarSrc="/brand/hearst-h.svg"
      avatarAlt="Monogramme Hearst"
      items={ITEMS}
    />
  )
}
