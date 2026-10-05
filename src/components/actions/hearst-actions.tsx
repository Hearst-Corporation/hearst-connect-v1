'use client'

/** Async action buttons: Catalyst `Button` + optional Motion overlay and phase state. */

import { Button } from '@hearst/ui/catalyst/button'
import { ArrowPathIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/16/solid'
import { motion, useReducedMotion } from 'motion/react'
import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

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

const TONE_COLOR = { primary: 'accent', critical: 'amber', danger: 'red' } as const

/** Tones that carry a micro-interaction; secondary stays inert. */
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
  className?: string
  'aria-label'?: string
  title?: string
  children: ReactNode
}>

function renderCatalystButton({
  tone,
  href,
  className,
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
  className: string | undefined
  ariaLabel: string | undefined
  disabledReason: string | undefined
  isDisabled: boolean
  busy: boolean
  onAction: (() => void | Promise<void>) | undefined
  run: () => Promise<void>
  content: ReactNode
}>): ReactNode {
  const shared: CatalystButtonShared = {
    className,
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
      ? <Button outline href={href} {...shared} />
      : <Button outline disabled={isDisabled || busy} onClick={onAction ? run : undefined} {...shared} />
  }
  const color = TONE_COLOR[tone]
  return href !== undefined
    ? <Button color={color} href={href} {...shared} />
    : <Button color={color} disabled={isDisabled || busy} onClick={onAction ? run : undefined} {...shared} />
}

function HearstAction({ tone, ...props }: HearstActionProps & { tone: Tone }) {
  const { children, icon, className, disabledReason, disabled: disabledProp, successLabel } = props
  const ariaLabel = props['aria-label']
  const href = 'href' in props ? props.href : undefined
  const onAction = 'onAction' in props ? props.onAction : undefined

  const { phase, run, busy } = useAsyncActionPhase(onAction)
  const isDisabled = resolveDisabled(disabledProp, href, onAction, disabledReason)
  const tapScale = tone === 'icon' ? 0.94 : 0.98
  const content = renderActionContent(onAction, phase, icon, children, successLabel)

  const button = renderCatalystButton({
    tone,
    href,
    className,
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

/** Primary action — the mint accent, lift + tap. The most prominent CTA in a context. */
export function HearstPrimaryAction(props: HearstActionProps) {
  return <HearstAction tone="primary" {...props} />
}

/** Critical action — pending work (subscription to resume, KYC to validate). Bounded loading + success states. */
export function HearstCriticalAction(props: HearstActionProps) {
  return <HearstAction tone="critical" {...props} />
}

/** Risk action — incident, failure. */
export function HearstDangerAction(props: HearstActionProps) {
  return <HearstAction tone="danger" {...props} />
}

/** Secondary action — no motion overlay. */
export function HearstSecondaryAction(props: HearstActionProps) {
  return <HearstAction tone="secondary" {...props} />
}

export type { HearstActionProps }
