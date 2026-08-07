#!/usr/bin/env node
/**
 * Contrôle de duplication — jscpd, avec un seuil qui MORD.
 *
 * ── Le défaut corrigé ─────────────────────────────────────────────────────
 * L'ancien script était `jscpd src --threshold 100`. Le seuil de jscpd est le
 * *pourcentage maximum de duplication avant exit 1* : à 100 %, aucun dépôt
 * réel ne peut le franchir. La commande sortait donc en succès en annonçant
 * 56 clones — un contrôle qualité qui ne peut jamais échouer donne une fausse
 * assurance, ce qui est pire que pas de contrôle du tout.
 *
 * ── Le seuil retenu ───────────────────────────────────────────────────────
 * SEUIL = 4 %, pour une duplication mesurée à 3,45 % au 2026-08-04
 * (56 clones, 787 lignes sur 22 832). Il n'est PAS réglé au-dessus de l'état
 * courant pour obtenir du vert facile : la marge est d'un demi-point, donc une
 * aggravation notable fait rougir la commande. Il n'est pas non plus réglé
 * sous l'état courant, ce qui rendrait la commande rouge en permanence et la
 * ferait ignorer.
 *
 * Le bon geste quand ce script devient rouge est de retirer la duplication,
 * pas de monter le seuil. Le baisser à mesure que la dette est résorbée est
 * en revanche l'usage prévu — la duplication connue est cartographiée dans
 * Seuil et exclusions documentés dans l'en-tête du script.
 * relève du LOT D (convergence UI), pas de cette passe.
 *
 * Ce script N'EST PAS dans `pnpm check` : c'est un outil de diagnostic, pas
 * une gate de livraison. Il est simplement honnête sur ce qu'il mesure.
 *
 * Usage : node scripts/check-duplication.mjs            (exit 1 si > SEUIL)
 *         node scripts/check-duplication.mjs --selftest (preuve qu'il mord)
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const R = '\x1b[31m'
const G = '\x1b[32m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

/** Pourcentage de lignes dupliquées toléré. Voir l'en-tête avant de le changer. */
const SEUIL = 4

const ROOT = process.cwd()
const SELFTEST = process.argv.includes('--selftest')

/**
 * Lance jscpd sur un répertoire et rend le pourcentage de lignes dupliquées.
 * Le rapport JSON est écrit dans un dossier jetable : rien n'est laissé dans
 * l'arborescence du dépôt.
 */
function mesurer(cible) {
  const sortie = mkdtempSync(join(tmpdir(), 'hc-jscpd-'))
  try {
    try {
      execFileSync(
        resolve(ROOT, 'node_modules/.bin/jscpd'),
        [
          cible,
          '--threshold', '100',
          '--reporters', 'json',
          '--output', sortie,
          '--silent',
        ],
        { stdio: 'ignore', cwd: ROOT },
      )
    } catch {
      // --threshold 100 ne fait pas sortir jscpd en erreur ; un échec ici est
      // un vrai problème d'exécution, mais le rapport peut malgré tout exister.
    }

    const rapport = join(sortie, 'jscpd-report.json')
    if (!existsSync(rapport)) return null

    const donnees = JSON.parse(readFileSync(rapport, 'utf8'))
    const total = donnees.statistics?.total
    if (!total) return null

    return {
      // Deux décimales : « 3.4469166082690963 % » n'aide personne à décider.
      pourcentage: Math.round(total.percentage * 100) / 100,
      clones: total.clones,
      lignesDupliquees: total.duplicatedLines,
      lignes: total.lines,
    }
  } finally {
    rmSync(sortie, { recursive: true, force: true })
  }
}

/* ── Self-test : la commande mord-elle vraiment ? ─────────────────────────── */

if (SELFTEST) {
  const racine = mkdtempSync(join(tmpdir(), 'hc-dup-selftest-'))
  mkdirSync(join(racine, 'src'), { recursive: true })

  // Bloc assez long pour dépasser le minimum de tokens de jscpd, copié tel quel
  // dans deux fichiers : duplication massive, très au-dessus du seuil.
  const bloc = Array.from(
    { length: 40 },
    (_, i) => `export function calculAbsolumentIdentique${i}(valeur: number): number {\n` +
      `  const intermediaire = valeur * ${i + 2} + 17\n` +
      `  const corrige = intermediaire > 100 ? intermediaire - 100 : intermediaire\n` +
      `  return Math.round(corrige * 1.5)\n}`,
  ).join('\n\n')

  writeFileSync(join(racine, 'src/copie-a.ts'), bloc, 'utf8')
  writeFileSync(join(racine, 'src/copie-b.ts'), bloc, 'utf8')

  const duplique = mesurer(join(racine, 'src'))

  // Fixture négative : un fichier unique, sans clone.
  const propre = mkdtempSync(join(tmpdir(), 'hc-dup-selftest-propre-'))
  mkdirSync(join(propre, 'src'), { recursive: true })
  writeFileSync(join(propre, 'src/unique.ts'), 'export const unUniqueSymbole = 42\n', 'utf8')
  const sain = mesurer(join(propre, 'src'))

  rmSync(racine, { recursive: true, force: true })
  rmSync(propre, { recursive: true, force: true })

  const mordSurDuplique = duplique !== null && duplique.pourcentage > SEUIL
  const passeSurPropre = sain !== null && sain.pourcentage <= SEUIL

  console.log(`\n${B}check-duplication --selftest${X}  ${D}seuil ${SEUIL} %${X}`)
  console.log(
    `  deux fichiers identiques dépassent le seuil : ${mordSurDuplique ? G + 'OK' : R + 'ÉCHEC'}${X}` +
      `  ${D}(mesuré ${duplique === null ? 'n/a' : `${duplique.pourcentage} %`})${X}`,
  )
  console.log(
    `  un fichier unique reste sous le seuil       : ${passeSurPropre ? G + 'OK' : R + 'ÉCHEC'}${X}` +
      `  ${D}(mesuré ${sain === null ? 'n/a' : `${sain.pourcentage} %`})${X}`,
  )
  console.log()
  process.exit(mordSurDuplique && passeSurPropre ? 0 : 1)
}

/* ── Mesure réelle ────────────────────────────────────────────────────────── */

const resultat = mesurer(resolve(ROOT, 'src'))

if (resultat === null) {
  console.error(`\n${R}${B}✗ jscpd n'a produit aucun rapport.${X}`)
  console.error(`  Vérifier que jscpd est installé (${D}pnpm install${X}).\n`)
  process.exit(1)
}

const { pourcentage, clones, lignesDupliquees, lignes } = resultat
const detail = `${clones} clone(s) · ${lignesDupliquees} lignes dupliquées sur ${lignes}`

console.log(`\n${B}check-duplication${X}  ${D}seuil ${SEUIL} %${X}\n`)

if (pourcentage > SEUIL) {
  console.log(`${R}${B}✗ Duplication ${pourcentage} % — au-dessus du seuil de ${SEUIL} %.${X}`)
  console.log(`  ${detail}`)
  console.log(`  ${D}Détail des clones : pnpm quality:dup:report${X}`)
  console.log(`  ${D}Retirer la duplication — ne pas monter le seuil.${X}\n`)
  process.exit(1)
}

console.log(`${G}${B}✓ Duplication ${pourcentage} % — sous le seuil de ${SEUIL} %.${X}`)
console.log(`  ${D}${detail}${X}`)
console.log(`  ${D}Détail des clones : pnpm quality:dup:report${X}\n`)
process.exit(0)
