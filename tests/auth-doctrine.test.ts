import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Garde-fous de doctrine vérifiés sur le CODE SOURCE lui-même.
 *
 * Une règle qui n'est écrite que dans un document n'est pas une règle. Ces
 * tests échouent si l'ancien pont HMAC revient, ou si un jeton backend
 * s'approche d'un composant client.
 */

const ROOT = resolve(import.meta.dirname, '..')
const SRC = join(ROOT, 'src')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

const SOURCES = walk(SRC).map((file) => ({ path: relative(ROOT, file), code: readFileSync(file, 'utf8') }))

/** Fichiers portant la directive `'use client'` : leur contenu part au navigateur. */
const CLIENT_FILES = SOURCES.filter(({ code }) => /^\s*['"]use client['"]/m.test(code))

describe('le frontend ne signe plus aucun jeton backend', () => {
  it('ne lit SESSION_SIGNING_KEY nulle part dans src/', () => {
    const offenders = SOURCES.filter(({ code }) => code.includes('SESSION_SIGNING_KEY')).map((f) => f.path)
    expect(offenders).toEqual([])
  })

  it('ne contient plus de module de frappe de jeton', () => {
    const offenders = SOURCES.filter(
      ({ code }) => code.includes('mintBackendToken') || code.includes('verifyBackendToken'),
    ).map((f) => f.path)
    expect(offenders).toEqual([])
  })

  it('n’expose aucune variable NEXT_PUBLIC_ portant un secret ou un jeton', () => {
    const offenders = SOURCES.filter(({ code }) =>
      /NEXT_PUBLIC_[A-Z0-9_]*(TOKEN|SECRET|KEY|PASSWORD)/.test(code),
    ).map((f) => f.path)
    expect(offenders).toEqual([])
  })
})

describe('le jeton backend ne quitte jamais le serveur', () => {
  it('aucun fichier « use client » ne mentionne backendToken', () => {
    const offenders = CLIENT_FILES.filter(({ code }) => code.includes('backendToken')).map((f) => f.path)
    expect(offenders).toEqual([])
  })

  it('aucun fichier « use client » n’importe le client backend ni le module d’auth backend', () => {
    const offenders = CLIENT_FILES.filter(({ code }) =>
      /from\s+['"](@\/lib\/backend\/(client|auth)|\.\.?\/(client|auth))['"]/.test(code),
    ).map((f) => f.path)
    expect(offenders).toEqual([])
  })

  it('aucun fichier « use client » n’écrit dans localStorage ou sessionStorage', () => {
    const offenders = CLIENT_FILES.filter(({ code }) => /\b(localStorage|sessionStorage)\s*\./.test(code)).map(
      (f) => f.path,
    )
    // Le sélecteur de thème est le seul usage légitime : il ne stocke aucun
    // identifiant. On liste donc les fichiers, et on exige qu'aucun ne touche
    // à quoi que ce soit d'authentification.
    for (const path of offenders) {
      const file = CLIENT_FILES.find((f) => f.path === path)
      expect(file?.code).not.toMatch(/token|session|password|auth/i)
    }
  })

  it('le module de session et le client backend restent marqués server-only ou Server Action', () => {
    for (const path of ['src/lib/backend/client.ts', 'src/lib/backend/auth.ts']) {
      const file = SOURCES.find((f) => f.path === path)
      expect(file, `${path} introuvable`).toBeDefined()
      expect(file?.code).toMatch(/^import 'server-only'/m)
    }
  })
})

describe('aucun secret en dur', () => {
  it('les identifiants du propriétaire ne sont plus comparés dans le frontend', () => {
    const offenders = SOURCES.filter(({ code }) => code.includes('ADRIEN_OWNER_PASSWORD')).map((f) => f.path)
    expect(offenders).toEqual([])
  })
})
