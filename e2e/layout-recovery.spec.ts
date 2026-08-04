import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * HC-VISUAL-LAYOUT-RECOVERY-001 — mise en page complète de /admin/operations
 * et /admin/dashboard.
 *
 * Deux rôles distincts :
 *  1. CARTOGRAPHIER — mesurer chaque panneau dans le DOM rendu (boîtes,
 *     débordements, conteneurs scrollables, ratios de texte). Une capture
 *     montre qu'une page est cassée ; seule la mesure dit POURQUOI et permet
 *     de prouver la correction.
 *  2. VERROUILLER — les assertions échouent si l'un des défauts revient.
 *
 * Le marqueur central est le rapport hauteur/largeur d'un texte : une ligne de
 * texte a un ratio bien inférieur à 1. Verticalisé caractère par caractère, il
 * explose (mesuré jusqu'à 48 avant correction sur le panneau de fraîcheur).
 */

const SORTIE = process.env.CAPTURE_DIR ?? 'docs/visual-reviews/HC-VISUAL-LAYOUT-RECOVERY-001'
const PREFIXE = process.env.CAPTURE_PREFIX ?? 'after'
/** Quand il vaut '1', on mesure sans faire échouer : c'est la passe « avant ». */
const BASELINE = process.env.LAYOUT_BASELINE === '1'

const ROUTES = [
  { chemin: '/admin/operations', nom: 'operations' },
  { chemin: '/admin/dashboard', nom: 'dashboard' },
] as const

const VIEWPORTS = [
  { nom: '1440x900', w: 1440, h: 900 },
  { nom: '1280x800', w: 1280, h: 800 },
  { nom: '1024x768', w: 1024, h: 768 },
  { nom: '768x1024', w: 768, h: 1024 },
  { nom: '375x812', w: 375, h: 812 },
] as const

/** Ratio hauteur/largeur au-delà duquel un texte court est considéré verticalisé. */
const RATIO_MAX = 3
/** En dessous, une boîte de texte visible est trop étroite pour être lue. */
const LARGEUR_MIN_LISIBLE = 40

async function seConnecter(page: Page) {
  await page.goto('/login')
  await page.locator('form').nth(1).locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })
}

type Mesure = Awaited<ReturnType<typeof mesurerPage>>

async function mesurerPage(page: Page) {
  return page.evaluate(
    ({ ratioMax, largeurMin }) => {
      const doc = document.documentElement

      /** Un texte qui n'a pas d'enfant élément : c'est lui qui porte les mots. */
      const feuillesTexte = Array.from(document.querySelectorAll('h1,h2,h3,h4,p,dt,dd,td,th,span,li')).filter(
        (el) => el.querySelector('h1,h2,h3,h4,p,dt,dd,td,th,span,li') === null,
      )

      const textesVerticalises: Array<{ texte: string; l: number; h: number; ratio: number }> = []
      const textesEtroits: Array<{ texte: string; l: number }> = []
      const textesTronques: Array<{ texte: string; client: number; scroll: number }> = []

      for (const el of feuillesTexte) {
        const texte = (el.textContent ?? '').trim()
        if (texte === '') continue
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        const style = getComputedStyle(el)
        if (style.visibility === 'hidden' || style.display === 'none') continue
        // `sr-only` : masqué visuellement mais présent pour les lecteurs d'écran.
        if (r.width <= 1 && r.height <= 1) continue

        const ratio = r.height / r.width
        /*
         * Un texte long s'enroule légitimement : on ne juge que les libellés
         * courts, ceux qui devraient tenir sur une ou deux lignes.
         *
         * Les séparateurs décoratifs d'un seul caractère (« · », « — », « / »)
         * sont exclus : leur boîte est naturellement plus haute que large sans
         * que rien ne soit cassé. Les compter donnerait une alerte permanente
         * qui masquerait les vraies verticalisations.
         */
        if (ratio > ratioMax && texte.length > 1 && texte.length < 60) {
          textesVerticalises.push({ texte: texte.slice(0, 44), l: Math.round(r.width), h: Math.round(r.height), ratio: Math.round(ratio * 100) / 100 })
        }
        if (r.width < largeurMin && texte.length > 3) {
          textesEtroits.push({ texte: texte.slice(0, 44), l: Math.round(r.width) })
        }
        const e = el as HTMLElement
        if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'auto') {
          textesTronques.push({ texte: texte.slice(0, 44), client: e.clientWidth, scroll: e.scrollWidth })
        }
      }

      /** Tous les conteneurs qui défilent réellement, avec leur chemin lisible. */
      const scrollables: Array<{ tag: string; classe: string; axe: string; scrollH: number; clientH: number; scrollW: number; clientW: number }> = []
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const e = el as HTMLElement
        const cs = getComputedStyle(e)
        const vertical = (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 1
        const horizontal = (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 1
        if (!vertical && !horizontal) continue
        scrollables.push({
          tag: e.tagName.toLowerCase(),
          classe: (e.className || '').toString().slice(0, 70),
          axe: vertical && horizontal ? 'xy' : vertical ? 'y' : 'x',
          scrollH: e.scrollHeight,
          clientH: e.clientHeight,
          scrollW: e.scrollWidth,
          clientW: e.clientWidth,
        })
      }

      /** Panneaux : grandes surfaces dont on veut détecter le vide. */
      const panneaux: Array<{ classe: string; l: number; h: number; texte: number; vide: boolean }> = []
      for (const el of Array.from(document.querySelectorAll('article, section'))) {
        const r = el.getBoundingClientRect()
        if (r.width < 80 || r.height < 80) continue
        const longueurTexte = (el.textContent ?? '').trim().length
        panneaux.push({
          classe: (el.className || '').toString().slice(0, 60),
          l: Math.round(r.width),
          h: Math.round(r.height),
          texte: longueurTexte,
          // Beaucoup de hauteur pour très peu de contenu = zone vide artificielle.
          vide: r.height > 220 && longueurTexte < 40,
        })
      }

      return {
        debordementGlobal: doc.scrollWidth > doc.clientWidth + 1,
        scrollWidthDoc: doc.scrollWidth,
        clientWidthDoc: doc.clientWidth,
        textesVerticalises,
        textesEtroits,
        textesTronques,
        scrollablesVerticaux: scrollables.filter((s) => s.axe !== 'x'),
        scrollablesHorizontaux: scrollables.filter((s) => s.axe === 'x'),
        panneaux,
        panneauxVides: panneaux.filter((p) => p.vide),
      }
    },
    { ratioMax: RATIO_MAX, largeurMin: LARGEUR_MIN_LISIBLE },
  )
}

test('cartographie et verrouille la mise en page des deux routes', async ({ page }) => {
  test.setTimeout(600_000)
  mkdirSync(SORTIE, { recursive: true })

  const erreursConsole: string[] = []
  const erreurs5xx: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') erreursConsole.push(m.text())
  })
  page.on('response', (r) => {
    if (r.status() >= 500) erreurs5xx.push(`${r.status()} ${r.url()}`)
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await seConnecter(page)

  const releve: Record<string, Record<string, Mesure>> = {}

  for (const route of ROUTES) {
    releve[route.nom] = {}
    for (const v of VIEWPORTS) {
      await page.setViewportSize({ width: v.w, height: v.h })
      await page.goto(route.chemin, { waitUntil: 'networkidle' })
      await page.screenshot({ path: join(SORTIE, `${PREFIXE}-${route.nom}-${v.nom}.png`), fullPage: false })
      releve[route.nom][v.nom] = await mesurerPage(page)
    }

    // Zoom 200 % : viewport logique réduit de moitié, densité doublée.
    await page.setViewportSize({ width: 720, height: 450 })
    await page.goto(route.chemin, { waitUntil: 'networkidle' })
    await page.screenshot({ path: join(SORTIE, `${PREFIXE}-${route.nom}-zoom200.png`), fullPage: false })
    releve[route.nom]['zoom200'] = await mesurerPage(page)
  }

  writeFileSync(
    join(SORTIE, `${PREFIXE}-measurements.json`),
    JSON.stringify({ consoleErrors: erreursConsole, serverErrors: erreurs5xx, routes: releve }, null, 2) + '\n',
    'utf8',
  )

  if (BASELINE) {
    // Passe de cartographie : on enregistre l'état cassé sans le juger.
    return
  }

  expect(erreursConsole, `erreurs console:\n${erreursConsole.join('\n')}`).toEqual([])
  expect(erreurs5xx, `réponses 5xx:\n${erreurs5xx.join('\n')}`).toEqual([])

  for (const route of ROUTES) {
    for (const cle of Object.keys(releve[route.nom])) {
      const m = releve[route.nom][cle]
      const ou = `${route.chemin} @ ${cle}`

      expect(m.debordementGlobal, `${ou} — la page déborde horizontalement (${m.scrollWidthDoc} > ${m.clientWidthDoc})`).toBe(false)

      expect(
        m.textesVerticalises,
        `${ou} — texte verticalisé : ${m.textesVerticalises.map((t) => `${t.texte} (${t.l}x${t.h}, ratio ${t.ratio})`).join(' | ')}`,
      ).toEqual([])

      expect(
        m.textesTronques,
        `${ou} — contenu tronqué : ${m.textesTronques.map((t) => `${t.texte} (${t.client}<${t.scroll})`).join(' | ')}`,
      ).toEqual([])

      expect(
        m.panneauxVides,
        `${ou} — panneau à vide anormal : ${m.panneauxVides.map((p) => `${p.l}x${p.h} pour ${p.texte} caractères`).join(' | ')}`,
      ).toEqual([])

      /*
       * Un seul défilement vertical : celui de la page. Un panneau qui défile
       * dans une page qui défile déjà cache son contenu à qui ne le devine pas.
       * L'inventaire des exceptions est volontairement vide : aucune liste de
       * ces deux routes n'est assez longue pour le justifier.
       */
      expect(
        m.scrollablesVerticaux,
        `${ou} — défilement vertical imbriqué : ${m.scrollablesVerticaux.map((s) => `${s.tag}.${s.classe} (${s.clientH}/${s.scrollH})`).join(' | ')}`,
      ).toEqual([])
    }
  }
})
