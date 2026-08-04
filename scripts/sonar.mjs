#!/usr/bin/env node
/**
 * Analyse SonarQube — couverture puis scanner.
 *
 * Remplace l'ancien script en une ligne de `package.json`, qui posait trois
 * problèmes réels :
 *
 *  1. il lançait `npm run test:coverage` dans un dépôt **pnpm-only** — la CI
 *     Hearst échoue si un `package-lock.json` apparaît (cf. CLAUDE.md,
 *     « Pièges connus ») ;
 *  2. il codait en dur l'URL d'un serveur privé (`SONAR_HOST_URL`), donc il ne
 *     pouvait fonctionner que depuis un seul réseau, sans le dire ;
 *  3. il supposait Docker présent et échouait sinon avec l'erreur de Docker,
 *     pas avec une explication.
 *
 * Ici, chaque prérequis manquant produit un message qui nomme ce qui manque et
 * comment le fournir. Un outil qualité qui échoue sans expliquer est un outil
 * qu'on finit par ignorer.
 *
 * Usage :
 *   SONAR_TOKEN=… SONAR_HOST_URL=https://… pnpm sonar
 *   pnpm sonar --skip-coverage      (réutilise coverage/lcov.info existant)
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const R = '\x1b[31m'
const G = '\x1b[32m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

const ROOT = process.cwd()
const SKIP_COVERAGE = process.argv.includes('--skip-coverage')

/** Échoue avec un message qui nomme la cause et le remède. */
function abandon(titre, ...details) {
  console.error(`\n${R}${B}✗ ${titre}${X}`)
  for (const ligne of details) console.error(`  ${ligne}`)
  console.error()
  process.exit(1)
}

function disponible(commande) {
  try {
    execFileSync('command', ['-v', commande], { stdio: 'ignore', shell: '/bin/sh' })
    return true
  } catch {
    return false
  }
}

/* ── Prérequis ────────────────────────────────────────────────────────────── */

const token = process.env.SONAR_TOKEN
const hostUrl = process.env.SONAR_HOST_URL

if (!token) {
  abandon(
    'SONAR_TOKEN manquant.',
    'Jeton d’analyse SonarQube, à fournir par l’environnement — jamais en dur.',
    `${D}Exemple : SONAR_TOKEN=… SONAR_HOST_URL=https://… pnpm sonar${X}`,
  )
}

if (!hostUrl) {
  abandon(
    'SONAR_HOST_URL manquant.',
    'URL du serveur SonarQube. Elle n’est plus codée en dur : le serveur',
    'historique était une adresse privée, injoignable hors de son réseau.',
    `${D}Exemple : SONAR_HOST_URL=https://sonarqube.interne pnpm sonar${X}`,
  )
}

if (!disponible('docker')) {
  abandon(
    'Docker introuvable.',
    'Le scanner officiel est distribué comme image Docker',
    '(`sonarsource/sonar-scanner-cli`).',
    'Installer Docker, ou lancer sonar-scanner directement si le binaire natif',
    'est disponible sur cette machine.',
  )
}

if (!existsSync(resolve(ROOT, 'sonar-project.properties'))) {
  abandon('sonar-project.properties introuvable.', `Attendu à la racine du dépôt : ${ROOT}`)
}

/* ── Couverture ───────────────────────────────────────────────────────────── */

const lcov = resolve(ROOT, 'coverage/lcov.info')

if (SKIP_COVERAGE) {
  if (!existsSync(lcov)) {
    abandon(
      '--skip-coverage demandé, mais coverage/lcov.info est absent.',
      'Lancer `pnpm test:coverage` d’abord, ou relancer sans --skip-coverage.',
    )
  }
  console.log(`${D}Couverture réutilisée : coverage/lcov.info${X}`)
} else {
  console.log(`\n${B}Couverture${X} ${D}(pnpm test:coverage)${X}`)
  try {
    // pnpm, et non npm : ce dépôt est pnpm-only.
    execFileSync('pnpm', ['run', 'test:coverage'], { stdio: 'inherit', cwd: ROOT })
  } catch {
    abandon('La couverture a échoué.', 'Corriger les tests avant de lancer une analyse.')
  }
  if (!existsSync(lcov)) {
    abandon(
      'coverage/lcov.info n’a pas été produit.',
      'Le rapport lcov est exigé par sonar.javascript.lcov.reportPaths.',
    )
  }
}

/* ── Scanner ──────────────────────────────────────────────────────────────── */

console.log(`\n${B}Analyse SonarQube${X} ${D}(${hostUrl})${X}`)

try {
  execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '-v',
      `${ROOT}:/usr/src`,
      '-e',
      'SONAR_TOKEN',
      '-e',
      'SONAR_HOST_URL',
      'sonarsource/sonar-scanner-cli',
    ],
    { stdio: 'inherit', cwd: ROOT, env: process.env },
  )
} catch {
  abandon(
    'Le scanner SonarQube a échoué.',
    'Causes fréquentes : serveur injoignable, jeton invalide ou expiré,',
    'projet inexistant côté serveur.',
  )
}

console.log(`\n${G}${B}✓ Analyse envoyée.${X} ${D}Résultats sur ${hostUrl}${X}\n`)
