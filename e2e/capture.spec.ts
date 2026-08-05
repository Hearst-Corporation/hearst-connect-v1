import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Captures de preuve pour HC-UI-CONVERGENCE-001.
 *
 * Ce n'est PAS une suite de tests de comportement : c'est le harnais qui
 * produit `docs/visual-reviews/HC-UI-CONVERGENCE-001/`. Il se connecte avec le
 * quick-login de développement (le mot de passe réel n'est jamais saisi dans un
 * navigateur), visite les surfaces touchées par la convergence et enregistre
 * ce que l'écran montre réellement.
 *
 * Il vérifie aussi, à chaque page, deux choses qu'une capture seule ne prouve
 * pas : aucune erreur de console, et aucune requête en échec.
 */

const SORTIE = process.env.CAPTURE_DIR ?? 'docs/visual-reviews/HC-UI-CONVERGENCE-001'

/**
 * Connexion par le quick-login de développement — le même chemin que
 * `e2e/access-control.spec.ts`. C'est un second formulaire sans champ visible :
 * le mot de passe réel du propriétaire n'est jamais saisi dans un navigateur
 * automatisé, et rien n'est lu ni écrit en clair ici.
 */
async function seConnecter(page: Page) {
  await page.goto('/login')
  await page.locator('form').nth(1).locator('button[type="submit"]').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })
}

/** Surfaces capturées : route, nom de fichier, viewport. */
const SURFACES = [
  { route: '/admin', nom: 'admin-home-desktop', w: 1440, h: 900 },
  { route: '/admin/dashboard', nom: 'admin-dashboard-desktop', w: 1440, h: 900 },
  { route: '/admin/operations', nom: 'admin-operations-desktop', w: 1440, h: 900 },
  { route: '/admin/produit', nom: 'admin-product-desktop', w: 1440, h: 900 },
  { route: '/admin/vaults', nom: 'admin-vaults-table', w: 1440, h: 900 },
  { route: '/admin/produit', nom: 'chart-panel', w: 1440, h: 900 },
  { route: '/admin/clients', nom: 'empty-state', w: 1440, h: 900 },
  { route: '/admin/conformite', nom: 'unavailable-state', w: 1440, h: 900 },
  { route: '/admin/keeper', nom: 'form', w: 1440, h: 900 },
  { route: '/admin/produit', nom: 'admin-mining-desktop', w: 1440, h: 900 },
  { route: '/admin/series-1', nom: 'admin-series1-desktop', w: 1440, h: 900 },
  { route: '/admin/profile', nom: 'admin-profile-desktop', w: 1440, h: 900 },
  { route: '/admin', nom: 'admin-laptop', w: 1280, h: 800 },
  { route: '/admin', nom: 'admin-mobile', w: 375, h: 812 },
]

test('captures des surfaces converties', async ({ page }) => {
  test.setTimeout(300_000)
  mkdirSync(SORTIE, { recursive: true })

  const erreursConsole: string[] = []
  const echecsReseau: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') erreursConsole.push(`${page.url()} :: ${m.text()}`)
  })
  page.on('requestfailed', (r) => {
    const raison = r.failure()?.errorText ?? 'inconnu'
    // `ERR_ABORTED` sur /login : la Server Action de connexion répond par une
    // redirection, et le navigateur abandonne la requête en cours pour la
    // suivre. C'est le fonctionnement normal du parcours, pas une ressource
    // manquante — les 17 tests e2e de comportement le prouvent par ailleurs.
    // Tout autre échec, lui, est réel et fait tomber le harnais.
    if (raison === 'net::ERR_ABORTED' && new URL(r.url()).pathname === '/login') return
    echecsReseau.push(`${r.url()} :: ${raison}`)
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await seConnecter(page)

  for (const s of SURFACES) {
    await page.setViewportSize({ width: s.w, height: s.h })
    await page.goto(s.route, { waitUntil: 'networkidle' })
    await page.screenshot({ path: join(SORTIE, `${s.nom}.png`), fullPage: false })
  }

  // Menu mobile ouvert : la seule animation autorisée par la mission.
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/admin', { waitUntil: 'networkidle' })
  await page.screenshot({ path: join(SORTIE, 'navigation-mobile-open.png') })

  // Ces deux-là ne sont pas décoratifs : une capture ne prouve rien si la page
  // a hurlé dans la console pendant qu'on la photographiait.
  expect(erreursConsole, `erreurs console:\n${erreursConsole.join('\n')}`).toEqual([])
  expect(echecsReseau, `requêtes en échec:\n${echecsReseau.join('\n')}`).toEqual([])
})
