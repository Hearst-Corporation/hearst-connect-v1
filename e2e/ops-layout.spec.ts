import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * HC-UI-OPS-LAYOUT-001 — panneau de fraîcheur de l'indexeur, /admin/operations.
 *
 * Ce fichier fait deux choses distinctes :
 *  1. il MESURE le défaut dans le DOM rendu (débordement, boîtes, visibilité),
 *     ce qu'une capture ne prouve pas ;
 *  2. il produit les captures avant/après aux quatre viewports.
 *
 * La mesure est ce qui compte : un texte « verticalisé caractère par
 * caractère » se voit à l'œil, mais se PROUVE par un rapport hauteur/largeur
 * aberrant sur un élément dont le contenu tient en une ligne.
 */

const SORTIE = process.env.CAPTURE_DIR ?? 'docs/visual-reviews/HC-UI-OPS-LAYOUT-001'
const PREFIXE = process.env.CAPTURE_PREFIX ?? 'after'

const VIEWPORTS = [
  { nom: 'desktop', w: 1440, h: 900 },
  { nom: 'laptop', w: 1280, h: 800 },
  { nom: 'tablet', w: 768, h: 1024 },
  { nom: 'mobile', w: 375, h: 812 },
] as const

async function seConnecter(page: Page) {
  await page.goto('/login')
  await page.locator('form').nth(1).locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })
}

/**
 * Mesure du panneau de fraîcheur.
 *
 * On cible la région par son libellé accessible plutôt que par une classe de
 * module CSS : le hash change au moindre rebuild, le nom accessible non.
 */
async function mesurerPanneau(page: Page) {
  return page.evaluate(() => {
    const titres = Array.from(document.querySelectorAll('h3'))
    const titre = titres.find((h) => (h.textContent ?? '').includes('Fraîcheur'))
    const region = titre?.closest('article, section, div') ?? null
    if (region === null) return null

    const boites: Array<{
      texte: string
      largeur: number
      hauteur: number
      scrollWidth: number
      clientWidth: number
      ratio: number
    }> = []

    for (const el of Array.from(region.querySelectorAll('dt, dd, p, span'))) {
      const texte = (el.textContent ?? '').trim()
      if (texte === '') continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      boites.push({
        texte: texte.slice(0, 40),
        largeur: Math.round(r.width),
        hauteur: Math.round(r.height),
        scrollWidth: (el as HTMLElement).scrollWidth,
        clientWidth: (el as HTMLElement).clientWidth,
        // Un texte d'une ligne a un ratio hauteur/largeur < 1. Verticalisé, il
        // explose : chaque caractère occupe une ligne.
        ratio: r.width === 0 ? Infinity : Math.round((r.height / r.width) * 100) / 100,
      })
    }

    const r = region.getBoundingClientRect()
    return {
      largeurRegion: Math.round(r.width),
      scrollWidthRegion: (region as HTMLElement).scrollWidth,
      clientWidthRegion: (region as HTMLElement).clientWidth,
      deborde: (region as HTMLElement).scrollWidth > (region as HTMLElement).clientWidth + 1,
      boites,
    }
  })
}

test('mesure et capture le panneau de fraîcheur aux quatre viewports', async ({ page }) => {
  test.setTimeout(300_000)
  mkdirSync(SORTIE, { recursive: true })

  const erreursConsole: string[] = []
  const echecsReseau: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') erreursConsole.push(m.text())
  })
  page.on('requestfailed', (r) => {
    const raison = r.failure()?.errorText ?? 'inconnu'
    const chemin = new URL(r.url()).pathname
    /*
     * `ERR_ABORTED` n'est pas une ressource manquante : c'est le navigateur qui
     * abandonne une requête devenue inutile. Deux cas normaux ici :
     *  - /login, dont la Server Action répond par une redirection ;
     *  - les chunks /_next/static/, quand on change de viewport et de page plus
     *    vite que le chargement des scripts de la page précédente.
     * Tout autre échec reste compté — c'est ce qui fait la valeur de
     * l'assertion.
     */
    if (raison === 'net::ERR_ABORTED' && (chemin === '/login' || chemin.startsWith('/_next/static/'))) return
    echecsReseau.push(`${r.url()} :: ${raison}`)
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await seConnecter(page)

  const mesures: Record<string, unknown> = {}

  for (const v of VIEWPORTS) {
    await page.setViewportSize({ width: v.w, height: v.h })
    await page.goto('/admin/operations', { waitUntil: 'networkidle' })
    await page.screenshot({ path: join(SORTIE, `${PREFIXE}-${v.nom}.png`), fullPage: false })
    mesures[v.nom] = await mesurerPanneau(page)
  }

  writeFileSync(
    join(SORTIE, `${PREFIXE}-mesures.json`),
    JSON.stringify({ consoleErrors: erreursConsole, networkErrors: echecsReseau, mesures }, null, 2) + '\n',
    'utf8',
  )

  expect(erreursConsole, `erreurs console:\n${erreursConsole.join('\n')}`).toEqual([])
  expect(echecsReseau, `requêtes en échec:\n${echecsReseau.join('\n')}`).toEqual([])

  /*
   * Les assertions qui prouvent la correction (UI-OPS-LAYOUT-001).
   *
   * Le ratio hauteur/largeur est le marqueur décisif : un texte d'une ligne a
   * un ratio bien inférieur à 1. Verticalisé caractère par caractère, il
   * explose — mesuré à 29,5 sur desktop et 48 sur laptop AVANT correction
   * (« toutes les 15 s » rendu sur 13 px de large pour 384 px de haut).
   *
   * Le seuil de 3 laisse passer un libellé qui s'enroule légitimement sur
   * deux ou trois lignes dans une colonne étroite, et rattrape sans ambiguïté
   * une verticalisation.
   */
  for (const v of VIEWPORTS) {
    const m = mesures[v.nom] as Awaited<ReturnType<typeof mesurerPanneau>>
    expect(m, `panneau de fraîcheur introuvable à ${v.w}px`).not.toBeNull()
    if (m === null) continue

    expect(m.largeurRegion, `panneau de largeur nulle à ${v.w}px`).toBeGreaterThan(0)
    expect(m.deborde, `le panneau déborde horizontalement à ${v.w}px`).toBe(false)

    const verticalises = m.boites.filter((b) => b.ratio > 3)
    expect(
      verticalises,
      `texte verticalisé à ${v.w}px : ${verticalises.map((b) => `${b.texte} (${b.largeur}x${b.hauteur})`).join(', ')}`,
    ).toEqual([])

    // Les quatre mesures restent lisibles : aucune n'est tronquée par son
    // conteneur (scrollWidth qui dépasse clientWidth = contenu coupé).
    const tronques = m.boites.filter((b) => b.scrollWidth > b.clientWidth + 1)
    expect(
      tronques,
      `contenu tronqué à ${v.w}px : ${tronques.map((b) => b.texte).join(', ')}`,
    ).toEqual([])
  }
})
