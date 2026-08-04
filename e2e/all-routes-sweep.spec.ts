import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Balayage complet des routes — HC-PAGES-SWEEP-2026-08-04.
 *
 * Mesure CHAQUE route du produit dans le DOM rendu, à quatre viewports, et
 * produit les captures correspondantes. Ce que les tests unitaires ne peuvent
 * pas voir : un texte verticalisé, un contenu coupé, un panneau vide, une
 * barre de défilement imbriquée, un mot anglais dans une console française.
 *
 * Le marqueur central reste le rapport hauteur/largeur : une ligne de texte a
 * un ratio bien inférieur à 1 ; verticalisée caractère par caractère, elle
 * explose (mesuré jusqu'à 44 avant correction sur la file de déploiement).
 */

const SORTIE = process.env.CAPTURE_DIR ?? 'docs/visual-reviews/HC-PAGES-SWEEP-2026-08-04'
/** Mode cartographie : on mesure sans faire échouer (passe « avant »). */
const BASELINE = process.env.SWEEP_BASELINE === '1'

const VIEWPORTS = [
  { nom: 'desktop', w: 1440, h: 900 },
  { nom: 'laptop', w: 1280, h: 800 },
  { nom: 'tablet', w: 768, h: 1024 },
  { nom: 'mobile', w: 375, h: 812 },
] as const

/** Les 24 routes du build. `[vaultId]` est résolue à l'exécution. */
const PUBLIQUES = ['/', '/login', '/register'] as const
const ADMIN = [
  '/admin',
  '/admin/administration',
  '/admin/administration/produit',
  '/admin/api-explorer',
  '/admin/backtest',
  '/admin/btc',
  '/admin/clients',
  '/admin/conformite',
  '/admin/dashboard',
  '/admin/keeper',
  '/admin/mining',
  '/admin/operations',
  '/admin/product',
  '/admin/profile',
  '/admin/runtime',
  '/admin/series-1',
  '/admin/vault',
  '/admin/vaults',
] as const

const RATIO_MAX = 3

async function seConnecter(page: Page) {
  await page.goto('/login')
  await page.locator('form').nth(1).locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })
}

/**
 * Mots anglais dont la présence à l'écran est un défaut.
 *
 * Volontairement une liste FERMÉE de termes d'interface. Les codes techniques
 * (LIVE, STALLED, UNAVAILABLE, GET/POST, noms d'endpoints, identifiants de
 * coffre, `snake_case`) restent en anglais par contrat : les inclure ferait
 * crier la garde en permanence et elle finirait désactivée.
 */
const ANGLAIS_INTERDIT = [
  'Unavailable',
  'Undeployed',
  'Loading',
  'Unknown',
  'Retry',
  'Expected source',
  'Raw response',
  'Inspect vault',
  'Value by vault',
  'Movement ledger',
  'Vault register',
  'Last activity',
  'No response',
  'the chain did not respond',
  'the database did not respond',
  'no investor record',
  'this feature is not open yet',
  'the data is not available',
  'the source is not',
  'the contract exposes no read',
  'no custody provider',
]

async function mesurer(page: Page, ratioMax: number) {
  return page.evaluate((rMax) => {
    const doc = document.documentElement

    const feuilles = Array.from(
      document.querySelectorAll('h1,h2,h3,h4,p,dt,dd,td,th,span,li,caption,summary'),
    ).filter((el) => el.querySelector('h1,h2,h3,h4,p,dt,dd,td,th,span,li,caption,summary') === null)

    const verticalises: Array<{ texte: string; l: number; h: number; ratio: number }> = []
    const tronques: Array<{ texte: string; client: number; scroll: number }> = []

    for (const el of feuilles) {
      const texte = (el.textContent ?? '').trim()
      if (texte === '') continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      // `sr-only` : masqué visuellement mais présent pour les lecteurs d'écran.
      if (r.width <= 1 || r.height <= 1) continue

      const ratio = r.height / r.width
      // Un séparateur d'un caractère est naturellement plus haut que large.
      if (ratio > rMax && texte.length > 1 && texte.length < 60) {
        verticalises.push({
          texte: texte.slice(0, 44),
          l: Math.round(r.width),
          h: Math.round(r.height),
          ratio: Math.round(ratio * 100) / 100,
        })
      }
      const e = el as HTMLElement
      /*
       * Deux familles de faux positifs, écartées après relevé manuel :
       *
       *  · `sr-only` — clientWidth de 1 px par construction. Le contenu N'EST
       *    PAS perdu : il est destiné aux lecteurs d'écran, pas à l'œil.
       *  · `truncate` — l'ellipse est ici une décision de design, pas un
       *    accident : l'adresse d'un coffre est abrégée à l'écran et reste
       *    entière dans `title`. La signaler reviendrait à demander la
       *    correction d'un choix délibéré.
       *
       * Ce qui reste est une vraie coupure : du texte qu'on voulait lisible et
       * que la mise en page a rogné.
       */
      const srOnly = e.clientWidth <= 1 || e.clientHeight <= 1
      const ellipseVoulue = cs.textOverflow === 'ellipsis'
      if (
        e.scrollWidth > e.clientWidth + 1 &&
        cs.overflowX !== 'auto' &&
        cs.overflowX !== 'scroll' &&
        !srOnly &&
        !ellipseVoulue
      ) {
        tronques.push({ texte: texte.slice(0, 44), client: e.clientWidth, scroll: e.scrollWidth })
      }
    }

    const scrollY: Array<{ tag: string; classe: string; clientH: number; scrollH: number }> = []
    const scrollX: string[] = []
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const e = el as HTMLElement
      const cs = getComputedStyle(e)
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 1) {
        scrollY.push({
          tag: e.tagName.toLowerCase(),
          classe: (e.className || '').toString().slice(0, 60),
          clientH: e.clientHeight,
          scrollH: e.scrollHeight,
        })
      }
      if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 1) {
        scrollX.push((e.className || '').toString().slice(0, 50))
      }
    }

    const vides: Array<{ classe: string; l: number; h: number; texte: number }> = []
    for (const el of Array.from(document.querySelectorAll('article, section'))) {
      const r = el.getBoundingClientRect()
      if (r.width < 80 || r.height < 220) continue
      const n = (el.textContent ?? '').trim().length
      if (n < 40) {
        vides.push({ classe: (el.className || '').toString().slice(0, 50), l: Math.round(r.width), h: Math.round(r.height), texte: n })
      }
    }

    return {
      deborde: doc.scrollWidth > doc.clientWidth + 1,
      scrollWidthDoc: doc.scrollWidth,
      clientWidthDoc: doc.clientWidth,
      verticalises,
      tronques,
      scrollY,
      scrollX,
      vides,
      texteVisible: (document.body.innerText || '').slice(0, 20000),
    }
  }, ratioMax)
}

test('balaie les 24 routes aux quatre viewports', async ({ page }) => {
  test.setTimeout(1_800_000)
  mkdirSync(SORTIE, { recursive: true })

  const erreursConsole: string[] = []
  const erreurs5xx: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') erreursConsole.push(`${page.url()} :: ${m.text()}`)
  })
  page.on('response', (r) => {
    if (r.status() >= 500) erreurs5xx.push(`${r.status()} ${r.url()}`)
  })

  const releve: Record<string, Record<string, unknown>> = {}
  const anglais: Array<{ route: string; terme: string }> = []

  // 1. Surfaces publiques — sans session.
  for (const route of PUBLIQUES) {
    releve[route] = {}
    for (const v of VIEWPORTS) {
      await page.setViewportSize({ width: v.w, height: v.h })
      await page.goto(route, { waitUntil: 'networkidle' })
      const nom = route === '/' ? 'accueil' : route.replace(/\//g, '-').slice(1)
      await page.screenshot({ path: join(SORTIE, `${nom}-${v.nom}.png`) })
      releve[route][v.nom] = await mesurer(page, RATIO_MAX)
    }
  }

  // 2. Console — session requise.
  await page.setViewportSize({ width: 1440, height: 900 })
  await seConnecter(page)

  // Résout un identifiant de coffre réel plutôt que d'en inventer un.
  await page.goto('/admin/vaults', { waitUntil: 'networkidle' })
  const lien = await page.locator('a[href^="/admin/vaults/"]').first().getAttribute('href')
  const routes = lien === null ? [...ADMIN] : [...ADMIN, lien]

  for (const route of routes) {
    releve[route] = {}
    for (const v of VIEWPORTS) {
      await page.setViewportSize({ width: v.w, height: v.h })
      await page.goto(route, { waitUntil: 'networkidle' })
      const nom = route.replace(/\//g, '-').replace(/^-/, '').replace(/[^a-z0-9-]/gi, '_')
      await page.screenshot({ path: join(SORTIE, `${nom}-${v.nom}.png`) })
      const m = await mesurer(page, RATIO_MAX)
      releve[route][v.nom] = m

      if (v.nom === 'desktop') {
        for (const terme of ANGLAIS_INTERDIT) {
          if ((m as { texteVisible: string }).texteVisible.includes(terme)) {
            anglais.push({ route, terme })
          }
        }
      }
    }
  }

  writeFileSync(
    join(SORTIE, 'measurements.json'),
    JSON.stringify(
      { consoleErrors: erreursConsole, serverErrors: erreurs5xx, anglaisVisible: anglais, routes: releve },
      null,
      2,
    ) + '\n',
    'utf8',
  )

  if (BASELINE) return

  expect(erreurs5xx, `réponses 5xx :\n${erreurs5xx.join('\n')}`).toEqual([])
  expect(anglais, `anglais visible :\n${anglais.map((a) => `${a.route} → « ${a.terme} »`).join('\n')}`).toEqual([])

  for (const route of Object.keys(releve)) {
    for (const vp of Object.keys(releve[route])) {
      const m = releve[route][vp] as Awaited<ReturnType<typeof mesurer>>
      const ou = `${route} @ ${vp}`

      expect(m.deborde, `${ou} — déborde (${m.scrollWidthDoc} > ${m.clientWidthDoc})`).toBe(false)
      expect(
        m.verticalises,
        `${ou} — verticalisé : ${m.verticalises.map((t) => `${t.texte} (${t.l}x${t.h}, ratio ${t.ratio})`).join(' | ')}`,
      ).toEqual([])
      expect(
        m.tronques,
        `${ou} — tronqué : ${m.tronques.map((t) => `${t.texte} (${t.client}<${t.scroll})`).join(' | ')}`,
      ).toEqual([])
      expect(
        m.vides,
        `${ou} — panneau vide : ${m.vides.map((p) => `${p.l}x${p.h} pour ${p.texte} car.`).join(' | ')}`,
      ).toEqual([])
      expect(
        m.scrollY,
        `${ou} — défilement vertical imbriqué : ${m.scrollY.map((s) => `${s.tag}.${s.classe} (${s.clientH}/${s.scrollH})`).join(' | ')}`,
      ).toEqual([])
    }
  }
})
