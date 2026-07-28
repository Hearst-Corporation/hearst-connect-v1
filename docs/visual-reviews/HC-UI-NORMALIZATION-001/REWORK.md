# HC-UI-REWORK-002 — Composition rework + approved visual system

**Branch:** `feat/hc-ui-normalization-001` · **Status:** `mission:review` — **not merged, not deployed.**

Answers the rework rejection of the previous pass (`REVIEW.md`, screenshots `after-*.png`), then
applies the approved visual system supplied mid-pass. Screenshots `rework-*.png` in this folder
were captured against a **production build** (`next build` + `next start`), not the dev server.

---

## 1 · A real 12-column application grid

`src/components/admin/grid.tsx` (new) is the only way a page composes now.

| Piece | What it is |
|---|---|
| `AdminGrid` | 4 cols base / 8 at `md` / 12 at `lg`, `gap-6`, **`items-start`** |
| `AdminCol span={n}` | a declared lg span (1–12), with `md`/`base` overrides |
| `AdminMetricGrid count={n}` | a tile grid that never leaves an orphan in the last row |
| `AdminChartSplit` | the canonical chart 8 / interpretation 4 |
| `AdminTableSplit` | toolbar + table full width, summary in a deliberate secondary column |

Spans are **literal class strings in lookup tables**. A class built by concatenation
(`` `lg:col-span-${n}` ``) is never emitted by Tailwind — the repo had one such dead class
(`` `sm:${chartTheme.height.medium}` ``) that had silently never applied.

`items-start` is the default on purpose: grid items stretch to their tallest row-mate unless told
otherwise, and that is exactly how a card holding four lines ended up 200px tall next to a long
list. Every card now ends where its content ends.

`max-w-[1600px]` → **`max-w-[1280px]`** (`src/lib/layout-tokens.ts`). The page inset lives in the
shell and nowhere else, so left and right margins are identical on all 17 routes — measured at
1440: content box `x=296 … right=1392`, 40px each side.

## 2 · Five primary destinations

`ADMIN_NAV` went from fourteen entries to **Home · Clients · Compliance · Operations ·
Administration**. Fourteen equally-weighted choices is an index, not navigation.

The other twelve screens moved to `ADMIN_SECONDARY`, grouped *Portfolio / Production / Service /
Account*, and Administration renders them as one compact four-column list. `hrefActif` resolves any
secondary route to `/admin/administration`, so the sidebar never goes dark and you always know
where you are. Nothing became unreachable.

## 3 · Hierarchy

Three heading levels used to sit in a 10px range — 24 / 18 / 14px — so an H1 read like a card title.

| Role | Before | After |
|---|---|---|
| H1 page title | `text-2xl/8` | `text-3xl/9` → `sm:text-4xl/10` |
| H2 section title | `text-lg/7` | `text-xl/7` |
| H3 surface title | `text-sm/6` | `text-base/6` |
| label | `text-xs/5` | `11px`, uppercase, `tracking-[0.08em]` |

Every route is `AdminPage → PageHeader → sections`, identical top alignment and spacing.

## 4 · Nested-card architecture removed

- **`AdminSection` is no longer a card.** It used to wrap its children in a sunken, ringed, padded
  panel, so every card sat inside a second box carrying no information. It now renders a hairline,
  its H2, and a plain stack.
- `CardHeader`, `AdminSurfaceHeader`, `PanelHeading`, `AdminStatusMatrix` lost their bottom rules —
  a bordered header inside a bordered panel is a frame inside a frame.
- Empty states lost their ringed inner box; `AdminMetric` tiles became their own surface instead of
  a tile inside a panel inside a section.
- Eleven page-level `<AdminSection>` wrappers with no title — empty containers around everything —
  were deleted.

## 5 · Layout recipes

Dashboard overview (primary metric 5 cols, supporting metrics balanced, chart 6–8, panel the rest);
metric grid (2/3/4/6 fixed, `auto-fit` for 5/7/11 so the last row still ends flush); data + chart
split (8/4); table page; single concise empty state.

## 6 · Runtime

Six deployment tiles in `sm:grid-cols-2 lg:grid-cols-4` produced a row of four, then **two stranded
on the left of an empty row**. Now an explicit-span `AdminGrid` giving a balanced 3×2 at every
breakpoint. Outer framing reduced; the raw-response block composes through declared spans.

## 7 · Administration

The giant container around Team and Decision Log is gone. Account and access on **4 columns**,
Decision log on **8**, both sized to their content, then the twelve secondary screens as a compact
grouped list, then one compact sources state. The local `SECONDARY_SCREENS` array that duplicated
three of those entries was deleted in favour of the shared registry.

## 8 · Single observations

`SingleObservation` (new): large value · period · context · compact marker · an explicit sentence
that no trend is measurable yet. Mining and Bitcoin branch to it via `plottableAsChart(n)` —
`n >= 2` — instead of rendering one thin bar into a 240px plot. The `ChartFrame` wrapper stays in
both cases: the question and the unit are still owed to the reader.

## 9 · Charts

`chartHeight(kind, points)` returns **pixels derived from the chart type and the number of
observations**, replacing one global fixed height. Horizontal bars grow 44px per row (clamped
132–420); columns step 180 → 210 → 240 → 280. Grid opacity 0.08 → 0.06. Direct value labels added
where they let an axis be dropped entirely. Padding aligned to `CardHeader` so plot and title share
a left edge.

## 10 · Product Sheet · 11 · Backtests

Product Sheet leads with the subscription amount, with duration and fund cap in a compact
supporting grid beside it. Backtests rendered an empty `ChartFrame` **and** a `SourceAttendue`,
both saying no backtest exists, together consuming a viewport; it is now one composed empty state —
title, explanation, three requirements, the register status the service actually returned — and no
fake chart canvas. The "service did not respond" branch stays distinct from "no backtest has been
run": different truths.

## 12 · One brand palette

Ordinary data uses mint + neutrals only. Green and orange are semantic and are spent only against a
stated threshold — `SEUIL_ECART_SIGNALE_PT = 2`, named in the code and in the visible caption, so a
0.7 pt drift no longer screams. The six-hue rainbow in the distribution chart became
`categoricalColor(i)`: **one accent bar, the rest neutral graphite**, matching the approved
reference's own chart.

## 13 · The approved visual system

Applied from *Hearst Adapted Design System* (neutral-lighter variant). Canonical tokens are declared
in `src/styles/tailwind.css` and asserted by `tests/layout-doctrine.test.tsx`.

| Token | Value | Role |
|---|---|---|
| `--color-console-app` | `#101010` | application black — sidebar and page plane |
| `--color-console-shell` | `#232323` | graphite canvas the page floats on |
| `--color-console-card` | `#2a2a2a` | charcoal card |
| `--color-console-card-top` | `#303030` | raised: tooltips, chips, tracks |
| `--color-console-inset` | `#202020` | a block genuinely sunk into a card |
| `--color-console-line{-soft,-strong}` | white at `.08` / `.13` / `.18` | separators |
| accent (console) | `#a7fb90` | brand mint, accent and status only |

**Cards are lighter than the shell they sit on.** That inversion is the legibility gain — the
previous build cut cards out of the background as darker holes, so every panel read as a recess. A
test asserts it (`lum(card) > lum(shell) > lum(app)`).

**No blue undertone.** Two sources of blue were removed:

1. `.cockpit-theme` remapped zinc to *canonical Tailwind zinc*, which is visibly cool (`zinc-600`
   was `#52525b`). The ramp is now true neutral graphite — a test asserts equal R=G=B channels on
   every surface token.
2. The `info` hue (`#0082f3`) coloured "Informational" alerts, `IDLE`, and the `info` status badge.
   All three are now graphite: an alert that needs no decision has no business carrying a fourth
   hue. A test greps the whole console for `*-info-*` / `*-hearst-info`.

Shell radius 12 → 16px, shadow `0 16px 40px rgba(0,0,0,.34)`; cards `0 10px 28px rgba(0,0,0,.24)`.
The marketing vitrine and login screen keep their own navy theme — out of scope, unchanged.

---

## Gates

`pnpm check` green: `typecheck` · `lint` · `check:catalyst` (no design-system leak) ·
`check:mocks` (5 rules, 116 runtime files) · `test` **141/141, 16 files**.

New: `tests/layout-doctrine.test.tsx` (13 tests) locks the rules a comment cannot hold — five
primary entries, every demoted screen still reachable, the 1240–1320px measure, literal span
classes, metric grids with no orphan row, no fourth hue, neutral surface channels, card-over-shell
luminance, and the refusal to plot a trend from one observation.

## Browser validation

Production build, Playwright, profile `~/.claude/browser-profiles/`, browser closed at the end.

- 17/17 routes HTTP 200, exactly one `<h1>` each, **zero blue class matches in the served HTML**.
- No horizontal overflow at 375×812 (`scrollWidth === clientWidth === 360`) on the densest routes
  (`/admin/operations`, `/admin/api-explorer`); wide data tables scroll inside their own container.
- Margins verified equal at 1440.

## Screenshots

`rework-{home,administration,runtime,product,mining,bitcoin,backtests}-1440x900.png`,
`rework-home-1280x800.png`, `rework-home-375x812.png`.

## Known gaps — stated, not hidden

- **The reference file named in the brief, `hearst-qatar-adapted-design-system-neutral-lighter.html`,
  is not on this machine.** The system was read from `~/Downloads/preview (2).html`
  ("Hearst Adapted Design System"), which is the same system at its earlier, darker values
  (`--bg-app: #09090b`). The **canonical tokens supplied in the brief were used verbatim** and take
  precedence over that file's values wherever they differ. Worth confirming the two agree.
- One data-semantics fix rode along, flagged deliberately: on `/admin/operations` the
  "Consecutive errors" hint read `db?.reachable === true ? 'reachable' : 'unreachable'`, announcing
  an *absent* field as an unreachable database. It now has three states. Same rule as `?? 0`.
- `AdminToolbar` and `AdminFilterBar` in `surfaces.tsx` have no remaining consumer — the fake
  "Search — inactive" toolbar on Clients was removed as furniture. Left in place, not deleted.
- The approved `--color-console-section` token is declared but unused: sections are deliberately not
  cards here, per the composition rework. Kept so the palette is complete in one place.
- Only the seven required routes were captured at 1440; the other ten were verified by HTTP and DOM
  assertions, not by eye.
