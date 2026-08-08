/**
 * HC-ADMIN-FLUID-RESPONSIVE-035 — continuous width sweep for /admin.
 * Usage: node scripts/width-sweep-admin.mjs [baseUrl] [outJson]
 */
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const baseUrl = process.argv[2] || 'http://localhost:4105'
const outPath = resolve(process.argv[3] || 'tmp/width-sweep-before.json')

const WIDTHS = [
  1600, 1536, 1480, 1440, 1380, 1320, 1280, 1240, 1200, 1160, 1120, 1080, 1024,
  980, 940, 900, 860, 820, 768, 720, 680, 640, 600, 540, 480, 430, 390, 360,
]

async function measure(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main')
    const mainRect = main?.getBoundingClientRect()
    const sidebar = document.querySelector('div.fixed.inset-y-0.left-0.w-64')
    const sidebarVisible = !!(sidebar && getComputedStyle(sidebar).display !== 'none')
    const cards = [...document.querySelectorAll('h2')].map((h) => {
      const section = h.closest('section') || h.parentElement
      const r = section.getBoundingClientRect()
      return {
        title: h.textContent?.trim() || '',
        w: Math.round(r.width),
        h: Math.round(r.height),
        left: Math.round(r.left),
        top: Math.round(r.top),
      }
    })
    const rows = []
    for (const c of cards) {
      const row = rows.find((r) => Math.abs(r.top - c.top) < 48)
      if (row) row.cards.push(c)
      else rows.push({ top: c.top, cards: [c] })
    }
    const chart = document.querySelector('[data-widget="activity-chart"] svg, .recharts-wrapper, [aria-hidden="true"] svg')
    let chartW = null
    if (chart) {
      const parent = chart.closest('[style], div') || chart
      chartW = Math.round(parent.getBoundingClientRect().width)
    }
    // Prefer measured chart slot via canvas/svg under Activity card
    const activityCard = cards.find((c) => c.title === 'Activity')
    if (activityCard) {
      const h2 = [...document.querySelectorAll('h2')].find((x) => x.textContent?.trim() === 'Activity')
      const svg = h2?.closest('section')?.querySelector('svg')
      if (svg) chartW = Math.round(svg.getBoundingClientRect().width)
    }
    const hScroll = [...document.querySelectorAll('*')].filter((el) => {
      const s = getComputedStyle(el)
      return (s.overflowX === 'auto' || s.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 2
    }).length
    const cqWidths = [...document.querySelectorAll('div')]
      .filter((el) => typeof el.className === 'string' && el.className.split(/\s+/).includes('@container'))
      .map((el) => Math.round(el.getBoundingClientRect().width))
      .filter((w, i, arr) => w > 200 && arr.indexOf(w) === i)
      .slice(0, 8)
    return {
      vw: innerWidth,
      pageOverflow: document.documentElement.scrollWidth - innerWidth,
      hScroll,
      mainW: mainRect ? Math.round(mainRect.width) : null,
      sidebarVisible,
      cqWidths: cqWidths.slice(0, 8),
      chartW,
      mode: rows.map((r) => ({
        n: r.cards.length,
        titles: r.cards.map((c) => c.title),
        widths: r.cards.map((c) => c.w),
        heights: r.cards.map((c) => c.h),
      })),
      cards,
    }
  })
}

function cliffScore(prev, cur) {
  const issues = []
  if (!prev) return issues
  if (prev.sidebarVisible !== cur.sidebarVisible) {
    issues.push(`sidebar ${prev.sidebarVisible ? 'shown' : 'hidden'}→${cur.sidebarVisible ? 'shown' : 'hidden'}`)
  }
  if (Math.abs((prev.mainW || 0) - (cur.mainW || 0)) > 180) {
    issues.push(`mainW jump ${prev.mainW}→${cur.mainW}`)
  }
  const prevModes = prev.mode.map((m) => m.n).join(',')
  const curModes = cur.mode.map((m) => m.n).join(',')
  if (prevModes !== curModes) issues.push(`grid ${prevModes}→${curModes}`)
  for (const title of ['Activity', 'Market', 'Portfolio exposure', 'Recent clients', 'Recent activity']) {
    const a = prev.cards.find((c) => c.title === title)
    const b = cur.cards.find((c) => c.title === title)
    if (a && b && a.w > 0) {
      const delta = (b.w - a.w) / a.w
      if (Math.abs(delta) >= 0.35) issues.push(`${title} width ${a.w}→${b.w} (${Math.round(delta * 100)}%)`)
    }
  }
  if (cur.pageOverflow > 0) issues.push(`overflow ${cur.pageOverflow}`)
  if (cur.hScroll > 0) issues.push(`hScroll ${cur.hScroll}`)
  // micro columns in 2-col mode
  for (const row of cur.mode) {
    if (row.n === 2) {
      for (let i = 0; i < row.widths.length; i++) {
        if (row.widths[i] < 240) issues.push(`micro-col ${row.titles[i]}=${row.widths[i]}`)
      }
    }
  }
  return issues
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' })
const quick = page.getByRole('button', { name: /Quick owner sign-in/i })
if (await quick.count()) {
  await quick.click()
  await page.waitForURL(/\/admin/, { timeout: 15000 }).catch(() => {})
}
await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' })
await page.waitForSelector('h2', { timeout: 20000 })

const rows = []
let prev = null
for (const w of WIDTHS) {
  await page.setViewportSize({ width: w, height: 900 })
  await page.waitForTimeout(180)
  const m = await measure(page)
  const issues = cliffScore(prev, m)
  rows.push({
    width: w,
    overflow: m.pageOverflow,
    hScroll: m.hScroll,
    mainW: m.mainW,
    sidebar: m.sidebarVisible,
    chartW: m.chartW,
    cq: m.cqWidths,
    grid: m.mode.map((r) => `${r.n}[${r.titles.map((t, i) => `${t}:${r.widths[i]}`).join('|')}]`).join(' || '),
    issues,
  })
  prev = m
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify({ baseUrl, at: new Date().toISOString(), rows }, null, 2))

const cliffs = rows.filter((r) => r.issues.length)
const overflows = rows.filter((r) => r.overflow > 0 || r.hScroll > 0)
const micro = rows.filter((r) => r.issues.some((i) => i.startsWith('micro-col')))

console.log(`Wrote ${outPath}`)
console.log(`steps=${rows.length} cliffs=${cliffs.length} overflowSteps=${overflows.length} microSteps=${micro.length}`)
console.log('\n=== CLIFFS ===')
for (const c of cliffs) {
  console.log(`${c.width} main=${c.mainW} sidebar=${c.sidebar} :: ${c.issues.join('; ')}`)
  console.log(`  grid: ${c.grid}`)
}
console.log('\n=== SAMPLE GRID MODES ===')
for (const w of [1600, 1440, 1280, 1180, 1100, 1024, 900, 768, 640, 480, 390]) {
  const r = rows.find((x) => x.width === w) || rows.reduce((best, x) => (Math.abs(x.width - w) < Math.abs(best.width - w) ? x : best), rows[0])
  console.log(`${r.width}: sidebar=${r.sidebar} main=${r.mainW} chart=${r.chartW} | ${r.grid}`)
}

await browser.close()
