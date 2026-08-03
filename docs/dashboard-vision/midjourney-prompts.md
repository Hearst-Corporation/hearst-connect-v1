# Midjourney prompts — Hearst Connect vault operations cockpit

Four prompts written from the observed product: a **tokenised vault estate console** where an
administrator watches pocket allocations drift from their on-chain targets in basis points.

**No logo.** No verified Hearst logo asset exists in the workspace, so no prompt asks for one and
none should be added — the wordmark is plain typography. See `dashboard-spec.md` §7.

Midjourney explores art direction only. It cannot produce legible figures or accurate charts —
the functional reference is `dashboard-concept-desktop.png`, captured from the real mockup.

Palette carried into every prompt (the project's own, from `src/styles/tailwind.css`):
mint accent `#a7fb90` on graphite `#101010`/`#2a2a2a`, amber `#fb923c` and coral `#f87171` for
breach states, single geometric sans throughout.

---

## Prompt 1 — Dashboard desktop

```
Frontal screenshot-style render of a dark institutional web console for a tokenised
Bitcoin-and-RWA vault treasury, viewed head-on, filling the frame edge to edge. Left
navigation rail in near-black graphite with small line icons and one mint-green active
item. Top row: five large uncaged financial figures separated by hairline rules — total
estate value in dollars, percentage of capital deployed, a count of allocation pockets
breaching tolerance in amber, a count of blocked clients, and net capital flow — each with a
tiny 30-day sparkline underneath. Dominant centre-left panel: a wide statistical control
chart plotting allocation drift in basis points over thirty days, with a tinted mint
tolerance band between dashed amber threshold lines, one coral line escaping upward past the
band with filled breach dots, two calmer lines inside it, and one narrow diagonally hatched
column labelled as missing data. Below it a clean borderless table of vaults with
right-aligned tabular numbers and small status pills. Right column: a ranked decision queue,
each row a coloured severity bar, a bold title, a muted explanatory line and a mint action
link; beneath it a compact ledger and a two-column dot grid of service health. Palette:
graphite #101010 and #2a2a2a surfaces, mint green #a7fb90 accent used sparingly, amber
#fb923c and coral #f87171 only for warning states, light grey text. Single geometric sans
typeface, strong typographic hierarchy, generous negative space, no logo, calm premium
institutional finance software, high information density but uncluttered, sharp screen
rendering
--ar 16:9 --style raw --stylize 125 --no excessive glassmorphism, generic SaaS cards, gaming UI, neon cyberpunk, deep black background, distorted logos, fake 3D charts, clutter, illegible typography
```

## Prompt 2 — Data visualization

```
Extreme close crop of a single scientific-grade control chart from a dark financial
operations console, filling the frame. The chart plots allocation drift in basis points
against a contractual target over a thirty-day daily axis. A softly tinted mint tolerance
band runs horizontally between two dashed amber threshold lines at plus and minus two hundred
basis points, a solid grey zero reference line through the middle. Four thin data series:
one coral line drifting steadily upward out of the band with filled circular breach markers
at its last four points, one amber line just touching the upper threshold, one mint line
staying flat inside tolerance, one grey aggregate line below. A narrow vertical column of
fine diagonal hatching interrupts every series, labelled as a period with no data — the lines
do not cross it. Precise small-type axis labels on both axes, a horizontal legend naming each
series and each reference, units and period stated. Graphite #101010 background, restrained
mint #a7fb90, amber #fb923c and coral #f87171, light grey gridlines at low opacity. The
aesthetic of a statistical process-control chart in a quantitative research terminal:
analytical, exact, unornamented, plenty of breathing room, thin strokes, no fills under the
curves
--ar 16:9 --style raw --stylize 100 --no decorative charts, rainbow palette, fake data labels, 3D pie charts, clutter, distorted typography
```

## Prompt 3 — Product experience

```
Cinematic wide shot of a quiet institutional treasury operations desk at dawn, a single
analyst seen from behind and slightly above, seated at a plain dark wood desk. Two matte
displays: the larger one shows a dark graphite vault-operations console with a wide green-
and-amber drift chart and a ranked column of alerts, the second shows a dense table of
numbers. A phone rests face-up beside the keyboard showing the same alerts condensed. The
room is a real working office, not a command centre: soft cool daylight through a tall window
on the left, a mug, a printed sheet of figures, a notebook, one small desk lamp. Mint-green
and amber screen glow falls gently on the desk surface and the analyst's hands. Muted palette
of graphite, warm grey and pale daylight, mint green only from the screens. Calm and
deliberate mood, the posture of someone reviewing a decision rather than reacting to a crisis.
Shallow depth of field, 35mm look, natural colour grading, restrained and documentary,
no branding anywhere
--ar 16:9 --style raw --stylize 175 --no science fiction, gaming setup, excessive neon, distorted screens, fake logos
```

## Prompt 4 — Mobile

```
Vertical product render of a modern smartphone held in one hand, screen filling most of the
frame, displaying a dark treasury-operations mobile app. Top: a compact header with a plain
typographic wordmark and a small amber-outlined status chip. Below it two large financial
figures side by side separated by hairline rules — an abbreviated estate value in white and
an alert count in amber. Then a stack of three generously sized alert cards, each with a
coloured vertical severity bar on its left edge, a bold short title, one muted line of
explanation and a small circular chevron button, spaced for thumb reach. Below them a single
simplified drift chart with a tinted tolerance band, dashed amber threshold lines, one coral
line rising past them, and a small legend with units and date range. At the bottom a single
wide mint-green primary action button with black text, and a five-icon bottom tab bar with a
small red notification badge. Graphite #101010 background, card surfaces #2a2a2a, mint
#a7fb90 accent, amber and coral for states, light grey text, one geometric sans typeface at
comfortable reading sizes. Clean studio lighting on a neutral dark background, screen crisp
and perfectly legible, generous spacing, no logo
--ar 9:16 --style raw --stylize 100 --no tiny text, crowded cards, desktop layout squeezed into mobile, fake logos, excessive glassmorphism
```

---

### Note on `visual-direction.png`

Not produced: no image-generation tool is available in this session. Prompt 3 is the intended
source for it. The two functional captures were made from the real mockup with Playwright, as
required — a generative image was never a candidate for the primary deliverable.
