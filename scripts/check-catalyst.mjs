#!/usr/bin/env node
/**
 * Adaptateur portable pour `catalyst-doctor` — l'outil PERSONNEL d'Adrien qui
 * détecte qu'un design system a fui d'un autre projet.
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * La gate canonique `check` appelait `node ~/catalyst-doctor.mjs .` : un chemin
 * absolu vers le home d'UNE machine. En CI (workflow réutilisable
 * Hearst-Corporation/.github ci-nextjs.yml) et sur toute autre machine, `~` ne
 * contient pas cet outil : la gate entière était inexécutable.
 *
 * Pourquoi on ne vendore PAS l'outil ici
 * --------------------------------------
 * `catalyst-doctor` est partagé entre les projets d'Adrien et son heuristique
 * évolue (son propre en-tête documente les faux positifs corrigés depuis la v1).
 * Une copie figée dans ce repo divergerait en silence et prétendrait être le
 * doctor tout en appliquant des règles périmées. On préfère un adaptateur qui
 * délègue à l'outil réel quand il est là.
 *
 * Le contrat de vérité
 * --------------------
 * Trois issues, jamais confondues :
 *   · outil présent, verdict propre  → sortie du doctor, exit 0
 *   · outil présent, fuite avérée    → sortie du doctor, exit 1 (la gate casse)
 *   · outil absent                   → « VÉRIFICATION SAUTÉE », exit 0, et
 *                                      AUCUN « ✓ propre » n'est imprimé.
 * Une étape sautée ne s'affiche jamais comme une étape réussie.
 *
 * Où l'outil est cherché (premier trouvé gagne) :
 *   1. $CATALYST_DOCTOR                       — échappatoire explicite
 *   2. $HOME/catalyst-doctor.mjs              — emplacement canonique
 *   3. $HOME/.claude/catalyst-doctor.mjs      — variante plugins Hearst
 *
 * Usage : node scripts/check-catalyst.mjs [chemin-du-projet]   (défaut : cwd)
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const Y = '\x1b[33m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

const target = resolve(process.argv[2] ?? process.cwd())
const home = process.env.HOME || homedir()

const candidates = [
  process.env.CATALYST_DOCTOR,
  join(home, 'catalyst-doctor.mjs'),
  join(home, '.claude', 'catalyst-doctor.mjs'),
].filter(Boolean)

const doctor = candidates.find((candidate) => existsSync(candidate))

if (!doctor) {
  console.log(`\n${Y}${B}⊘ check:catalyst — VÉRIFICATION SAUTÉE${X}`)
  console.log(`${D}  catalyst-doctor est un outil personnel, hors de ce dépôt : introuvable ici.${X}`)
  console.log(`${D}  Cherché : ${candidates.join(', ')}${X}`)
  console.log(`${Y}  Le design system N'A PAS été vérifié — ce n'est pas un succès, c'est une absence.${X}`)
  console.log(`${D}  Pour l'exécuter : installer l'outil, ou pointer CATALYST_DOCTOR=/chemin/catalyst-doctor.mjs${X}\n`)
  process.exit(0)
}

const run = spawnSync(process.execPath, [doctor, target], { stdio: 'inherit' })

if (run.error) {
  console.error(`\n${Y}⊘ check:catalyst — l'outil a été trouvé mais n'a pas pu s'exécuter : ${run.error.message}${X}\n`)
  process.exit(1)
}
if (run.signal) {
  console.error(`\n${Y}⊘ check:catalyst — catalyst-doctor interrompu (signal ${run.signal}).${X}\n`)
  process.exit(1)
}

process.exit(run.status ?? 1)
