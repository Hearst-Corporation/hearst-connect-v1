'use client'

import { AppStoreCards, type AppStoreCardItem } from '@/components/ui/app-store-cards'

/**
 * Acte 2 — Preuve. Cartes shared-layout : au clic, un domaine s'agrandit. Les visuels sont des
 * APERÇUS stylisés de la console (assets brand), pas des captures live. Dark-only : texte blanc
 * par défaut + scrim haut (app-store-cards.module.css) qui garantit la lisibilité du titre.
 */
const ITEMS: readonly AppStoreCardItem[] = [
  {
    id: 'access',
    category: 'Accès',
    title: 'Un portail unique pour tous vos espaces Hearst',
    paragraphs: [
      'Identités, autorisations et journaux d’accès vivent dans une seule console — sans multiplier les outils ni les mots de passe.',
      'Chaque membre voit uniquement ce que son rôle autorise. Dans le produit, la donnée vient du backend Hearst, jamais d’un placeholder.',
    ],
    image: '/brand/console-preview.png',
    imageStyle: { top: -40 },
  },
  {
    id: 'vaults',
    category: 'Coffres',
    title: 'Pilotage des coffres et des stratégies',
    paragraphs: [
      'Suivez l’état des coffres, les adresses de contrat et les mouvements indexés, avec un état nommé lorsque la source est absente.',
      'Les graphiques et les indicateurs ne s’inventent pas : une série vide reste vide, une indisponibilité s’affiche comme telle.',
    ],
    image: '/brand/console-glow.png',
    imageStyle: { bottom: -40, width: '120%', left: -40 },
  },
  {
    id: 'compliance',
    category: 'Conformité',
    title: 'KYC et obligations, sans angle mort',
    paragraphs: [
      'La console Conformité centralise les dossiers clients et les points de vigilance remontés par les services Hearst.',
      'Chaque statut est traçable : pas de badge vert forcé quand le backend ne confirme rien.',
    ],
    image: '/brand/console-preview.png',
    imageStyle: { top: -160, width: '200%', left: -120 },
  },
  {
    id: 'operations',
    category: 'Opérations',
    title: 'Journal des mouvements, horodaté',
    paragraphs: [
      'Opérations agrège les événements avec des libellés en français et un horodatage relatif, prêts à lire.',
      'Les mouvements se lisent tels quels, à partir de données mesurées — jamais simulées.',
    ],
    image: '/brand/console-glow.png',
    imageStyle: { top: -60, width: '110%' },
  },
] as const

/**
 * Cartes de preuve — sans en-tête interne ni nom de section : la page porte déjà le titre
 * (`aria-labelledby="preuve-heading"`), un second landmark nommé ici ferait doublon.
 */
export function AppStoreDemo() {
  return <AppStoreCards items={ITEMS} />
}
