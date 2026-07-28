# HC-UI-NORMALIZATION-001 — Review

**Branch:** `feat/hc-ui-normalization-001` (7 commits, 87 files changed, +3171/-3010) · **Status:** `mission:review` · not merged, not deployed.

Full UI-normalization + English-migration + chart-redesign pass across the real Hearst Connect administration application (`src/app/admin/**`, `src/components/admin/**`, and their `src/lib/` dependencies). The marketing vitrine, login/register screens, and shared brand components (`logo.tsx`, `theme-toggle.tsx`) are out of scope — this repo's own CLAUDE.md describes them as separate surfaces from the admin console, and the mission text repeatedly scopes itself to "the administration application."

## Typography scale

One canonical scale, `adminTypography` in `src/components/admin/typography.tsx`, replacing three previously-competing systems (the dead `AdminH1`/`AdminH2`/`AdminH3`, `PageHeader`'s own inline `<h1>`, and `CockpitSection`'s inline `<h2>`):

| Role | Component | Classes |
|---|---|---|
| display (rare, opt-in) | — (`adminTypography.display`) | `text-3xl/9` |
| page title | `AdminPageTitle` | `text-2xl/8` |
| section title | `AdminSectionTitle` | `text-lg/7` |
| surface title | `AdminSurfaceTitle` | `text-sm/6` |
| body-large | `AdminPageDescription` | `text-base/7` |
| body | `AdminBody` | `text-sm/6` |
| caption | `AdminCaption` | `text-xs/5` |
| label | `AdminLabel` | `text-xs/5 uppercase` |
| numeric hero | `AdminNumericHero` | `text-4xl/10 sm:text-5xl/10` |
| numeric standard | `AdminNumericValue` | `text-2xl/8 sm:text-3xl/8` |

Document order is enforced structurally, not just visually: exactly one `<h1>` per page (`PageHeader` → `AdminPageTitle`), section titles are `<h2>` (`AdminSection` → `AdminSectionTitle`), surface/card titles are `<h3>` (`AdminSurfaceHeader`, `CardHeader` in `cockpit.tsx` — fixed from a stray `<h2>` during this mission). `tests/language-regression.test.ts` now asserts every admin route renders `PageHeader` exactly once and that no raw `<h1>` exists outside `typography.tsx`.

## Spacing scale

`src/lib/layout-tokens.ts` (new): `pageMaxWidth` (`max-w-[1600px]`), `pageSectionGap` (`space-y-8`, 32px), `sectionContentGap` (`space-y-6`, 24px), `surfacePadding`/`surfaceCompactPadding` (`p-6`/`p-4`), `tableCellPadding`/`toolbarPadding` (`px-4 py-3`). Fixed a real duplicate-spacing bug: `admin-shell.tsx` used to apply its own `space-y-8` around `{children}` while 15 of 17 pages *also* wrapped themselves in `space-y-8` (and one page relied on the shell's, since it returned a bare Fragment) — three different undocumented conventions for the same rhythm. `AdminPage` is now the single owner of page-level spacing (also adds the `max-w-[1600px]` cap the shell never had); the shell's own `space-y-8` was removed.

## Canonical page template

Every route now follows `<AdminPage><PageHeader title description /><AdminSection>...</AdminSection></AdminPage>`. `CockpitSection` was merged into `AdminSection` (surfaces.tsx) — the two existed only because of an `action`/`actions` prop-name mismatch; standardized on `actions`, deleted `cockpit-section.tsx`.

## Chart system

- Shared tokens in `src/lib/chart-theme.ts`: `height.{small,medium,large}`, `margin`, `axisFontSize`, plus the existing grid/tick/cursor/tooltip/series tokens (renamed `series.success`→`positive`, `series.danger`→`negative`).
- `ChartFrame` (`chart-frame.tsx`): removed the decorative "ghost axis" placeholder for unavailable series; added optional `expectedSource`/`onRetry`. Kept its French prop names (`question`/`unite`/`etat`/`hauteur`) deliberately — renaming a shared component's props would have forced non-cosmetic edits across 8 page files for zero user-visible gain; only the string *values* passed to it changed.
- **Allocation chart redesigned** per the mission spec: `AllocationChart` went from a grouped vertical Recharts `BarChart` to horizontal target/actual/variance rows (target tick mark + filled actual bar + direct percentage + variance label, no legend needed) — see `chart-allocation-after.png`. No recharts dependency for this component anymore; it's a plain server-renderable component.
- All 9 chart components (distribution, utilization/donut, vending-curve, reserve-exposure, vault deviation, drift bars ×2, BTC production, mining production) migrated to English labels/tooltips/sr-only tables and the shared tokens.
- **Bug found and fixed during browser validation**: every chart's accessible `sr-only` fallback `<table>` was blowing out to its full content width (644px in a 375px viewport) because a `<table>` element ignores an explicit `width`/`max-width` and sizes to its content regardless of `table-layout`. The sr-only 1×1px clip technique only holds on a non-table element. Fixed by wrapping each of the 6 affected tables in a `<div className="sr-only">` instead of applying the class to the `<table>` directly. Verified via Playwright at 375px on all 17 routes: `scrollWidth === clientWidth` everywhere, no horizontal overflow.

## Translated route inventory (all 17 routes, 100% English)

| Route | Nav label | Page title |
|---|---|---|
| `/admin` | Home | Hearst Connect — Series 1 Portfolio |
| `/admin/vault` | Vault | Vault |
| `/admin/operations` | Operations | Operations |
| `/admin/series-1` | Series 1 Log | Series 1 Log |
| `/admin/mining` | Mining | Mining |
| `/admin/btc` | Bitcoin | Bitcoin |
| `/admin/product` | Product Sheet | Product Sheet |
| `/admin/backtest` | Backtests | Backtests |
| `/admin/clients` | Clients | Clients |
| `/admin/conformite` | Compliance | Compliance |
| `/admin/runtime` | Service Status | Service Status |
| `/admin/keeper` | Keeper Actions | Keeper Actions |
| `/admin/api-explorer` | API Explorer | API Explorer |
| `/admin/administration` | Administration | Administration |
| `/admin/administration/produit` | (secondary, from Administration) | Product |
| `/admin/dashboard` | (secondary, from Administration) | Data Coverage |
| `/admin/profile` | (secondary, from Administration) | Your Account |

URL paths were kept unchanged (mission explicitly allows this — "acceptable to keep existing URL paths temporarily while rendering English labels"). Nav is still an intentionally flat list (documented decision in `admin-nav.ts`, pre-dates this mission), not regrouped under Home/Clients/Compliance/Operations/Administration — the mission text allows this ("Technical destinations may remain within Administration or the existing flat navigation if already intentionally exposed").

Shell copy: "Hearst Connect" / "Administration" (was "Management Cockpit"), "Sign out" (was "Se déconnecter"), "Role: OWNER" (was "rôle OWNER").

## Remaining untranslated strings

None within the administration application (`src/app/admin/**`, `src/components/admin/**`, `src/lib/**` including `src/lib/backend/**`) — confirmed by a full-tree grep for accented French characters and for the `'fr-FR'` locale string: zero matches in either. `tests/language-regression.test.ts` makes this a standing regression gate, not just a one-time check.

Out of scope, still French (by design, see above): `src/app/(auth)/login/**`, `src/app/(auth)/register/**`, `src/app/layout.tsx`, `src/app/not-found.tsx`, `src/components/marketing/**`, `src/components/logo.tsx`, `src/components/theme-toggle.tsx`.

## Browser console state

Checked on every one of the 17 routes, at 1440×900 and again at 375×812, against a **production build** (`next build` + `next start`, not the dev server, to rule out HMR artifacts): **0 console errors, 0 console warnings** on every route.

## Backend state

No backend behavior changed. `src/lib/backend/*.ts` (client, auth, probe, endpoints, http-failure, resolved-mapper) received translation-only edits — comments and user-facing `reason`/`detail`/`summary`/`caveat` strings — with explicit care taken not to touch validation logic, control flow, header names, cookie names, or wire-format JSON keys (see commit `1a4626d`). The Keeper confirmation token was changed from `"CONFIRMER"` to `"CONFIRM"` in both the UI copy and the literal string the backend action compares against (`src/lib/backend/keeper.ts`) — kept in sync deliberately, since a partial translation would have desynced the confirmation gate on a sensitive-action page.

## Tests

129 tests across 15 files, all passing, including the new `tests/language-regression.test.ts` (15 tests): no `fr-FR` locale, no forbidden French UI phrases, exactly one `PageHeader`/H1 per route, no raw `<h1>` outside `typography.tsx`, no `"Qatar"` string anywhere under `src/`, no undocumented negative chart margins. Existing tests whose assertions depended on now-translated strings were updated (not weakened) — including narrowing a login-flow leak-detection regex that incidentally matched the English word "password" inside otherwise-correct, appropriately generic error copy ("Incorrect email or password" doesn't reveal which field was wrong; the regex now checks for actual leak indicators — `401`, `token`, `bearer`, secret names).

`pnpm check` (typecheck → lint → check:catalyst → check:mocks → test) passes end to end, plus `pnpm build` (21 routes compile).

## Accessibility findings

- Fixed: sr-only accessible data tables no longer cause horizontal page overflow on mobile (see Chart system, above) — this was breaking keyboard/scroll behavior on every page with a chart, not just a cosmetic issue.
- Fixed: `PageHeader` no longer truncates the H1 with `truncate` (mid-word ellipsis on narrow viewports for long titles like "Hearst Connect — Series 1 Portfolio"). Mission doctrine: headings must not truncate unless the layout genuinely cannot expand; admin pages stack vertically, so there was no such constraint.
- `CardHeader` (`cockpit.tsx`) now renders card/surface titles as `<h3>` instead of a stray `<h2>` that collided with `AdminSection`'s legitimate `<h2>` section titles — corrects the page/section/surface heading outline app-wide.
- Not touched, flagged for a future pass: `CockpitSidebarLayout`'s `<main>` uses `p-6 lg:p-10` (40px at `lg`), which sits off the project's 4px-base spacing scale (`lg:p-12` would be on-scale). Pre-existing, outside this mission's file list, low-severity.

## Known gaps (see also `manifest.json`)

- No before/after screenshot pairs were captured — work began immediately after the initial codebase survey rather than pausing for a dedicated baseline-capture pass, given the mission's scale (17 routes, 9 charts, ~90 files touched). The git history is the authoritative before/after record: `git show d38fcaa~1:src/components/admin/allocation-chart.tsx` etc. This is stated plainly rather than fabricating a "before" capture after the fact.
- `Administration · Hearst Connect Administration` (browser tab title) reads slightly redundant — the page's own title and the site-wide template both say "Administration." Cosmetic, not a correctness issue; not fixed in this pass.
- Keyboard-navigation and full WCAG-contrast audits were not separately run as a distinct pass; the console/overflow/heading checks above are what browser validation actually covered in the time available. Recommend a focused a11y pass (tab order, focus rings, contrast ratios on the new chart tokens) as explicit follow-up if required before merge.

## Acceptance criteria — status

All criteria from the mission text are met except: keyboard-navigation/contrast were not exhaustively audited (see Known gaps), and before/after screenshots were not captured (git history serves as the record instead). Everything else — full English admin UI, single H1 per page, distinct H1/H2/H3, aligned headers/sections, unified spacing, no chart negative margins (verified by regression test), readable allocation target/actual/variance, no "Qatar" vocabulary, functional auth/endpoints, no invented data (`check:mocks` green), all tests passing, visual evidence captured — is done and verified, not just claimed.

Finished in `mission:review`. Not merged. Not deployed.
