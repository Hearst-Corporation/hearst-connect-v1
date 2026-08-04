import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Non-régression de UI-OPS-LAYOUT-001.
 *
 * ── Le défaut ─────────────────────────────────────────────────────────────
 * Le panneau « Fraîcheur de l'indexeur » vit dans l'`aside` de
 * `/admin/operations`, large de 250 à 290 px. Il utilisait
 * `AdminMetricGrid count={4}`, qui applique `grid-cols-2 lg:grid-cols-4` — et
 * `lg:` réagit à la largeur du VIEWPORT, pas du conteneur. Sur un écran de
 * 1440 px, la grille passait donc à 4 colonnes dans une boîte de 270 px :
 * ~55 px par colonne, et « toutes les 15 s » se rendait sur 13 px de large
 * pour 384 px de haut, un caractère par ligne.
 *
 * ── Ce que ce test vérifie, et pourquoi ainsi ─────────────────────────────
 * Il lit la source plutôt que de rendre le composant, parce que le défaut est
 * une propriété de MISE EN PAGE que jsdom ne calcule pas : jsdom n'implémente
 * ni Grid ni les media queries, donc un rendu ne pourrait pas distinguer les
 * deux versions. La mesure réelle est faite au navigateur par
 * `e2e/ops-layout.spec.ts`, qui compare les boîtes à quatre viewports — c'est
 * lui qui prouve la correction. Ce test-ci est le garde-fou rapide qui empêche
 * le motif fautif de revenir sans qu'on lance Playwright.
 *
 * Il vise des motifs PRÉCIS et non une chaîne CSS complète : une assertion sur
 * la classe entière casserait au premier ajustement d'espacement sans rapport.
 */

const RACINE = resolve(import.meta.dirname, '..')
const SOURCE = readFileSync(join(RACINE, 'src/app/admin/operations/page.tsx'), 'utf8')

/**
 * Retire les commentaires avant analyse.
 *
 * Sans cela, le commentaire qui EXPLIQUE le défaut (« AdminMetricGrid appliquait
 * lg:grid-cols-4… ») déclencherait les assertions censées interdire ce motif.
 * C'est la même règle que `check-no-mocks` et `check-design-system` : on juge le
 * code, pas la prose qui le documente.
 */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
}

/** Le bloc de `SectionIndexation`, isolé pour ne pas asserter sur toute la page. */
function sectionIndexation(): string {
  const debut = SOURCE.indexOf('function SectionIndexation(')
  expect(debut, 'SectionIndexation introuvable — le composant a été renommé ?').toBeGreaterThan(-1)
  const suite = SOURCE.indexOf('\nfunction ', debut + 1)
  return sansCommentaires(SOURCE.slice(debut, suite === -1 ? undefined : suite))
}

describe('panneau de fraîcheur — mise en page (UI-OPS-LAYOUT-001)', () => {
  it('ne force pas un nombre de colonnes depuis la largeur du viewport', () => {
    const bloc = sectionIndexation()
    /*
     * `lg:grid-cols-N` (ou sm:/md:/xl:) dans un panneau d'aside étroit est
     * précisément ce qui a causé le défaut : le point de rupture regarde le
     * viewport, pas le conteneur. Les grilles à colonnes fixes restent
     * légitimes ailleurs — d'où l'assertion limitée à ce composant.
     */
    expect(bloc).not.toMatch(/\b(sm|md|lg|xl|2xl):grid-cols-\d/)
    expect(bloc, 'AdminMetricGrid applique lg:grid-cols-4 — inadapté à une colonne de 250 px').not.toMatch(
      /<AdminMetricGrid\b/,
    )
  })

  it('règle ses colonnes sur la largeur de son conteneur, pas de l’écran', () => {
    const bloc = sectionIndexation()
    /*
     * Container query : le panneau ne sait pas quelle taille fait l'écran, il
     * sait quelle place on lui donne. C'est la seule unité de mesure correcte
     * pour un composant qui vit dans un aside de largeur variable.
     *
     * `auto-fit` + `minmax` avait été essayé d'abord et ne suffisait pas : le
     * plancher se compare au conteneur de la GRILLE, pas à la colonne obtenue,
     * si bien que deux pistes de ~72 px survivaient à 178 px de large.
     */
    expect(bloc).toMatch(/@container/)
    expect(bloc).toMatch(/@\[[\d.]+rem\]:grid-cols-\d/)
  })

  it('n’emploie aucune parade qui masque le problème au lieu de le corriger', () => {
    const bloc = sectionIndexation()
    /*
     * `break-all` couperait n'importe quel mot n'importe où : le texte
     * « tiendrait » sans être lisible. À ne pas confondre avec
     * `wrap-break-word`, employé ici, qui ne coupe un mot QUE s'il ne peut
     * tenir autrement — dans la colonne la plus étroite, « SYNCHRONISATION »
     * demande 116 px pour 104 disponibles.
     */
    expect(bloc).not.toMatch(/break-all/)
    expect(bloc).not.toMatch(/writing-mode|vertical-[lr]l/)
    expect(bloc).not.toMatch(/\boverflow-hidden\b/)
    // Réduire la police pour faire entrer le texte est l'autre fausse solution.
    expect(bloc).not.toMatch(/text-\[?(8|9|10)px/)
  })

  it('conserve les quatre mesures et leurs libellés complets', () => {
    const bloc = sectionIndexation()
    /*
     * Garde de VÉRACITÉ : la mission autorise à changer la disposition, jamais
     * la signification. Un libellé abrégé pour tenir dans une colonne étroite
     * serait une régression de sens, pas une correction de mise en page.
     */
    for (const libelle of [
      'Dernière synchronisation',
      'Dernier bloc indexé',
      'Intervalle d’interrogation',
      'Erreurs consécutives',
    ]) {
      expect(bloc, `libellé « ${libelle} » absent ou abrégé`).toContain(libelle)
    }
  })

  it('ne modifie pas la lecture des données de fraîcheur', () => {
    const bloc = sectionIndexation()
    // Les accesseurs restent ceux du backend : aucune valeur n'est recalculée
    // ni repliée sur une valeur par défaut au passage.
    expect(bloc).toContain('runtime.data.indexer?.lastSyncedAt')
    expect(bloc).toContain('planificateur?.lastIndexedBlock')
    expect(bloc).toContain('planificateur?.intervalMs')
    expect(bloc).toContain('formatCount(planificateur?.consecutiveErrors)')
    // `formatCount` rend « — » pour une absence : pas de zéro fabriqué.
    expect(bloc).not.toMatch(/consecutiveErrors\s*\?\?\s*0/)
  })
})
