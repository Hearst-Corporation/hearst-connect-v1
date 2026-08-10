'use client'

/**
 * Hearst actions boundary — HC-ADMIN-DASHBOARD-UI-ASSETS-005 /
 * HC-ADMIN-DESIGN-SYSTEM-FORENSIC-033.
 *
 * ── What this boundary is, and is not ─────────────────────────────────────
 * The brief calls for a `src/components/actions/` boundary inspired by Aceternity
 * buttons. Local doctrine (§2, §8, §15) takes precedence: the ONLY button
 * primitive is Catalyst `<Button>`; an Aceternity button is "forbidden without
 * audit" and must never duplicate Catalyst. So these components do NOT
 * reimplement a button — they COMPOSE Catalyst `<Button>` and add, as an overlay,
 * two things that Aceternity merely inspired:
 *
 *   1. a Motion micro-interaction (lift on hover, scale on click);
 *   2. a state machine (`idle → loading → success | error`) for a real
 *      asynchronous action.
 *
 * ── Color contract (033) ──────────────────────────────────────────────────
 * ONE source of truth: Hearst CSS variables (`--btn-bg` / `--btn-border` /
 * `--btn-icon` / `--btn-hover-overlay`) via `style`. Catalyst provides
 * structure + behavior (`solid` / `plain`) — NEVER `color="lime"|amber|red`
 * (raw palettes that collide with the accent variables).
 *
 * Keyboard focus is realigned product-wide in `src/styles/tailwind.css`
 * (remaps `outline-color` → `--color-accent-500`); we do not use
 * `outline-none`.
 *
 * ── Reduced motion is STRUCTURAL ──────────────────────────────────────────
 * Mirroring `compositions/motion.tsx`: `useReducedMotion()` → we render an
 * inert `<span>`, no transition. The loading spinner also stops, via
 * `motion-reduce:animate-none`.
 *
 * ── Truthfulness ───────────────────────────────────────────────────────────
 * An action with no real endpoint is not wired to a fake handler: it renders
 * `disabled` with a `disabledReason` as a tooltip (brief §8). `loading` and
 * `success` only run for an `onAction` that does real work.
 */

import { Button } from '@/components/catalyst/button'
import { ArrowPathIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import { motion, useReducedMotion } from 'motion/react'
import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'

type Tone = 'primary' | 'critical' | 'danger' | 'secondary' | 'icon'
type Phase = 'idle' | 'loading' | 'success' | 'error'

/**
 * Adds `data-slot=icon` (Catalyst sizing) + `aria-hidden` to the icon element.
 * The icon is an ELEMENT (`<PlusIcon />`), never a component: a component
 * (forwardRef) is not serializable from a server component to a client
 * component — that was the cause of the RSC error "Only plain objects can be
 * passed to Client Components".
 */
function iconSlot(node: ReactNode): ReactNode {
  if (!isValidElement(node)) return node
  const el = node as ReactElement<{ 'data-slot'?: string; 'aria-hidden'?: boolean }>
  return cloneElement(el, { 'data-slot': 'icon', 'aria-hidden': true })
}

/** Hearst semantic variables — the only color source for solid tones. */
const TONE_STYLE: Record<Exclude<Tone, 'icon' | 'secondary'>, CSSProperties> = {
  primary: {
    '--btn-bg': 'var(--color-accent-400)',
    '--btn-border': 'var(--color-accent-500)',
    '--btn-icon': 'var(--color-accent-700)',
    '--btn-hover-overlay': 'var(--color-white)',
  } as CSSProperties,
  critical: {
    '--btn-bg': 'var(--color-warning-400)',
    '--btn-border': 'var(--color-warning-500)',
    '--btn-icon': 'var(--color-warning-700)',
    '--btn-hover-overlay': 'var(--color-white)',
  } as CSSProperties,
  danger: {
    '--btn-bg': 'var(--color-danger-600)',
    '--btn-border': 'var(--color-danger-700)',
    '--btn-icon': 'var(--color-danger-300)',
    '--btn-hover-overlay': 'var(--color-white)',
  } as CSSProperties,
}

/**
 * Ink / overlay classes — override the Catalyst `dark/neutral` default text
 * (`text-white`) via the Tailwind important modifier.
 * Focus: `!data-focus:outline-accent-500` overrides the vendor `outline-blue-500`.
 * Overlay /25 for primary+critical (light background); /10 for danger (dark background).
 */
const FOCUS_ACCENT = '!data-focus:outline-accent-500'

const TONE_CLASS: Record<Exclude<Tone, 'icon'>, string> = {
  primary: clsx(FOCUS_ACCENT, '!text-accent-ink dark:[--btn-hover-overlay:var(--color-white)]/25'),
  critical: clsx(FOCUS_ACCENT, '!text-warning-ink dark:[--btn-hover-overlay:var(--color-white)]/25'),
  danger: clsx(FOCUS_ACCENT, '!text-white dark:[--btn-hover-overlay:var(--color-white)]/10'),
  secondary: FOCUS_ACCENT,
}

/** Tones that carry a micro-interaction. The secondary stays inert (doctrine: Catalyst hover is enough). */
const TONE_MOTION: Record<Tone, boolean> = {
  primary: true,
  critical: true,
  danger: true,
  secondary: false,
  icon: true,
}

type BaseProps = Readonly<{
  children?: ReactNode
  /** Leading icon element (e.g. `<PlusIcon />`) — never a component, to stay serializable server→client. */
  icon?: ReactNode
  className?: string
  'aria-label'?: string
  /** Rendered `disabled` with this text as a tooltip — the honest state of an action with no endpoint. */
  disabledReason?: string
  disabled?: boolean
  /** Transient label shown ~1.5 s after an `onAction` resolves. */
  successLabel?: string
}>

type HearstActionProps = BaseProps &
  (
    | Readonly<{ href: string; onAction?: never }>
    | Readonly<{ href?: never; onAction?: () => void | Promise<void> }>
  )

/** Motion wrapper — inert if reduced-motion or if the tone does not move. */
function Interactive({
  children,
  active,
  tapScale,
}: Readonly<{ children: ReactNode; active: boolean; tapScale: number }>) {
  const reduced = useReducedMotion()
  if (!active || reduced) return <span className="inline-flex">{children}</span>
  return (
    <motion.span
      className="inline-flex"
      whileHover={{ y: -1 }}
      whileTap={{ scale: tapScale }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.span>
  )
}

function PhaseContent({
  phase,
  icon,
  children,
  successLabel,
}: Readonly<{ phase: Phase; icon?: ReactNode; children?: ReactNode; successLabel?: string }>) {
  if (phase === 'loading') {
    return (
      <>
        <ArrowPathIcon data-slot="icon" className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        {children}
      </>
    )
  }
  if (phase === 'success') {
    return (
      <>
        <CheckIcon data-slot="icon" aria-hidden="true" />
        {successLabel ?? children}
      </>
    )
  }
  if (phase === 'error') {
    return (
      <>
        <ExclamationTriangleIcon data-slot="icon" aria-hidden="true" />
        {children}
      </>
    )
  }
  return (
    <>
      {iconSlot(icon)}
      {children}
    </>
  )
}

function resolveDisabled(
  disabledProp: boolean | undefined,
  href: string | undefined,
  onAction: (() => void | Promise<void>) | undefined,
  disabledReason: string | undefined,
): boolean {
  return disabledProp === true || (href === undefined && onAction === undefined && disabledReason !== undefined)
}

function resolveMergedClass(tone: Tone, className: string | undefined): string {
  if (tone === 'icon') return clsx(FOCUS_ACCENT, className)
  return clsx(TONE_CLASS[tone], className)
}

function renderActionContent(
  onAction: (() => void | Promise<void>) | undefined,
  phase: Phase,
  icon: ReactNode | undefined,
  children: ReactNode | undefined,
  successLabel: string | undefined,
): ReactNode {
  if (onAction !== undefined) {
    return (
      <PhaseContent phase={phase} icon={icon} successLabel={successLabel}>
        {children}
      </PhaseContent>
    )
  }
  return (
    <>
      {iconSlot(icon)}
      {children}
    </>
  )
}

function useAsyncActionPhase(onAction: (() => void | Promise<void>) | undefined) {
  const [phase, setPhase] = useState<Phase>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const run = async () => {
    if (phase === 'loading' || onAction === undefined) return
    setPhase('loading')
    try {
      await onAction()
      setPhase('success')
      timer.current = setTimeout(() => setPhase('idle'), 1500)
    } catch {
      setPhase('error')
      timer.current = setTimeout(() => setPhase('idle'), 2500)
    }
  }

  return { phase, run, busy: phase === 'loading' }
}

type CatalystButtonShared = Readonly<{
  className: string
  'aria-label'?: string
  title?: string
  children: ReactNode
}>

function renderCatalystButton({
  tone,
  href,
  mergedClass,
  ariaLabel,
  disabledReason,
  isDisabled,
  busy,
  onAction,
  run,
  content,
}: Readonly<{
  tone: Tone
  href: string | undefined
  mergedClass: string
  ariaLabel: string | undefined
  disabledReason: string | undefined
  isDisabled: boolean
  busy: boolean
  onAction: (() => void | Promise<void>) | undefined
  run: () => Promise<void>
  content: ReactNode
}>): ReactNode {
  const shared: CatalystButtonShared = {
    className: mergedClass,
    'aria-label': ariaLabel,
    title: disabledReason,
    children: content,
  }

  if (tone === 'icon') {
    return href !== undefined
      ? <Button plain href={href} {...shared} />
      : <Button plain disabled={isDisabled || busy} onClick={onAction ? run : undefined} {...shared} />
  }
  if (tone === 'secondary') {
    return href !== undefined
      ? <Button color="white" href={href} {...shared} />
      : <Button color="white" disabled={isDisabled || busy} onClick={onAction ? run : undefined} {...shared} />
  }
  const style = TONE_STYLE[tone]
  return href !== undefined
    ? <Button href={href} style={style} {...shared} />
    : <Button disabled={isDisabled || busy} onClick={onAction ? run : undefined} style={style} {...shared} />
}

function HearstAction({ tone, ...props }: HearstActionProps & { tone: Tone }) {
  const { children, icon, className, disabledReason, disabled: disabledProp, successLabel } = props
  const ariaLabel = props['aria-label']
  const href = 'href' in props ? props.href : undefined
  const onAction = 'onAction' in props ? props.onAction : undefined

  const { phase, run, busy } = useAsyncActionPhase(onAction)
  const isDisabled = resolveDisabled(disabledProp, href, onAction, disabledReason)
  const tapScale = tone === 'icon' ? 0.94 : 0.98
  const mergedClass = resolveMergedClass(tone, className)
  const content = renderActionContent(onAction, phase, icon, children, successLabel)

  // Catalyst button resolved by tone — never a hand-rolled <button>.
  // Structure = `dark/neutral` default (console tokens) or `white` / `plain`.
  // Semantic color = Hearst variables only (no color="lime").
  const button = renderCatalystButton({
    tone,
    href,
    mergedClass,
    ariaLabel,
    disabledReason,
    isDisabled,
    busy,
    onAction,
    run,
    content,
  })

  return <Interactive active={TONE_MOTION[tone] && !isDisabled && !busy} tapScale={tapScale}>{button}</Interactive>
}

/** Primary action — Hearst mint accent, lift + tap. The most prominent CTA in a context. */
export function HearstPrimaryAction(props: HearstActionProps) {
  return <HearstAction tone="primary" {...props} />
}

/** Critical action — pending work (subscription to resume, KYC to validate). Bounded loading + success states. */
export function HearstCriticalAction(props: HearstActionProps) {
  return <HearstAction tone="critical" {...props} />
}

/** Risk action — incident, failure. Hearst danger tokens. */
export function HearstDangerAction(props: HearstActionProps) {
  return <HearstAction tone="danger" {...props} />
}

/** Secondary action — white background, gray border, light hover, NO animation (doctrine). */
export function HearstSecondaryAction(props: HearstActionProps) {
  return <HearstAction tone="secondary" {...props} />
}

export type { HearstActionProps }
