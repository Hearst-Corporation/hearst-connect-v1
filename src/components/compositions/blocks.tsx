import { csl, Reading } from '@/components/layout/console'
import type { Availability } from '@/lib/vaults/model'
import { Panel, PanelBody, PanelHeader } from '@/components/compositions/panel'
import { SourceAttendue, CalmState } from '@/components/compositions/empty-state'
import { FadeIn } from '@/components/compositions/motion'
import { RichSparkline } from '@/components/charts'
import { Badge } from '@/components/catalyst/badge'
import { Table } from '@/components/catalyst/table'
import clsx from 'clsx'

/**
 * Blocs de composition « haut de gamme » — niveau 2bis de la doctrine.
 *
 * ── Ce que ces blocs sont, et ce qu'ils ne sont pas ───────────────────────
 * `panel.tsx`, `metric.tsx` et `empty-state.tsx` portent les contrats QUE les
 * routes recopiaient déjà. Ces blocs-ci vont un cran plus loin : ils composent
 * ces primitives en surfaces prêtes à l'emploi (une carte de KPI complète, une
 * section titrée avec ses actions, un tableau enveloppé de son état d'absence),
 * pour que les 18 pages admin de la vague suivante ne réassemblent pas dix fois
 * le même échafaudage. C'est une bibliothèque d'API, pas un thème : la matière
 * reste celle de la console (`csl`, tokens), et rien ici n'invente de couleur.
 *
 * ── La règle de véracité, ici comme partout ───────────────────────────────
 * Un bloc affiche ce qu'on lui DONNE. Il ne calcule aucune valeur, n'en dérive
 * aucune, ne replie jamais une absence sur un zéro. Les figures arrivent soit
 * déjà formatées (`string`), soit en `Availability<string>` — et dans ce
 * dernier cas elles passent par `Reading`, seul chemin par lequel une absence
 * devient un état nommé. Le `delta` d'un `StatCard` est fourni par l'appelant
 * (libellé + direction) : le bloc ne compare pas deux nombres, il met en forme
 * une comparaison déjà faite.
 *
 * ── Le mouvement ──────────────────────────────────────────────────────────
 * L'animation d'entrée vit dans `motion.tsx` (`FadeIn`), un client léger qui
 * respecte `prefers-reduced-motion`. Les blocs restent importables depuis un
 * composant serveur : seul `FadeIn` est `'use client'`, et il court-circuite
 * vers un rendu sans transition quand le mouvement est réduit.
 */

/* ── StatCard / StatGrid ──────────────────────────────────────────────────── */

/**
 * La DIRECTION d'un delta, décidée par l'appelant.
 *
 * Le bloc ne sait pas si « +12 % » est une bonne nouvelle : sur une marge oui,
 * sur un taux d'erreur non. C'est donc `tone` qui porte le sens (positif =
 * accent mint, négatif = danger, neutre = gris), et `label` qui porte le texte
 * déjà formaté (« +12 % sur 30 j », « −3 incidents »). Le bloc ne compare rien.
 */
export type DeltaTone = 'positive' | 'negative' | 'neutral'

const DELTA_TONE_CLASS: Record<DeltaTone, string> = {
  // L'accent mint de marque et le danger passent par leurs tokens de rampe ;
  // le neutre par le gris de texte secondaire du kit. Aucun hex.
  positive: 'text-accent-400',
  negative: 'text-danger-400',
  neutral: 'text-fg-secondary',
}

const DELTA_GLYPH: Record<DeltaTone, string> = {
  positive: '▲',
  negative: '▼',
  neutral: '■',
}

/**
 * Une carte de KPI « haut de gamme » : le titre, la valeur (déjà formatée ou en
 * `Availability`), un delta optionnel et un emplacement de sparkline.
 *
 * `valeur` accepte les deux formes que les pages produisent réellement :
 * - une `string` DÉJÀ formatée, pour un libellé éditorial ou un compte dérivé
 *   hors `Availability` ;
 * - une `Availability<string>`, qui passe alors par `Reading` — une absence s'y
 *   affiche comme un état nommé, jamais comme un zéro.
 *
 * Le titre est un `h2` par défaut (premier repère sous le `h1` du shell) ;
 * l'appelant le descend quand la carte vit sous une section déjà titrée.
 */
export function StatCard({
  titre,
  valeur,
  delta,
  deltaTone = 'neutral',
  trend,
  hint,
  as: Tag = 'h2',
  showRoute = false,
  className,
}: Readonly<{
  titre: string
  /** Déjà formatée, ou une `Availability` qui passe par `Reading`. */
  valeur: string | Availability<string>
  /** Le libellé du delta, DÉJÀ formaté par l'appelant (« +12 % sur 30 j »). */
  delta?: string
  deltaTone?: DeltaTone
  /** Une série pour la sparkline. Rendue seulement si elle porte ≥ 2 points. */
  trend?: number[]
  /** Une phrase qui dit ce que la carte mesure, sous le titre. */
  hint?: string
  as?: 'h2' | 'h3'
  /** Affiche la route backend quand la valeur est une absence. */
  showRoute?: boolean
  className?: string
}>) {
  return (
    <Panel tone="metric" className={clsx('flex flex-col gap-2', className)}>
      <Tag className={csl.cardTitle}>{titre}</Tag>
      {hint !== undefined && hint !== '' && <p className={csl.cellText}>{hint}</p>}
      <div className={csl.metricText}>
        {typeof valeur === 'string' ? (
          <span className={csl.metricValue}>{valeur}</span>
        ) : (
          <Reading value={valeur} className={csl.metricValue} showRoute={showRoute} />
        )}
      </div>
      {delta !== undefined && delta !== '' && (
        <p className={clsx('inline-flex items-center gap-1.5 text-xs', DELTA_TONE_CLASS[deltaTone])}>
          <span aria-hidden="true">{DELTA_GLYPH[deltaTone]}</span>
          {delta}
        </p>
      )}
      {trend && trend.length >= 2 && (
        <div className="mt-auto pt-2">
          <RichSparkline data={trend} height={24} />
        </div>
      )}
    </Panel>
  )
}

/**
 * La grille des `StatCard`.
 *
 * `label` est OBLIGATOIRE : une rangée de chiffres sans nom ne dit rien à qui
 * navigue par régions (même contrat que `KpiRow`). `columns` borne le nombre de
 * colonnes ; en dessous du seuil la grille se replie d'elle-même.
 */
export function StatGrid({
  children,
  label,
  columns = 4,
  className,
}: Readonly<{
  children: React.ReactNode
  label: string
  columns?: 2 | 3 | 4
  className?: string
}>) {
  // Container queries (pas breakpoints viewport) : la colonne admin est déjà
  // réduite par le rail — forcer 4 colonnes sur largeur fenêtre écrasait les cartes.
  const COLS: Record<2 | 3 | 4, string> = {
    2: '@[24rem]:grid-cols-2',
    3: '@[24rem]:grid-cols-2 @[40rem]:grid-cols-3',
    4: '@[24rem]:grid-cols-2 @[48rem]:grid-cols-4',
  }
  return (
    <section aria-label={label} className={clsx('@container min-w-0', className)}>
      <div className={clsx('grid grid-cols-1 gap-3', COLS[columns])}>{children}</div>
    </section>
  )
}

/* ── SectionCard ──────────────────────────────────────────────────────────── */

/**
 * Une surface titrée « haut de gamme » : un sur-titre optionnel, le titre, une
 * phrase de contexte, un emplacement d'actions, et le corps.
 *
 * Elle s'appuie sur `Panel` + `PanelHeader` + `PanelBody` pour la matière, et
 * ajoute le seul élément que ces primitives n'ont pas : une apparition douce à
 * l'entrée (`FadeIn`), qui respecte `prefers-reduced-motion`. C'est le bloc que
 * les pages admin poseront autour de chaque section — tableau, liste, détail.
 *
 * `actions` vit dans l'en-tête, à droite du titre : c'est là que se rangent un
 * bouton d'export, un filtre, un lien « tout voir ». Le bloc ne porte AUCUNE
 * logique — il expose un emplacement, l'appelant y met ce qu'il veut.
 */
export function SectionCard({
  title,
  eyebrow,
  hint,
  actions,
  children,
  tone = 'wave',
  as: Tag = 'h2',
  className,
}: Readonly<{
  title: string
  /** Le sur-titre, au-dessus du titre — une catégorie, un contexte court. */
  eyebrow?: string
  /** La phrase qui dit ce que la section montre. */
  hint?: string
  /** Emplacement d'actions à droite du titre (bouton, filtre, lien). */
  actions?: React.ReactNode
  children?: React.ReactNode
  tone?: 'wave' | 'chart' | 'plain'
  as?: 'h2' | 'h3'
  className?: string
}>) {
  return (
    <FadeIn>
      <Panel tone={tone} className={className}>
        <div className={csl.heroHead}>
          <div className="min-w-0 flex-1">
            {eyebrow !== undefined && eyebrow !== '' && (
              <p className={clsx(csl.cellText, 'text-xs uppercase tracking-wide text-fg-tertiary')}>{eyebrow}</p>
            )}
            <Tag className={csl.cardTitle}>{title}</Tag>
            {hint !== undefined && hint !== '' && <p className={csl.cellText}>{hint}</p>}
          </div>
          {actions !== undefined && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {children !== undefined && <PanelBody>{children}</PanelBody>}
      </Panel>
    </FadeIn>
  )
}

/* ── DataTableShell ───────────────────────────────────────────────────────── */

/**
 * L'enveloppe « haut de gamme » d'un tableau Catalyst.
 *
 * Elle porte le titre, une description, un badge de compte optionnel, et — c'est
 * son intérêt — l'aiguillage vers un état nommé quand il n'y a rien à montrer.
 * Deux absences distinctes, jamais confondues :
 * - `source` : la source n'existe pas encore → `SourceAttendue` (ce qui
 *   manque, pourquoi, et la route attendue) ;
 * - `calme` : la source a répondu, et sa réponse est « rien à signaler » →
 *   `CalmState`.
 * Quand aucune des deux n'est fournie, le bloc rend le `Table` et ses lignes.
 *
 * Le bloc NE VA CHERCHER AUCUNE DONNÉE : l'appelant décide de l'état à partir
 * de son `Availability`, et passe les lignes en `children`. Le `count` est un
 * libellé DÉJÀ formaté (« 12 mouvements ») — le bloc ne compte pas.
 */
/**
 * Table that must fit its panel — no overflow-x-auto, no forced nowrap.
 * Prefer fewer primary columns + detail links over horizontal scrolling.
 */
export function FitTable({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <div className={clsx('w-full min-w-0', className)} data-table="fit">
      <table className="w-full min-w-0 table-fixed text-left text-sm/6 text-ink dark:text-fg">{children}</table>
    </div>
  )
}

export function DataTableShell({
  title,
  description,
  count,
  source,
  calme,
  children,
  className,
  fit = false,
}: Readonly<{
  title: string
  description?: string
  /** Un libellé de compte DÉJÀ formaté, rendu en badge. Jamais calculé ici. */
  count?: string
  /** L'état « source attendue » à rendre au lieu du tableau, s'il est fourni. */
  source?: React.ComponentProps<typeof SourceAttendue>
  /** L'état « rien à signaler » (message), s'il est fourni. */
  calme?: string
  children?: React.ReactNode
  className?: string
  /**
   * When true, render without Catalyst's overflow-x-auto wrapper.
   * Use only when the column set is content-aware and fits the panel.
   */
  fit?: boolean
}>) {
  const body =
    source !== undefined ? (
      <SourceAttendue {...source} />
    ) : calme !== undefined ? (
      <CalmState message={calme} />
    ) : fit ? (
      <FitTable className={csl.heroTable}>{children}</FitTable>
    ) : (
      <Table className={csl.heroTable}>{children}</Table>
    )
  return (
    <SectionCard
      title={title}
      hint={description}
      tone="wave"
      className={className}
      actions={count !== undefined && count !== '' ? <Badge color="neutral">{count}</Badge> : undefined}
    >
      {body}
    </SectionCard>
  )
}

/* ── Callout ──────────────────────────────────────────────────────────────── */

/**
 * Une note en ligne « haut de gamme » — info, avertissement, danger, succès.
 *
 * Le `Alert` de Catalyst est une boîte de dialogue MODALE : elle interrompt.
 * Un callout, lui, vit DANS le flux de la page, à côté de ce qu'il commente. Il
 * est donc bâti sur un `div` tokenisé — chaque ton passe par sa rampe (success,
 * warning, danger) ou par le graphite neutre pour l'info, jamais par un hex. Le
 * fond est un aplat à faible opacité (`/10`) et le filet gauche porte la teinte
 * pleine, la signature visuelle d'une note.
 *
 * Ce n'est PAS un état d'absence (voir `SourceAttendue`) ni un état d'erreur de
 * chargement : c'est une remarque éditoriale posée à côté d'un contenu présent.
 */
export type CalloutTone = 'info' | 'success' | 'warning' | 'danger'

const CALLOUT_TONE_CLASS: Record<CalloutTone, string> = {
  // Aplat /10, filet gauche plein, texte au palier lisible de chaque rampe.
  info: 'bg-white/5 border-l-fg-tertiary text-fg',
  success: 'bg-success-400/10 border-l-success-400 text-success-300',
  warning: 'bg-warning-400/10 border-l-warning-400 text-warning-300',
  danger: 'bg-danger-400/10 border-l-danger-400 text-danger-300',
}

const CALLOUT_ROLE: Record<CalloutTone, 'status' | 'alert' | undefined> = {
  info: undefined,
  success: 'status',
  warning: 'status',
  danger: 'alert',
}

export function Callout({
  tone = 'info',
  title,
  children,
  className,
}: Readonly<{
  tone?: CalloutTone
  /** Un titre court optionnel, en gras au-dessus du corps. */
  title?: string
  children?: React.ReactNode
  className?: string
}>) {
  return (
    <div
      role={CALLOUT_ROLE[tone]}
      className={clsx('rounded-lg border border-l-4 border-console-line-soft px-4 py-3', CALLOUT_TONE_CLASS[tone], className)}
    >
      {title !== undefined && title !== '' && <p className="text-sm font-semibold">{title}</p>}
      {children !== undefined && <div className={clsx('text-sm', title !== undefined && title !== '' && 'mt-1')}>{children}</div>}
    </div>
  )
}
