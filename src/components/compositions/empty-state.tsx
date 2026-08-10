import { csl } from '@/components/layout/console'
import { Panel, PanelBody, PanelHeader } from '@/components/compositions/panel'

/**
 * SourceAttendue — the most important state in the product.
 *
 * Some surfaces describe an activity whose data the backend does not yet
 * expose. The console SAYS SO, and names what is missing, instead of
 * showing an empty list that would read like a failure — or worse, a set
 * of sample data that would read like reality.
 *
 * ── What it replaces ──────────────────────────────────────────────────────
 * Six routes declared their own copy. The five variants differed only in the
 * presence of an optional `action` and in the formatting of the `.map()` —
 * same structure, same substance, same contract. The `action` is kept here:
 * it is the only difference that carried a real need.
 *
 * ── What it is not ────────────────────────────────────────────────────────
 * This is NOT an error state, and it is not an empty state in the sense of
 * "the list is empty": it is "the source does not exist yet". The three say
 * different things and must not be conflated into a single component driven
 * by a boolean.
 */
export function SourceAttendue({
  quoi,
  detail,
  requis,
  action,
}: Readonly<{
  /** What this surface would show if the source existed. */
  quoi: string
  /** Why it does not show it — in one sentence, without jargon. */
  detail: string
  /** What the backend must expose. One line per expected element. */
  requis: readonly string[]
  action?: React.ReactNode
}>) {
  return (
    <Panel tone="wave">
      <PanelHeader title={quoi} />
      <PanelBody>
        <p className={csl.cellText}>{detail}</p>
        {requis.map((item) => (
          <p key={item} className={csl.cellText}>
            {item}
          </p>
        ))}
        {action}
      </PanelBody>
    </Panel>
  )
}

/**
 * CalmState — "nothing needs your attention".
 *
 * To be distinguished from an absence: here the source has responded, and its
 * response is that all is well. A silent empty state would leave the reader
 * wondering whether the page has failed.
 */
export function CalmState({ message }: Readonly<{ message: string }>) {
  return (
    <Panel tone="wave">
      <PanelBody>
        <p className={csl.cellText}>{message}</p>
      </PanelBody>
    </Panel>
  )
}
