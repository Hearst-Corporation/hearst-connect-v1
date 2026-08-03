# Dashboard vision — Hearst Connect admin cockpit

> **Concept document.** Nothing here is implemented. The mockups in `render/` are standalone
> HTML captured with Playwright; no application file was modified. Every figure shown is
> **fixture data**, marked as such on screen.
>
> Mission DASHBOARD-VISION-001 · repo `hearst-connect-v1` · branch `main` · HEAD `f73c22e` · 2026-07-29

---

## 1. Product summary

Hearst Connect is the Next.js front end of a **tokenised vault estate**. Client capital enters
ERC-4626-style vaults deployed on Base; each vault splits its assets across *pockets*
(strategies — RWA, mining, yield) that carry a **target allocation in basis points** written into
the contract. The chain reports what each pocket *actually* holds. The difference between target
and actual is **drift**, and drift is the thing an administrator is paid to notice.

The front end holds no database. Business data comes from the Hearst Connect backend through a
single server-side client (`src/lib/backend/`), across **26 registered endpoints**
(`src/lib/backend/endpoints.ts` — the single source of truth). Sessions are an in-house
HMAC-SHA256 signed httpOnly cookie carrying both identity and the backend bearer token.

**The product's central guarantee is that nothing is invented.** It is enforced by a type
(`Availability<T>` in `src/lib/vaults/model.ts`: a value with provenance, or a *named absence*
carrying the endpoint that would have answered) and by a build gate (`pnpm check:mocks`, which
fails on `Math.random()`, declared fixtures, and notably on `?? 0` / `|| 0` — because a missing
value is not zero). This constraint is not an obstacle to the dashboard; it is its personality.

## 2. Primary user

**The Hearst estate administrator / owner** (role `OWNER` or `admin` on the backend session).
Not an investor. The distinction is written into the current code: the admin home page was
deliberately converted away from an investor portfolio report, because *"an administrator does not
open the console to read the product's performance; they open it to find out what needs a
decision"* (`src/app/admin/page.tsx`).

They are responsible for: vault health, allocation discipline, client onboarding blockage,
capital that is sitting idle, and whether the data pipeline itself is trustworthy today.

## 3. Objective of the dashboard

Answer, in under five seconds and without scrolling: **is the estate within tolerance, and if
not, what do I do first?**

Ordered by what the user needs:

1. **Situation** — estate value, how much of it is working, net flow.
2. **Anomaly** — which pockets have drifted outside the ±200 bps tolerance, and for how long.
3. **Decision** — a ranked list where each item names its own resolution.
4. **Trend** — drift trajectory over 30 days; is it converging or running away?
5. **Trust** — which of the 26 sources answered, and which are absent.
6. **Detail** — one click to the vault, the client, or the ledger.

## 4. Usage scenario

> 08:55. The admin opens `/admin` on desktop. The strip reads **$8.41M estate value, 81.3%
> deployed, 4 pockets above threshold, 3 clients blocked**. The drift chart shows one red line
> that left the tolerance band nine days ago and has climbed since — Meridian S1. The decisions
> panel ranks it first: *$149,208 misallocated, no rebalance since Jul 8, → Rebalance*. Second is
> a blocked $400,000 deployment waiting on compliance. They act on both, then notice the hatched
> "no data" column in the chart — the indexer had a gap on Jul 13, so they do not treat that
> week's flatness as a real reading. Total time: under a minute.

On mobile, the same person at 22:00 sees only the three urgent alerts, one figure, one
simplified chart, and one button.

---

## 5. EXISTING functions — verified in the code

Each is a real capability of this repo today.

| Function | Evidence |
|---|---|
| Session-guarded admin console | `src/lib/session.ts`, `requireSession()` in `src/lib/auth.ts` |
| Estate KPI strip (active vaults, breached pockets, movements, live sources) | `src/app/admin/page.tsx` — `kpis` array |
| Total value locked, deployed vs idle capital, deployment ratio | `sumAcrossVaults`, `deployedAtomic`, `idleAtomic` (`src/lib/vaults/model.ts`) |
| Vault register with status, NAV/share, capacity headroom, utilisation | `Vault` type; `/admin/vaults`, `/admin/vaults/[vaultId]` |
| Per-pocket target vs actual allocation and drift in bps | `Strategy.targetBps` / `actualBps` / `driftBps` |
| Rebalancing queue with breach flag at ±200 bps | `RebalancingRow`, `REBALANCING_THRESHOLD_BPS` |
| Client exception list, each naming its resolution route | `ClientException` (`actionHref`, `actionLabel`) |
| Deployment queue | `Deployment`, `DeploymentQueue` component |
| Movement ledger from indexed Series 1 events | `Movement`, `MovementLedger`, endpoint `series1-events` |
| Source-health strip across endpoints | `SourceHealth`, `/admin/runtime`, probes `health` / `ready` / `runtime` |
| Named-absence rendering, never zero | `Availability<T>`, `SourceAvailabilityBadge`, gate `check:mocks` |
| Provenance and freshness on every reading | `Available.provenance` (`chain`/`db`/`live`/`manual`), `asOf`, `stale` |
| Keeper actions (mining report, electricity payment, rebalance request) | `src/lib/backend/keeper.ts`, `/admin/keeper` |
| API Explorer over 26 endpoints | `/admin/api-explorer`, `BACKEND_ENDPOINTS` |
| Charts (allocation, distribution, utilisation, drift, production) | `src/components/admin/charts/`, `dashboard-visuals.tsx` |
| Mining and BTC aggregates | endpoints `mining`, `mining-onchain`, `mining-electricity`, `btc` |
| Backtest series computed backend-side | endpoint `backtest-historical` |
| Design system: Catalyst vendored, mint accent `#a7fb90`, Satoshi single family | `src/styles/tailwind.css`, `src/lib/fonts.ts` |

## 6. PROPOSED functions — imagined, coherent with the product

Not implemented. Each is buildable on data the product already has or plausibly will.

| # | Function | Rationale | Depends on |
|---|---|---|---|
| P1 | **Drift control chart over 30 days** — the dominant visual | Today drift is read as an instantaneous number. A drift of +512 bps that is *converging* and one that is *accelerating* demand opposite responses; only a time series distinguishes them. | Historical snapshots of `actualBps` per pocket (not stored today) |
| P2 | **"Needs a decision" panel ranked by capital at stake** | The console already computes drift, exceptions, and idle capital, but presents them as three separate lists. Ranking them by dollars converts a status page into a work queue. | Existing readings + a ranking rule |
| P3 | **Misallocated amount in currency** (`$149,208`) beside the bps figure | Basis points are the contract's unit, not a decision unit. `drift_bps × vault_total / 10000` is exact and derived only from readings that already agree. | `totalAssetsAtomic` + `driftBps` (both exist) |
| P4 | **Time-above-threshold** ("9 days above threshold") | Severity is duration × magnitude. A pocket 210 bps out for an hour is noise; 210 bps for nine days is neglect. | Drift history (same as P1) |
| P5 | **Net flow over 30 days** with deposit/redemption split | Deposits and redemptions are already in the ledger as event types; aggregating them answers "is the estate growing?" which no current surface asks. | `series1-events` (exists) |
| P6 | **30-day sparkline on each KPI** | A headline number without direction is half a fact. | Historical aggregates (same as P1) |
| P7 | **Explicit "no data" band in charts** (hatched) | The truthfulness doctrine is enforced for scalars but not for series: an indexer gap currently renders as a continuous line, which is a fabricated reading. | Indexer coverage metadata |
| P8 | **One-click rebalance from the decision row** | `keeper-rebalancing-execute` exists but lives on a separate page, disconnected from the screen that identifies the need. | Existing endpoint |
| P9 | **Estate-wide search (⌘K)** across vaults, clients, tx hashes | Seven vaults is browsable; seventy is not. | Existing identifiers |
| P10 | **Mobile alert view** — 3 alerts, 1 KPI, 1 action | The admin's out-of-hours need is triage, not analysis. | Same data |
| P11 | **Export register** (CSV/PDF snapshot with provenance and asOf) | Audit and client reporting currently mean screenshots. | Existing readings |
| P12 | **Threshold made configurable and displayed as a convention** | ±200 bps is this console's convention, not a contract rule — the code says so. Making it editable per vault removes a hidden assumption. | Config store |

## 7. UNAVAILABLE functions — impossible without new backend work

Verified against the production backend on 2026-07-28; these routes answer 404 or declare
themselves not exposed.

| Function | Blocker |
|---|---|
| Client directory / real client names on vaults | No client endpoint. `Vault.client` is permanently `Unavailable`; `/admin/clients` is a structure awaiting a source |
| KYC / KYB compliance queue | No compliance endpoint. `ComplianceReviewId` is modelled with nothing to fill it |
| Deployment ledger (requests, confirmations, failures) | No deployment endpoint; `Deployment` has no source |
| Contract-reported rebalancing state and tolerance | `rebalancing-status` answers `not_exposed_by_contract` — hence the console convention |
| Drift, NAV, or flow **history** | The backend publishes current state only; no time series is stored. P1/P4/P6 are blocked on this |
| Signed on-chain execution from the UI | No keeper route signs a transaction (backend `docs/architecture.md`); several answer 501 |
| Per-pocket asset value, reliably | `rwa-vault` returns `pocketAssets` contradicting `actualBps` by three orders of magnitude on this deployment; carried through only when the two agree |
| Multi-vault registry | The service exposes one vault; the 7-vault estate shown is a fixture projection of the modelled shape |
| Alert delivery (email/push/webhook) | No notification service |
| Per-admin audit trail of actions taken | No audit endpoint |
| Official Hearst logo asset | **No logo file in the workspace.** The mockups use a neutral typographic wordmark plus a plain "H" tile. No logo was generated or imitated |

---

## 8. The KPI strip — five figures

Uncaged (no card per number), separated by hairline rules, each with unit, comparison, and a
30-day sparkline.

| KPI | Question | Unit / basis | Source | Absence behaviour |
|---|---|---|---|---|
| **Estate value** | What do we hold in total? | USDC, 6 dp, summed across vaults | EXISTING (`totalAssetsAtomic`) | A single unreadable vault makes the **total** unavailable — a partial sum looks exactly like a complete one |
| **Capital deployed** | How much is working vs idle? | % of total + idle in dollars | EXISTING (`deployedAtomic`/`idleAtomic`) | Unavailable if either operand is missing |
| **Pockets above threshold** | How many breaches right now? | count of 21 · ±200 bps | EXISTING (`RebalancingRow.breached`) | Never rendered as `0` when unknown — shows the named absence |
| **Clients blocked** | Who cannot proceed? | count, split by cause | EXISTING shape, UNAVAILABLE source | Today this reads *Unavailable*, not `0` |
| **Net flow · 30 d** | Is the estate growing? | USDC, deposits vs redemptions | PROPOSED (P5) | Requires ledger aggregation |

Sparklines and deltas are **PROPOSED (P6)** and need drift/flow history.

## 9. The dominant visualisation — drift control chart

**Question:** *is any pocket outside tolerance, and is it converging or running away?*

A **control chart** is the correct form: the domain has a defined tolerance band, an in-control
region, and breach events — exactly what control charts were designed for. A bar chart of current
drift (what the console shows today) cannot express duration or trajectory.

| Property | Value |
|---|---|
| Period | 30 days, daily |
| Unit | basis points from contract target |
| Series | 3 named worst-offending pockets + aggregate band for the other 17 |
| Reference | ±200 bps threshold, dashed, in warning tone |
| Tolerance band | tinted region between the thresholds |
| Anomalies | breach points marked as filled dots |
| Missing data | **hatched column labelled "no data"** — never interpolated |
| Provenance | `chain · 14 s ago` tag in the panel header |
| Convention disclosed | *"Rebalancing tolerance is not published by the contract — it is this console's stated convention"* |

Deliberately **not** used: a pie chart of allocation (the current console plots allocation three
times without producing a decision); 3D anything; decorative gradients.

## 10. Alerts and decisions

The "Needs a decision" panel — one row per item, ranked by **capital at stake**, each carrying
title, cause with duration and dollar impact, and a named action.

| Severity | Meaning | Colour |
|---|---|---|
| Critical | Breach with large capital exposure, or blocked client capital | `danger` `#f87171` |
| Warning | Breach within tolerance history, or under-deployment | `warning` `#fb923c` |
| Informational | Structural gap — unassigned vault, unreadable contract | `info` `#60a5fa` |

Rule: **an exception you cannot act on is a complaint, not a work item** — already the code's
stated principle (`ClientException.actionHref`). Every row keeps its resolution link.

## 11. Available actions

| Action | Status |
|---|---|
| Rebalance a vault / pocket | EXISTING endpoint (`keeper-rebalancing-execute`), PROPOSED placement (P8) |
| Open a compliance review | UNAVAILABLE (no endpoint) |
| Assign a client to a vault | UNAVAILABLE (no client source) |
| Deploy idle capital | EXISTING request path, no signing |
| Export register | PROPOSED (P11) |
| Inspect vault detail | EXISTING (`/admin/vaults/[vaultId]`) |
| Inspect runtime / sources | EXISTING (`/admin/runtime`) |
| Report mining metrics, settle electricity | EXISTING keeper actions |

**No action in this concept signs a transaction** — consistent with the backend, which has no
on-chain write helper.

## 12. Navigation

Two groups, sober, no more than eight destinations — extending the existing five-entry rule
(*"fourteen equally-weighted choices is not navigation, it is an index"*, `src/lib/admin-nav.ts`).

- **Operate** — Home · Vaults · Clients · Compliance · Operations
- **System** — Runtime · API Explorer · Administration

Counters appear only where they mean *work waiting* (Clients 3, Compliance 2) or *coverage*
(Runtime 5/6, API Explorer 26). Identity and role sit at the foot of the rail.

Relative to today: `Vaults` is promoted to a primary destination, since the operating model is
vault-centric.

## 13. Mobile behaviour (390 × 844)

Mobile is not the desktop compressed. It answers one question: **what needs me right now.**

| Kept | Dropped |
|---|---|
| Estate value + decision count (2 figures) | Vault register table |
| Top 3 alerts, thumb-sized (≥62 px rows) | Ledger, source health grid, secondary KPIs |
| One simplified chart — worst pocket only, thresholds kept | Multi-series chart, legend detail |
| One primary action (`Rebalance Meridian`) | Secondary actions |
| 5-tab bottom bar with alert badge | Sidebar |
| `CONCEPT · FIXTURE DATA` marking | — |

Chart legends, units, and period survive the shrink — a chart that loses its unit stops being
evidence.

## 14. Data required

**Available today:** vault totals, per-pocket target/actual bps, NAV per share, TVL cap and
headroom, utilisation, Series 1 movements, mining/BTC aggregates, runtime probes, endpoint
registry.

**Needed for the full vision:**

1. **Time series storage** — daily snapshots of per-pocket `actualBps`, vault totals, NAV.
   *Unblocks P1, P4, P6.* Highest-value single addition.
2. **Indexer coverage metadata** — known-gap intervals. *Unblocks P7 honestly.*
3. **Client directory** — id, label, vault assignment. *Unblocks the clients KPI and exceptions.*
4. **Compliance review resource** — id, subject, state, opened-at.
5. **Deployment ledger** — request → confirmation → failure.
6. **Multi-vault registry** — the model already supports it; the service exposes one.

## 15. Limits

- **The 7-vault estate is a fixture projection.** The service exposes one vault. The model
  (`AdminRegistry`) is already multi-vault, so the shape is honest, but the scale shown is not a
  current reading.
- **Every number in both images is fictional**, marked `CONCEPT · FIXTURE DATA` in the header and
  footer of the desktop view and under the header on mobile. No real Hearst environment was read.
- **Half the panels would render as named absences today** — clients, compliance, deployments,
  and all history. That is a truthful outcome, not a failure; the concept shows the shape the
  console takes *once* those sources exist.
- **±200 bps is a console convention**, restated on screen, not a contract rule.
- **No logo exists in the workspace** — a neutral wordmark is used. Declared UNAVAILABLE.
- The mockup is static HTML: no interaction, no responsive behaviour between the two captured
  breakpoints, no accessibility audit beyond contrast and legibility checks.

## 16. Implementation recommendations

Ordered by value per unit of effort.

1. **Persist daily snapshots** of per-pocket `actualBps` and vault totals. One table, one cron.
   Every trend, sparkline, duration, and the entire control chart depend on it. Nothing else in
   this vision is blocked by so little work.
2. **Add `Availability<Series<T>>`** — extend the availability contract to time series, with an
   explicit gap representation. Without it, the first chart drawn over a gap will silently lie in
   a product whose whole premise is that it does not.
3. **Compute misallocated capital** (`drift_bps × total / 10000`) and surface it beside every bps
   figure. Pure derivation from readings that already exist; no backend change.
4. **Build the decision ranker** as a pure function over the existing registry —
   `AdminRegistry → Decision[]`, sorted by capital at stake, each carrying `actionHref`. Testable
   in isolation, and it is the actual product idea here.
5. **Move the keeper rebalance action** onto the decision row, keeping confirmation.
6. **Keep the KPI strip uncaged.** The current tiles have rings and backgrounds; hairline
   separation reads as more institutional and buys vertical space, which is what makes a
   no-scroll cockpit possible.
7. **Then** pursue the blocked sources (clients, compliance, deployments) with the backend team —
   they gate roughly a third of the surface.

Suggested sequence: (1)+(2) as one backend/contract change; (3)+(4)+(5) as one frontend mission
behind the existing gate (`pnpm check`, `check:mocks` included); (6) as a design pass; (7) as a
cross-team dependency.
