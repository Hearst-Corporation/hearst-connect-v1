import {
  formatAddress,
  formatCurrency,
  formatDateTime,
  formatDriftPts,
  formatHash,
  formatNumber,
  formatPercent,
} from '@/lib/format'
import { describe, expect, it } from 'vitest'

/**
 * `src/lib/format.ts` se déclare « single source of truth » du formatage et
 * n'avait aucun test propre. Le LOT C y a routé plusieurs sites qui
 * formataient à la main ; ce fichier verrouille le contrat sur lequel ils
 * s'appuient désormais — en particulier LA règle du produit :
 *
 *   une valeur absente ne devient jamais un zéro.
 *
 * Les limites testées sont celles qui font la différence entre une console
 * honnête et une console qui invente : null, undefined, NaN, Infinity, et le
 * zéro réellement mesuré — qui, lui, doit s'afficher.
 */

describe('formatNumber', () => {
  it('rend « — » pour une valeur absente ou non finie', () => {
    expect(formatNumber(null)).toBe('—')
    expect(formatNumber(undefined)).toBe('—')
    expect(formatNumber(Number.NaN)).toBe('—')
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('—')
    expect(formatNumber(Number.NEGATIVE_INFINITY)).toBe('—')
  })

  it('rend 0 quand le backend a mesuré 0 — une absence n’est pas un zéro', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('groupe les milliers et respecte la précision demandée', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
    expect(formatNumber(1.23456, { maximumFractionDigits: 2 })).toBe('1.23')
  })
})

describe('formatPercent', () => {
  it('rend « — » pour une valeur absente ou non finie', () => {
    expect(formatPercent(null)).toBe('—')
    expect(formatPercent(undefined)).toBe('—')
    expect(formatPercent(Number.NaN)).toBe('—')
  })

  it('convertit les points de base quand fromBps est demandé', () => {
    // 250 bps = 2,5 %. C'est le contrat sur lequel `partLisible` (btc/page.tsx)
    // s'appuie depuis le LOT C.
    expect(formatPercent(250, { fromBps: true, maximumFractionDigits: 2 })).toBe('2.5%')
    expect(formatPercent(10_000, { fromBps: true })).toBe('100%')
  })

  it('n’ajoute un signe que sur une valeur positive et si on le demande', () => {
    expect(formatPercent(3.2, { signed: true })).toBe('+3.2%')
    expect(formatPercent(-3.2, { signed: true })).toBe('-3.2%')
    expect(formatPercent(0, { signed: true })).toBe('0%')
    expect(formatPercent(3.2)).toBe('3.2%')
  })
})

describe('formatDriftPts', () => {
  it('rend « — » pour une valeur absente ou non finie', () => {
    expect(formatDriftPts(null)).toBe('—')
    expect(formatDriftPts(undefined)).toBe('—')
    expect(formatDriftPts(Number.NaN)).toBe('—')
  })

  it('convertit les bps en points, avec signe sur le positif', () => {
    expect(formatDriftPts(250)).toBe('+2.5 pt')
    expect(formatDriftPts(-80)).toBe('-0.8 pt')
    expect(formatDriftPts(0)).toBe('0 pt')
  })
})

describe('formatCurrency', () => {
  it('rend « — » pour une valeur absente, vide ou illisible', () => {
    expect(formatCurrency(null)).toBe('—')
    expect(formatCurrency(undefined)).toBe('—')
    expect(formatCurrency('')).toBe('—')
    expect(formatCurrency('pas-un-nombre')).toBe('—')
  })

  it('convertit depuis les unités atomiques (6 décimales par défaut)', () => {
    expect(formatCurrency('1000000')).toBe('$1')
    expect(formatCurrency('1500000')).toBe('$1.5')
    expect(formatCurrency(2_000_000, { unit: '€' })).toBe('€2')
  })

  it('rend 0 mesuré, sans le confondre avec une absence', () => {
    expect(formatCurrency('0')).toBe('$0')
  })
})

describe('formatDateTime', () => {
  it('nomme l’absence au lieu d’inventer une date', () => {
    expect(formatDateTime(null)).toBe('unknown date')
    expect(formatDateTime(undefined)).toBe('unknown date')
    expect(formatDateTime('')).toBe('unknown date')
    expect(formatDateTime('pas-une-date')).toBe('unknown date')
  })

  it('formate une date ISO valide', () => {
    // Pas d'assertion sur la chaîne exacte : elle dépend du fuseau de la
    // machine. Ce qui est garanti, c'est que l'entrée valide ne retombe pas
    // sur le libellé d'absence.
    expect(formatDateTime('2026-08-04T12:30:00.000Z')).not.toBe('unknown date')
  })
})

describe('formatAddress / formatHash', () => {
  it('rendent null — et non « — » — pour que l’appelant puisse ne rien rendre', () => {
    expect(formatAddress(null)).toBeNull()
    expect(formatAddress(undefined)).toBeNull()
    expect(formatAddress('')).toBeNull()
    expect(formatHash(null)).toBeNull()
  })

  it('laissent intacte une valeur trop courte pour être tronquée', () => {
    expect(formatAddress('0x1234')).toBe('0x1234')
  })

  it('tronquent une adresse longue par le milieu', () => {
    expect(formatAddress('0x66df1234567890abcdef1234567890abcdef1234')).toBe('0x66df…1234')
  })
})
