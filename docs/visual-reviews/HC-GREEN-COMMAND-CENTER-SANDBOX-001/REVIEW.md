# HC-GREEN-COMMAND-CENTER-SANDBOX-001

**Green Command Center — visual laboratory for the administration Home screen**

| | |
|---|---|
| Date | 2026-07-30 |
| Branch | `sandbox/hc-green-admin-home-v1` |
| Start commit | `f73c22e91a6dc7d2514505efba03288d5cc384ae` (= `origin/main`) |
| Worktree | `../hearst-connect-v1-green-lab` (isolated, main checkout untouched) |
| Sandbox route | `/design-lab/admin-home-green` |
| Baseline route | `/admin` — **not replaced, not modified in behaviour** |
| Deployed | **No.** Nothing pushed to `main`, nothing merged, no Vercel project touched |

---

## 1. What this is

A sandbox that proves the black-and-green command center design against the **real**
administration Home reading, in a route isolated from `/admin`.

The split is deliberate and total:

- the reference prototype supplies **geometry and matter** — colours, textures, gradients,
  the rail, the grid, panel dimensions, separators, spacing;
- `/admin` supplies **content and data contracts** — the figures, the availability states,
  the endpoints behind them.

Not one figure on the laboratory screen is a literal. The prototype's `1,089 BTC`, `$428M`,
`18.4%`, `+22.7%`, `95.8% live`, `03 ITEMS PENDING`, `#167% / 800` and `#R1021` appear
**nowhere** in the code or on the screen.

## 2. Isolation

```
git fetch origin
git worktree add ../hearst-connect-v1-green-lab -b sandbox/hc-green-admin-home-v1 origin/main
```

- `origin/main` HEAD verified as `f73c22e` before branching; main checkout was clean
  (only a pre-existing untracked `docs/dashboard-vision/`).
- All work done in the worktree. `main` never checked out, never modified, never pushed.
- `pnpm` only. **No `package-lock.json` was created** (the Hearst CI is pnpm-only).
- Backend untouched. No Vercel project touched. No deployment.
- Reference archive extracted **outside the repository** (session scratchpad) and left
  unmodified.

## 3. The reference, read in full

`index.html`, `styles.css` and `README.md` were read line by line; `reference.png` and the
rendered `index.html` were both opened and inspected visually at 2048×1146.

Geometry transcribed from `styles.css` rather than estimated:

| Element | Reference value |
|---|---|
| Rail width | `68px`, `position:absolute; left:0; top:0; bottom:0` |
| Rail gradient | `180deg, #36373e 0%, #141519 19%, #24252b 55%, #17181c 100%` |
| Brand block | `70px × 68px`, `linear-gradient(180deg,#41434b,#24252b)` |
| Rail buttons | `68px × 58px` |
| Workspace | `left:68px`, `padding:14px 14px 13px`, `gap:14px` |
| Workspace rows | `116px / minmax(280px,1fr) / 230px` |
| Metrics row | `repeat(5, minmax(0,1fr)) 290px` |
| Main row | `minmax(0,1fr) 290px` |
| Right stack | `118px repeat(4, minmax(0,1fr))` |
| Bottom row | `minmax(0,1fr) 560px 290px` |
| Panel material | `1px solid #141519` + `linear-gradient(180deg,#2b2c33 0%,#111217 26%,#030304 100%)` + `inset 0 1px 0 rgba(255,255,255,.03)` |
| Dust texture | two `radial-gradient` dot fields, `5px/7px`, `opacity .24`, `mix-blend-mode: soft-light` |
| Decision card | `linear-gradient(180deg,#84ff12,#62ed00)`, border `#85ff18` |
| Accent green | `#79ff00` / `#7cff00` |

Colours, noirs, fonds, dégradés and textures were **not** altered, and no raster image is
used as a background.

## 4. Full-screen, verified by measurement

Measured in the browser at 2048×1146, not asserted:

```
rail:      x=0    y=0  w=68   h=1146      (flush left, full height)
main:      x=0    y=0  w=2048             (no outer frame, no page margin)
body radius: 0px                          (no global rounding)
<header> elements: 0                      (no top bar)
scrollWidth == innerWidth == 2048         (no horizontal overflow)
```

## 5. Data — real, shared, honest

The laboratory calls the same loader as `/admin`, once per render:

```ts
const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })
```

Both pages then derive their figures from **one shared module**,
`src/lib/vaults/overview.ts` (`estateOverview`). The laboratory therefore cannot display a
number the console does not display, nor disagree with it about one.

### What the estate actually reads today (2026-07-30, live backend)

| Panel | State | Source / reason |
|---|---|---|
| Active vaults | **0** | `/api/v1/vault` |
| Above threshold | **Unavailable** | `/api/v1/vault/strategies` · `no_vault_allocation_readable` |
| Recent movements | **13** | `/api/v1/series1/events` |
| Live sources | **1/6** | backend endpoint registry |
| Estate value | **Unavailable** | `/api/v1/vault` · `rpc_error` |
| Recent activity curve | **available** — 3 ordered points, Jul 26→28, counts per day | ledger; the money series needs a denomination, which is unreadable, so the panel says "Movements per day" |
| Capital deployed / available / ratio | **Unavailable** | `/api/v1/vault` · `rpc_error` |
| Rebalancing state | **Unavailable** | `/api/v1/vault/strategies` |
| Denomination | **Unavailable** | `/api/v1/vault` · `rpc_error` |
| Movement types | **available** — 6 real types (5/2/2/2/1/1) | ledger |
| Client exceptions | **available** — 1 real row (`adrien · missing investor record`) | `/api/v1/dashboard` |
| Deployment queue | **Not exposed** | `/api/v1/deployments` · `no_deployment_ledger_endpoint` |
| Vault register | 1 vault, `unreadable`, `0x66dF…FaBa` | `/api/v1/vault` |
| Decision queue | **Unavailable** | breach count unreadable → a partial total of pending work would look complete, so none is stated |

Honesty rules held: no invented data, no `Math.random()`, no runtime fixture, no absent
value coerced to zero, no simulated availability. Every absence is named and carries its
route. `check:mocks` enforces this and passes.

## 6. Pixel comparison at 2048 × 1146

### Structural geometry — 23/29 boxes pixel-exact

Every structural element's box was measured in both renders (`geometry-report.json`).
**23 of 29 are exact to the pixel**, including: rail, brand block, workspace, metrics row,
main row, hero panel, right stack, all five signal cards, bottom row, wave panel, info grid,
all four info cells, and the vault panel.

### The one divergence, and why it is intentional

Six boxes differ, all by the same amount and only in height:

```
decisionCard    dx=0 dy=0 dw=0 dh=-26
metricCards[0..4] dx=0 dy=0 dw=0 dh=-26
```

x, y and width are exact. The cause, measured in the reference itself:

```
.metrics-row  declared height: 116px   → measured row bottom:  130px
.metric-card  computed height: 145px   → measured card bottom: 159px
.main-row     starts at:                                       144px
overflow: visible
```

**The reference's own cards overflow the band they declare by 29px and physically overlap
the hero panel beneath them.** 116px is the declared intent; the spill is a bug in the
prototype. The laboratory's cards fill exactly 116px. This is the single place the
composition does not reproduce the reference pixel-for-pixel, and it is deliberate.

### Raster difference

| Metric | Value |
|---|---|
| Mean channel delta | **11.82** / 255 |
| Pixels past a visible threshold (Δ>32) | **10.79 %** |

Progression across the correction passes: `13.96 → 12.66 → 11.91 → 11.82`.

The 50% overlay (`overlay-2048x1146.png`) shows rail, brand block, every panel edge, the
metric band seams, the mint decision card, the five right-stack rows, the three bottom
columns, the 2×2 grid separators, the green rule, the dashed rule, the tick baseline and the
axis label line all superimposing. The difference heatmap (`diff-2048x1146.png`) is green
(matching) across the entire shell and every panel boundary; red is confined to line work
inside the two chart panels and to text.

### Residual delta — what it is, honestly

1. **The reference's nine decorative curves are not reproduced.** They are hand-drawn
   beziers that encode no data. This product has no second series to put on that axis, and
   drawing curves across a plot that has an axis would be an invented reading dressed as
   decoration. Reproduced instead: the plot surface (three-stop background, 135×76 grid
   pattern, five rules, glow filters, gradient definitions), the atmospheric mist volumes,
   and the ribbon in the reference's exact weights (18px halo at .34 under a 7px gradient
   stroke).
2. **Text differs by design** — real labels and real figures against the prototype's
   invented ones. Permitted by the mission ("le contenu métier peut avoir des libellés
   différents"); the geometry, matter and visual hierarchy are what had to match.
3. **The plot's upper two thirds are darker than the reference's**, because the reference's
   pale curve crowd lifts those rows. Pixel-sampled at x=700: the panel top matches exactly
   (`(30,31,37)` and `(27,28,33)` in both renders), confirming the background gradient is
   correctly ported; the divergence lower down is the missing artwork, not a wrong colour.

## 7. Other viewports

| Viewport | Horizontal overflow | Console errors | Failed requests | Behaviour |
|---|---|---|---|---|
| 2048×1146 | 0 px | 0 | 0 | full-screen single-page grid |
| 1440×900 | 0 px | 0 | 0 | reference's `≤1600px` reduction (270px asides, 500px info) |
| 1280×800 | 0 px | 0 | 0 | reference's `≤1280px` reflow: 3-column metrics, decision card loses its left margin, page becomes scrollable |
| 390×844 | 0 px | 0 | 0 | reference's `≤760px` reflow: 54px rail, 2-column metrics, stacked bottom |

Colours and textures are preserved unchanged at every size, as required.

## 8. Gates

All run with `pnpm`, from the worktree:

| Gate | Result |
|---|---|
| `pnpm typecheck` | **PASS** |
| `pnpm lint` | **PASS** |
| `pnpm check:catalyst` | **PASS — and it genuinely ran** |
| `pnpm check:mocks` | **PASS** — 144 runtime files, 5 rules, no simulated data |
| `pnpm test` | **PASS** — 191 tests, 20 files |
| `pnpm build` | **PASS** — `/design-lab/admin-home-green` compiled as a dynamic route |

**No gate was skipped.** On `check:catalyst` specifically — the known trap is that a missing
`catalyst-doctor` yields "VÉRIFICATION SAUTÉE" with exit 0. The output was read, not just the
exit code: the tool was found and reported

```
Design system déclaré: src/styles/tailwind.css (100 tokens · accent vert #63db43, H≈107°)
✓ Classes maison — toutes résolues contre les tokens déclarés ici
✓ PROPRE — design system déclaré par ce projet, aucune fuite.
```

One non-blocking warning (`--color-brand-` nomenclature) is **pre-existing on `main`** and
not introduced by this work.

## 9. Behavioural checks — 10/10

Measured in the browser, not asserted:

- unauthenticated visit → redirected to `/login?reason=expired`
- authenticated visit → laboratory renders (200)
- **no session/bearer material appears in the served HTML** (cookie segments compared
  against the full page source)
- no hydration mismatch
- no console errors
- exactly one rail, **zero** Catalyst sidebars, **zero** `<header>` elements, one `<main>`
  — no double shell
- rail flush at x=0, 68px wide, 1146px tall
- no outer frame; no horizontal overflow
- six rail destinations reachable by keyboard
- visible focus ring on focused rail elements (the reference has no focus style at all,
  since nothing in it is reachable; that was not a property worth porting)

## 10. `/admin` is unchanged — proven, not claimed

The pure calculations were extracted out of `src/app/admin/page.tsx` into
`src/lib/vaults/overview.ts` so both surfaces share one derivation. To prove this changed
nothing:

`/admin` was captured at 2048×1146 with the same session **before** and **after** the
extraction. Both PNGs are **byte-identical** (`sha256` prefix `aa676fd2a2eb2bed`).

## 11. Components — reused vs. created

**Reused unchanged** (no copy, no fork):

- `requireSession` — the same guard `/admin/layout.tsx` uses
- `loadAdminRegistry`, `AdminRegistry`, `SourceHealth`
- `Availability`, `available`, `unavailable`, `isAvailable`, `mapAvailability`, `combine`,
  `deployedAtomic`, `idleAtomic`
- `formatCurrency`, `formatNumber`, `formatAddress`, `formatRelativeTime`
- `libelleMouvement`

**Extracted and now shared by `/admin` and the laboratory:**

- `src/lib/vaults/overview.ts` — `denomination`, `sumAcrossVaults`, `asMoney`,
  `movementTypeBars`, `recentActivityTrend`, `estateOverview`, `MOVEMENT_WINDOW`,
  `MOVEMENT_ROWS`
- `tests/vaults/overview.test.ts` — 17 tests covering the truthfulness invariants
  (unreadable operand propagates; empty register ≠ zero; a count with no source never
  renders "0"; a one-point series is a named absence, not a flat line)

**Created for the laboratory** (`src/components/design-lab/green-command-center/`):

| File | Role |
|---|---|
| `green-command-center.module.css` | all visual matter, scoped |
| `primitives.tsx` | `Panel`, `Absent`, `Reading` |
| `green-command-center-shell.tsx` | `GreenCommandCenterShell` |
| `green-command-rail.tsx` | `GreenCommandRail` |
| `green-metric-strip.tsx` | `GreenMetricStrip`, `GreenDecisionPanel` |
| `green-hero-chart-panel.tsx` | `GreenHeroChartPanel` |
| `green-signal-stack.tsx` | `GreenSignalStack` |
| `green-wave-panel.tsx` | `GreenWavePanel` |
| `green-activity-panel.tsx` | `GreenInfoGrid`, `GreenVaultPanel` |
| `green-admin-home-dashboard.tsx` | `GreenAdminHomeDashboard` — the reference↔`/admin` mapping |

**Deliberately not reused:** `SourceAvailabilityBadge`. Its *contract* is kept (an absence
shows the word, the reason and the route, never a number), but it is a Catalyst-styled badge
built for the graphite console; dropped onto this near-black prototype its padding would
break the 7px caption rhythm the reference geometry depends on.

## 12. What was NOT touched

- `src/styles/tailwind.css` — no global token added, changed or removed
- `.cockpit-theme` — untouched
- `src/components/catalyst/**` — untouched (no second copy of Catalyst)
- `src/lib/admin-nav.ts` — untouched; the laboratory is not in the navigation
- `@hearst/design-system` — not installed
- the public marketing site — no link to the laboratory
- the backend — no call added or changed

The only edits outside new files are `src/app/admin/page.tsx` (extraction, provably
output-identical) and `.gitignore` (one entry, `.visual-tmp/`, for the throwaway capture
harness).

## 13. Mapping — reference slot → real content

| Reference slot | Real content |
|---|---|
| 5 metric cards | Active vaults · Above threshold · Recent movements · Live sources · Estate value |
| Decision queue (mint) | breached pockets + blocked clients, or a named absence |
| Hero plot | Recent activity (`recentActivityTrend`) |
| Right stack ×5 | Capital deployed · Available capital · Deployment ratio · Rebalancing state · Denomination |
| Lower-left wave | Movement types |
| Info grid 2×2 | Client exceptions · Deployment queue · Source health · Recent activity |
| Bottom-right card | Vault register + estate value + source activity |

## 14. Not yet proven / left open

Stated plainly:

- **The reference's decorative curve crowd is absent**, by choice. If the design is to keep
  that density, it needs either real additional series or an explicit decision that the
  panel carries ornament. This is the main open design question.
- **The prototype font is kept** (`Arial, Helvetica, sans-serif`) so the geometry stays
  comparable. The product font is Satoshi. Substituting it will move every label slightly;
  the migration must re-measure.
- **`reference.png` was compared by eye, not by pixel arithmetic** — the numeric comparison
  is against the rendered `index.html`, which is the canonical source.
- **No a11y audit tool was run** (no axe/Storybook a11y wiring in this repo). Keyboard
  reachability and focus visibility were measured; contrast on the mint decision card and on
  the 7px/8px captions has **not** been formally verified. The 7–8px caption sizes come from
  the reference and are below what the console would normally ship.
- **The 390×844 rail caption is clipped** ("HEARS↵CONNECT") — cosmetic, inherited from the
  reference's 54px rail.
- **`/admin` was verified unchanged by screenshot and by the full test suite**, not by a
  route-level snapshot test. No such harness exists in the repo.
- The laboratory reads the estate in its **current degraded state** (`rpc_error` on the
  vault snapshot). The panels that carry money figures have therefore been seen only in
  their absence branch. Their available branch is covered by unit tests, not by a screenshot.

## 15. Stop conditions — all respected

- `/admin` **not** replaced
- navigation **not** modified
- **nothing** merged
- **nothing** pushed to `main`
- **nothing** deployed
- **no** package published
- Hearst Design System migration **not** started

## 16. Recommendation for the Design System phase

1. **Settle the plot density question first.** It is the only substantive gap and it is a
   product decision, not an implementation detail: either the hero panel gets real
   additional series (candidates: NAV per share over time, utilisation against the TVL cap,
   per-pocket drift) or the ornament is accepted explicitly. Everything else is already in
   place.
2. **Promote the CSS-module variables to tokens, not the class names.** The `--gcc-*` block
   at the root of `green-command-center.module.css` is already the single declaration point.
   Note the collision to resolve: the console's accent is Hearst mint `#a7fb90`, the
   prototype's is neon `#79ff00`. Two accents cannot both be "the" accent — that choice
   belongs to the design system phase, and until it is made the laboratory keeps its own
   scoped values so nothing leaks into the vitrine or the console.
3. **Raise the caption sizes before this becomes a product surface.** 7–8px is a prototype
   value; pick the smallest size the design system is willing to defend and re-measure the
   band heights, which will change.
4. **Fix the metrics band contract.** Either the cards fit 116px (what this laboratory does)
   or the band grows to the ~145px the content needs. The reference does neither and spills.
5. **Keep the `estateOverview` seam.** It is what made this sandbox provably consistent with
   `/admin`; a replacement screen should consume it rather than restate the arithmetic.
6. Replace the rail's placeholder glyphs with the console's real icon set at the same time
   the font is switched, and re-run this review — both changes move optical weight.
