import clsx from 'clsx'
import Link from 'next/link'

/**
 * Primitives du poste de commande.
 *
 * Deux règles gouvernent ce fichier :
 *
 * 1. Une carte porte un VERDICT, pas une mesure. « 12 dossiers » n'apprend
 *    rien ; « 12 dossiers, le plus ancien attend depuis 6 jours, Acme Capital
 *    en tête » se traite. Chaque carte d'attention nomme donc le cas réel et
 *    propose le geste qui le résout.
 *
 * 2. Une absence se dit, elle ne se dessine pas. Quand une surface n'a pas
 *    encore de source, elle l'annonce et explique ce qui manque — jamais un
 *    tableau d'exemple, jamais un zéro. `SourceAttendue` existe pour ça.
 */

/* ── Surfaces ────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className,
  as: Tag = 'section',
}: Readonly<{ children: React.ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'nav' }>) {
  return (
    <Tag className={clsx(className, 'rounded-xl border border-white/10 bg-surface-panel')}>{children}</Tag>
  )
}

export function CardHeader({
  title,
  hint,
  action,
}: Readonly<{ title: string; hint?: string; action?: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/* ── Ton des états ───────────────────────────────────────────────────────── */

export type Tone = 'neutral' | 'attention' | 'critique' | 'sain'

const TONE_RING: Record<Tone, string> = {
  neutral: 'border-white/10',
  sain: 'border-success-500/30',
  attention: 'border-warning-500/40',
  critique: 'border-danger-500/50',
}

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-zinc-400',
  sain: 'text-success-400',
  attention: 'text-warning-400',
  critique: 'text-danger-400',
}

/** Le libellé accompagne toujours la couleur : un daltonien lit le même état. */
const TONE_LABEL: Record<Tone, string> = {
  neutral: 'Pour information',
  sain: 'Rien à signaler',
  attention: 'À surveiller',
  critique: 'Action requise',
}

/* ── Carte-verdict ───────────────────────────────────────────────────────── */

export function VerdictCard({
  titre,
  compte,
  unite,
  contexte,
  casUrgent,
  ton,
  href,
  actionLabel,
}: Readonly<{
  titre: string
  compte: string
  unite?: string
  contexte?: string
  casUrgent?: string
  ton: Tone
  href: string
  actionLabel: string
}>) {
  return (
    <Card as="article" className={clsx('flex flex-col p-5', TONE_RING[ton])}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-300">{titre}</h3>
        <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', TONE_TEXT[ton])}>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {TONE_LABEL[ton]}
        </span>
      </div>

      <p className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight text-white tabular-nums">{compte}</span>
        {unite ? <span className="text-sm text-zinc-500">{unite}</span> : null}
      </p>
      {contexte ? <p className="mt-1 text-xs text-zinc-500">{contexte}</p> : null}

      {casUrgent ? (
        <p className="mt-4 border-t border-white/[0.07] pt-3 text-sm text-zinc-300">
          <span className="block text-xs text-zinc-500">Le plus urgent</span>
          {casUrgent}
        </p>
      ) : null}

      <Link
        href={href}
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-accent-400 px-3 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
      >
        {actionLabel}
      </Link>
    </Card>
  )
}

/* ── Bandeau d'exception ─────────────────────────────────────────────────── */

export function ExceptionBanner({
  message,
  href,
  actionLabel,
}: Readonly<{ message: string; href: string; actionLabel: string }>) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-danger-500/50 bg-danger-950/60 px-5 py-3.5"
    >
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-danger-400" />
      <p className="min-w-0 flex-1 text-sm text-danger-300">{message}</p>
      <Link
        href={href}
        className="shrink-0 rounded-md px-2.5 py-1 text-sm font-semibold text-danger-300 underline underline-offset-4 hover:text-danger-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-400"
      >
        {actionLabel}
      </Link>
    </div>
  )
}

/* ── Chiffre héros ───────────────────────────────────────────────────────── */

export function HeroFigure({
  valeur,
  libelle,
  unite,
}: Readonly<{ valeur: string; libelle: string; unite?: string }>) {
  return (
    <div>
      <p className="text-xs tracking-wide text-zinc-500 uppercase">{libelle}</p>
      <p className="mt-1.5 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight text-white tabular-nums sm:text-5xl">{valeur}</span>
        {unite ? <span className="text-base text-zinc-500">{unite}</span> : null}
      </p>
    </div>
  )
}

/** Fait secondaire posé à côté du chiffre héros — jamais une tuile de plus. */
export function SideFact({ libelle, valeur }: Readonly<{ libelle: string; valeur: string }>) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-zinc-500">{libelle}</p>
      <p className="mt-0.5 truncate text-sm text-zinc-200 tabular-nums">{valeur}</p>
    </div>
  )
}

/* ── Absence de source ───────────────────────────────────────────────────── */

/**
 * L'état le plus important du produit.
 *
 * Trois pages sur cinq décrivent un métier dont le service n'expose encore
 * aucune donnée : les tables existent en base, rien ne les lit en HTTP. Une
 * console honnête le dit et nomme ce qui manque, plutôt que d'afficher une
 * liste vide qu'on prendrait pour une panne — ou pire, un jeu d'exemple qu'on
 * prendrait pour la réalité.
 */
export function SourceAttendue({
  quoi,
  detail,
  requis,
}: Readonly<{ quoi: string; detail: string; requis: readonly string[] }>) {
  return (
    <Card className="px-6 py-10 text-center">
      <p className="text-sm font-semibold text-white">{quoi}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">{detail}</p>
      <div className="mx-auto mt-6 max-w-md rounded-lg bg-surface-sunken px-4 py-3 text-left">
        <p className="text-xs tracking-wide text-zinc-500 uppercase">Ce qu’il manque</p>
        <ul className="mt-2 space-y-1">
          {requis.map((r) => (
            <li key={r} className="flex gap-2 text-sm text-zinc-300">
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              {r}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

/* ── Silence : rien ne demande d'attention ───────────────────────────────── */

export function CalmState({ message }: Readonly<{ message: string }>) {
  return (
    <Card className="flex items-center gap-3 px-5 py-6">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-success-500" />
      <p className="text-sm text-zinc-300">{message}</p>
    </Card>
  )
}
