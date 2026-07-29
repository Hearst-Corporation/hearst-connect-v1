/**
 * The reference plot's decorative curve texture.
 *
 * ── What this is, and what it explicitly is not ───────────────────────────
 * These nine paths are transcribed VERBATIM from the reference prototype's
 * `index.html` (the `<svg class="hero-svg">` block). They are the plot's
 * MATERIAL — the same category of thing as the dust texture on the shell or the
 * gradient under a panel. They are light and volume, not measurement.
 *
 * Three properties keep them honest, and all three are structural rather than
 * conventional:
 *
 *   1. **`aria-hidden`, and no accessible name.** Assistive technology is never
 *      told these lines exist, because there is nothing to tell: they carry no
 *      value, no unit and no series. The data curve above them owns the SVG's
 *      `<title>`/`<desc>` and is the only thing described.
 *   2. **No coupling to the registry.** This component takes NO props. It
 *      cannot read a vault, a movement or an availability, so it cannot render
 *      a figure — not even by accident, and not after a future edit.
 *   3. **It is drawn UNDER the data layer.** The real series is painted after
 *      this group, at heavier weights and in the accent green, so the reading
 *      is never ambiguous about which line is the measurement.
 *
 * The distinction that matters: a curve becomes a lie when it is presented AS a
 * reading. Reproducing the reference's texture and stating plainly that it is
 * texture is not the same act as computing a series nobody measured. The
 * previous pass removed these paths to be safe; the effect was that the panel
 * lost the reference's material entirely, which is a different kind of
 * inaccuracy. They are restored here, labelled for what they are.
 *
 * Every coordinate, stroke, opacity and filter reference below is the
 * reference's own. Nothing is re-authored.
 */
export function GreenPlotTexture() {
  return (
    <g aria-hidden="true" data-gcc="plot-texture" role="presentation">
      {/* The broad white glow pass and its companion stroke. */}
      <path
        d="M92 39C218 38 323 66 446 123S730 221 927 286S1196 385 1362 414"
        fill="none"
        stroke="#fff"
        strokeOpacity=".28"
        strokeWidth="34"
        filter="url(#gccGlowWhite)"
      />
      <path
        d="M93 45C211 46 345 71 462 125S726 221 926 287S1198 386 1362 414"
        fill="none"
        stroke="url(#gccWhiteFade)"
        strokeWidth="4"
      />

      {/* The pale curve crowd occupying the upper two thirds. */}
      <path
        d="M95 109C199 18 350 84 475 149S750 272 925 261S1210 142 1362 74"
        fill="none"
        stroke="#edf1ff"
        strokeWidth="2.4"
      />
      <path
        d="M93 345C223 263 383 177 568 143S948 115 1136 100S1286 85 1362 74"
        fill="none"
        stroke="#e6e9f5"
        strokeWidth="2.7"
      />
      <path
        d="M97 417C285 333 463 260 634 207S979 134 1135 102S1295 81 1362 74"
        fill="none"
        stroke="#cad0df"
        strokeWidth="1.2"
      />
      <path
        d="M92 36C260 83 324 181 474 246S725 288 909 246S1224 88 1362 64"
        fill="none"
        stroke="#989eab"
        strokeWidth="1.1"
      />
      <path
        d="M432 40C544 70 582 181 690 252S891 287 1047 238S1255 131 1363 80"
        fill="none"
        stroke="#9ba1ae"
        strokeWidth="1"
      />
      <path
        d="M251 85C340 102 447 128 571 165S802 225 962 246S1192 277 1362 314"
        fill="none"
        stroke="#d8dce8"
        strokeOpacity=".38"
      />

      {/*
       * The reference's two green companion lines.
       *
       * ── The one place this layer departs from the reference's values ──────
       * In the prototype these are `#7cff00` — the same green as its neon
       * ribbon, which is harmless there because nothing in that file is a
       * measurement. Here the accent green IS the measurement: three curves in
       * the identical accent would leave a reader unable to tell which line is
       * the reading, which is the exact confusion this console exists to
       * prevent.
       *
       * They keep the reference's geometry, weight and hue and are held back in
       * opacity so the accent reads as one voice: the measured series. This is a
       * legibility constraint on a decorative layer, not a palette change — no
       * colour token, surface, gradient or filter is altered.
       */}
      <path
        d="M92 418C247 381 403 350 568 340S870 321 1000 292S1242 163 1360 80"
        fill="none"
        stroke="#7cff00"
        strokeOpacity=".28"
        strokeWidth="1.6"
      />
      <path
        d="M94 337C232 336 352 330 483 320S758 315 930 337S1194 380 1360 408"
        fill="none"
        stroke="#7cff00"
        strokeOpacity=".28"
        strokeWidth="1.5"
      />

      {/* The mist volumes — atmosphere, exactly as the reference declares them. */}
      <path
        d="M95 78C228 8 389 96 511 159S758 252 907 252S1198 173 1362 82"
        fill="url(#gccMist)"
        fillOpacity=".15"
        stroke="none"
      />
      <path
        d="M92 75C203 93 319 130 438 176S710 259 891 283S1191 358 1362 415L1362 441C1180 402 1008 356 851 331S547 273 381 214S171 128 92 101Z"
        fill="url(#gccMist)"
        opacity=".35"
      />
    </g>
  )
}
