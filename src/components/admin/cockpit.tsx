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
  return <Tag className={clsx('border-t border-zinc-300', className)}>{children}</Tag>
}

export function CardHeader({
  title,
  hint,
  action,
}: Readonly<{ title: string; hint?: string; action?: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-zinc-200 py-5">
      <div className="min-w-0">
        <h2 className="text-xl font-normal tracking-[-0.02em] text-black">{title}</h2>
        {hint ? <p className="text-metadata mt-1 text-zinc-600">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/* ── Ton des états ───────────────────────────────────────────────────────── */

export type Tone = 'neutral' | 'attention' | 'critique' | 'sain'

const TONE_RING: Record<Tone, string> = {
  neutral: 'border-zinc-300',
  sain: 'border-success-600',
  attention: 'border-warning-600',
  critique: 'border-danger-600',
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
    <Card as="article" className={clsx('flex flex-col border-l-2 px-5 py-6', TONE_RING[ton])}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-label text-zinc-700">{titre}</h3>
        <span className={clsx('text-metadata inline-flex items-center gap-1.5 font-medium', TONE_TEXT[ton])}>
          {TONE_LABEL[ton]}
        </span>
      </div>

      <p className="mt-4 flex items-baseline gap-2">
        <span className="text-numeric-display text-black tabular-nums">{compte}</span>
        {unite ? <span className="text-label text-zinc-600">{unite}</span> : null}
      </p>
      {contexte ? <p className="text-metadata mt-1 text-zinc-600">{contexte}</p> : null}

      {casUrgent ? (
        <p className="text-label mt-5 border-t border-zinc-200 pt-4 text-zinc-800">
          <span className="text-metadata block text-zinc-500">Le plus urgent</span>
          {casUrgent}
        </p>
      ) : null}

      <Link
        href={href}
        className="text-label hover:bg-accent-500 mt-6 inline-flex w-fit items-center justify-center rounded-full bg-black px-5 py-2.5 font-medium text-white transition-colors hover:text-black"
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
      className="border-danger-600 bg-danger-50 flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 px-5 py-4"
    >
      <p className="text-label text-danger-700 min-w-0 flex-1">{message}</p>
      <Link
        href={href}
        className="border-danger-700 text-label text-danger-700 hover:text-danger-950 shrink-0 border-b pb-0.5 font-medium"
      >
        {actionLabel}
      </Link>
    </div>
  )
}

/* ── Chiffre héros ───────────────────────────────────────────────────────── */

export function HeroFigure({ valeur, libelle, unite }: Readonly<{ valeur: string; libelle: string; unite?: string }>) {
  return (
    <div>
      <p className="text-metadata tracking-[0.12em] text-zinc-600 uppercase">{libelle}</p>
      <p className="mt-4 flex flex-wrap items-baseline gap-3">
        <span className="text-numeric-display text-black tabular-nums">{valeur}</span>
        {unite ? <span className="text-body text-zinc-600">{unite}</span> : null}
      </p>
    </div>
  )
}

/** Fait secondaire posé à côté du chiffre héros — jamais une tuile de plus. */
export function SideFact({ libelle, valeur }: Readonly<{ libelle: string; valeur: string }>) {
  return (
    <div className="min-w-0 border-t border-zinc-300 pt-4">
      <p className="text-metadata text-zinc-600">{libelle}</p>
      <p className="mt-2 text-2xl font-normal tracking-[-0.02em] text-black tabular-nums">{valeur}</p>
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
    <Card className="grid gap-10 bg-black px-6 py-10 text-white md:grid-cols-[1.1fr_0.9fr] md:px-10 md:py-14">
      <div>
        <p className="text-section-title max-w-xl">{quoi}</p>
        <p className="text-body mt-5 max-w-2xl text-zinc-400">{detail}</p>
      </div>
      <div className="border-t border-white/30 pt-5 text-left">
        <p className="text-metadata tracking-[0.12em] text-zinc-400 uppercase">Ce qu’il manque</p>
        <ul className="mt-4 space-y-3">
          {requis.map((r) => (
            <li key={r} className="text-label flex gap-3 border-b border-white/15 pb-3 text-zinc-200">
              <span aria-hidden="true" className="text-metadata text-accent-400 font-mono">
                —
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
    <Card className="flex items-center gap-5 py-5">
      <span aria-hidden="true" className="bg-success-600 h-px w-10 shrink-0" />
      <p className="text-label text-zinc-700">{message}</p>
    </Card>
  )
}
