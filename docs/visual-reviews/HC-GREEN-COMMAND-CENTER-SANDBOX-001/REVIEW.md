# HC-GREEN-COMMAND-CENTER-SANDBOX-001

**Green Command Center — visual laboratory for the administration Home screen**

> Archive note (current repo state): this file documents the initial isolated sandbox pass.  
> The `/admin` migration is now propagated in the main app; use `README.md` for the current route-level status.

| | |
|---|---|
| Date | 2026-07-30 |
| Branch | `sandbox/hc-green-admin-home-v1` |
| Start commit | `f73c22e91a6dc7d2514505efba03288d5cc384ae` (= `origin/main`) |
| Worktree | `../hearst-connect-v1-green-lab` (isolated, main checkout untouched) |
| Sandbox route | `/design-lab/admin-home-green` |
| Baseline route | `/admin` — **not replaced, not modified in behaviour** |
| Deployed | **No.** Nothing pushed to `main`, nothing merged, no Vercel project touched |
| Revision | Correction pass — decorative curve texture restored, metric band contract fixed |

---

## 0. What the correction pass changed

Three things, and nothing else:

1. **The reference's decorative curves are restored.** All twelve paths, verbatim, as an
   `aria-hidden` prop-less texture layer painted under the data layer — see **§6bis**. The
   previous pass omitted them; that was over-cautious and cost the panel the reference's
   material.
2. **The metric band contract is fixed.** The band now takes the 145px its cards actually
   need, so they fit exactly: no spill, no overlap with the hero row, no card overflow, no
   page scroll — asserted at **all four viewports** (§6).
3. **The plot's accent hierarchy is protected.** Two decorative green lines and the threshold
   rule are held back in opacity so the full accent belongs to the measured series alone.
   Geometry, hue and stroke weight are the reference's; **no colour, texture, surface,
   gradient or light value changed** (§6bis).

Consequence to read honestly: fixing the band moved the geometry count from 23/29 to **20/29**
pixel-exact boxes. The reference *render* overlaps its own rows; refusing that overlap
necessarily places everything below the band 29px lower. The metric strip itself became exact.

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

### Structural geometry — 20/29 boxes pixel-exact

Every structural element's box was measured in both renders (`geometry-report.json`).
**20 of 29 are exact to the pixel**, including: rail, brand block, workspace, the metrics
row, **all five metric cards and the decision card**, bottom row, wave panel, info grid, all
four info cells, and the vault panel.

The metric strip is now exact where it previously was not: its band mean delta fell from
**7.60 to 4.37** once the band contract was fixed (below).

### The metric band contract

The reference declares `height:116px` on `.metrics-row`, but its own cards compute to 145px
and nothing clips them. Measured in the reference itself at 2048 × 1146:

```
.metrics-row  declared height: 116px   → measured row bottom:  130px
.metric-card  computed height: 145px   → measured card bottom: 159px
.main-row     starts at:                                       144px
overflow: visible
```

**The reference's cards spill 29px past their band and physically overlap the hero panel
beneath them.** 145px is therefore the height the reference's content actually needs; the
declared 116px was never sufficient for it. The band adopts the content height, and the extra
29px comes out of the hero row's `1fr` so the three rows still fill the viewport exactly.

Asserted, not assumed — 5/5 at the canonical viewport and **4/4 across all reviewed
viewports** (`geometry-report.json → metricBandContract`):

| Assertion | Result |
|---|---|
| every card height equals the band height | **PASS** — band 145px, cards 145px |
| no card spills past the band | **PASS** — spill 0px |
| no overlap with the next row | **PASS** — band ends 159, hero row starts 173 (14px gap) |
| no card overflows its own content box | **PASS** |
| page does not scroll vertically | **PASS** |

| Viewport | Band | Cards | Spill | Overlap | Overflow-X |
|---|---|---|---|---|---|
| 2048×1146 | 145px | 145px | 0px | 0px | 0px |
| 1440×900 | 145px | 145px | 0px | 0px | 0px |
| 1280×800 | 238px | 119px | 0px | 0px | 0px |
| 390×844 | 359px | 115/107/137px | 0px | 0px | 0px |

### The remaining divergence, and why it follows from the contract

Nine boxes differ. All are the rows *below* the band, all by the same 29px, and `dx`/`dw` are
zero on every one of them:

```
metricsRow     dx=0 dy=0  dw=0 dh=+29
mainRow        dx=0 dy=29 dw=0 dh=-29
heroChart      dx=0 dy=29 dw=0 dh=-29
rightStack     dx=0 dy=29 dw=0 dh=-29
signalCards[0..4]  dx=0 dy=8…29 dw=0 dh=0…-7
```

This is the direct arithmetic consequence of "no overlap": the reference *render* has its
cards sitting on top of the hero panel, so any layout that refuses that overlap must place
the hero row 29px lower. **The geometry count went from 23/29 to 20/29 precisely because the
band contract was fixed** — the two requirements are in tension, and the contract was given
priority as instructed.

### Raster difference

| Metric | Value |
|---|---|
| Mean channel delta | **13.58** / 255 |
| Pixels past a visible threshold (Δ>32) | **10.44 %** |
| Metric band (band 0) mean delta | **4.37** — was 7.60 before the contract fix |

The mean delta rose (11.82 → 13.58) while the **visible-difference share fell**
(10.79 % → 10.44 %). Both movements come from the same cause: restoring the reference's
twelve decorative paths puts a great deal of pale line work back on screen, and because the
hero row now sits 29px lower, each of those paths registers as a *pair* in the difference
image. That inflates the mean without adding new structural error — the shell, the panel
boundaries and the metric strip all match more closely than before.

The 50% overlay (`overlay-2048x1146.png`) shows rail, brand block, every panel edge, the
metric band seams and its card divisions, the mint decision card, the three bottom columns,
the 2×2 grid separators and the wave panel all superimposing. The difference heatmap
(`diff-2048x1146.png`) is green (matching) across the entire shell, the metric strip and
every panel boundary.

### Residual delta — what it is, honestly

1. **The 29px vertical offset of every row below the metric band**, explained above. Each of
   the reference's decorative paths therefore appears twice in the difference image — once at
   the reference's y, once at the laboratory's. This is the largest single contributor to the
   raster delta and it is a consequence of the no-overlap requirement, not an error.
2. **Text differs by design** — real labels and real figures against the prototype's
   invented ones. Permitted by the mission ("le contenu métier peut avoir des libellés
   différents"); the geometry, matter and visual hierarchy are what had to match.
3. **Two decorative green lines and the plot's green threshold rule are held back in
   opacity** — see §6bis. Their geometry, hue and weight are the reference's.

## 6bis. The decorative curve texture

The reference's plot is nine hand-drawn bezier curves, a broad white glow pass and two mist
volumes. **All twelve paths are reproduced verbatim** in
`green-plot-texture.tsx` — every coordinate, stroke, opacity and filter reference is
transcribed from the prototype's `index.html`, not re-authored.

They are **texture, not measurement** — the same category of thing as the dust field on the
shell or the gradient under a panel. Three properties make that structural rather than a
convention someone has to remember:

1. **`aria-hidden="true"` and `role="presentation"`, with no accessible text.** Assistive
   technology is never told these lines exist, because there is nothing to tell: they carry
   no value, no unit and no series. Asserted by check 10 of §9.
2. **The component takes no props.** It cannot read a vault, a movement or an availability,
   so it cannot render a figure — not by accident, and not after a future edit. This is
   what keeps the honesty guarantee from depending on anyone's discipline.
3. **It is painted under the data layer**, which lives in its own `[data-gcc="plot-series"]`
   group. Asserted by check 11 of §9; the SVG `<desc>` names only the measurement
   (check 12), e.g. *"Movements per day: 3 measured points, drawn as the single neon green
   curve. Jul 26 4, Jul 27 2, Jul 28 7."*

**One departure from the reference's values, and why.** In the prototype, two of the
decorative curves and the plot's horizontal threshold rule are `#7cff00` — the same green as
its neon ribbon. That is harmless in a file where nothing is a measurement. Here the accent
green **is** the measurement: three curves in the identical accent would leave a reader unable
to tell which line is the reading, which is precisely the confusion this console exists to
prevent. Those three paths keep the reference's geometry, hue and stroke weight and are held
back in opacity (`.28` on the two curves, `.4` on the rule); the measured series gains a thin
solid core so it survives against the restored texture.

That is a legibility constraint applied to a decorative layer. **No colour, texture, surface,
gradient or light value was changed** — verified by diff: zero colour, gradient, shadow or
filter values differ in the CSS module, and `src/styles/tailwind.css` and
`src/components/catalyst/**` are untouched.

### Colour fidelity, pixel-sampled

Sampled at x=700 in both renders, the panel top matches exactly — `(30,31,37)` at y=150 and
`(27,28,33)` at y=200 — confirming the plot's three-stop background gradient is ported
correctly rather than approximated.

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
| `pnpm check:mocks` | **PASS** — 145 runtime files, 5 rules, no simulated data |
| `pnpm test` | **PASS** — 191 tests in 20 files |
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

## 9. Behavioural checks — 14 of 14 pass

Measured in the browser, not asserted:

1. unauthenticated visit → redirected to `/login?reason=expired`
2. authenticated visit → laboratory renders (200)
3. **no session/bearer material appears in the served HTML** (cookie segments compared
   against the full page source)
4. no hydration mismatch
5. no console errors
6. exactly one rail, **zero** Catalyst sidebars, **zero** `<header>` elements, one `<main>`
   — no double shell
7. rail flush at x=0, 68px wide, 1146px tall
8. no outer frame; no horizontal overflow
9. decorative curve layer present, carrying 12 reference paths
10. **decorative layer is `aria-hidden`, `role="presentation"`, and carries no accessible
    text** — no `<title>`, `<desc>`, `<text>` or `aria-label` anywhere inside it
11. **measured series is a separate layer painted after the texture**
12. **the SVG description names only the measurement** — checked against its rendered text
13. six rail destinations reachable by keyboard
14. visible focus ring on focused rail elements (the reference has no focus style at all,
    since nothing in it is reachable; that was not a property worth porting)

Checks 9–12 are new in this pass and exist specifically to keep the restored decorative
texture from ever being read as data.

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
| `green-plot-texture.tsx` | `GreenPlotTexture` — the reference's 12 decorative paths, `aria-hidden`, prop-less |
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

The only edit outside new files, across both passes, is `src/app/admin/page.tsx` — the
pure-calculation extraction, provably output-identical (§10). `.gitignore` is unmodified: the
capture harness lived in an untracked scratch directory and was deleted after use.

**This correction pass touched exactly two files**, both laboratory-only:

```
src/components/design-lab/green-command-center/green-command-center.module.css
src/components/design-lab/green-command-center/green-hero-chart-panel.tsx
+ src/components/design-lab/green-command-center/green-plot-texture.tsx  (new)
```

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

- **The decorative texture is now an accepted ornament**, not an absence. §6bis states that
  explicitly, and the checks in §9 keep it from being read as data. What remains a **product
  decision** is whether the shipped screen should keep ornament in a data panel at all, or
  earn that density from real additional series (candidates: NAV per share over time,
  utilisation against the TVL cap, per-pocket drift). This laboratory does not settle that.
- **The accent hierarchy inside the plot is a judgement, not a measurement.** Holding two
  decorative green lines and the threshold rule back in opacity is what makes the measured
  series identifiable; the exact opacities (`.28`, `.4`) were chosen by eye against the
  restored texture, not derived from a contrast target.
- **The prototype font is kept** (`Arial, Helvetica, sans-serif`) so the geometry stays
  comparable. The product font is Satoshi. Substituting it will move every label slightly;
  the migration must re-measure.
- **`reference.png` was compared by eye, not by pixel arithmetic** — the numeric comparison
  is against the rendered `index.html`, which is the canonical source.
- **No a11y audit tool was run** (no axe/Storybook a11y wiring in this repo). Keyboard
  reachability, focus visibility and the decorative layer's exclusion from the accessibility
  tree were measured; **contrast has not been formally verified** — not on the mint decision
  card, not on the 7px/8px captions, and not on the accent ribbon against the restored
  texture. The 7–8px caption sizes come from the reference and are below what the console
  would normally ship. **This remains unproven and is the first thing to check before any of
  this becomes a product surface.**
- **The 390×844 rail caption is clipped** ("HEARS↵CONNECT") — cosmetic, inherited from the
  reference's 54px rail.
- **`/admin` was verified unchanged by screenshot and by the full test suite**, not by a
  route-level snapshot test. No such harness exists in the repo. That verification was made
  against the pure-calculation extraction; **this correction pass touched only laboratory
  files**, so `/admin` is untouched by it too (see §12).
- The laboratory reads the estate in its **current degraded state** (`rpc_error` on the
  vault snapshot). The panels that carry money figures have therefore been seen only in
  their absence branch. Their available branch is covered by unit tests, not by a screenshot.
- **The 29px offset of the lower rows against the reference render is permanent** while the
  no-overlap requirement holds. It cannot be closed without reintroducing the prototype's
  spill; §6 explains the tension.

## 15. Stop conditions — all respected

- `/admin` **not** replaced
- navigation **not** modified
- **nothing** merged
- **nothing** pushed to `main`
- **nothing** deployed
- **no** package published
- Hearst Design System migration **not** started

## 16. Recommendation for the Design System phase

1. **Decide whether a data panel may carry ornament.** The reference's texture is now
   reproduced and provably excluded from the accessibility tree, so the density question is no
   longer an implementation gap — it is a product choice. Either the ornament stays (and the
   `GreenPlotTexture` seam is where it lives), or the hero panel earns that density from real
   additional series: NAV per share over time, utilisation against the TVL cap, per-pocket
   drift. Whichever way it goes, the accent must keep belonging to the measurement alone.
2. **Promote the CSS-module variables to tokens, not the class names.** The `--gcc-*` block
   at the root of `green-command-center.module.css` is already the single declaration point.
   Note the collision to resolve: the console's accent is Hearst mint `#a7fb90`, the
   prototype's is neon `#79ff00`. Two accents cannot both be "the" accent — that choice
   belongs to the design system phase, and until it is made the laboratory keeps its own
   scoped values so nothing leaks into the vitrine or the console.
3. **Verify contrast, then raise the caption sizes.** Contrast is the one thing this review
   could not prove (§14): the mint decision card, the 7–8px captions and the accent ribbon
   over the restored texture are all unmeasured. 7–8px is a prototype value; pick the smallest
   size the design system will defend, then re-measure the band heights, which will change.
4. **The metrics band contract is settled — keep it.** The band takes the 145px its content
   needs; the reference's declared 116px never fitted its own cards. If the caption sizes
   change, that number changes with them, and `--gcc-metrics-h` is the single place to edit.
5. **Keep the `estateOverview` seam.** It is what made this sandbox provably consistent with
   `/admin`; a replacement screen should consume it rather than restate the arithmetic.
6. Replace the rail's placeholder glyphs with the console's real icon set at the same time
   the font is switched, and re-run this review — both changes move optical weight.
