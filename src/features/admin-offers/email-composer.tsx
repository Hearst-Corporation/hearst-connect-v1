'use client'

import { useEffect, useState } from 'react'

/**
 * Les courriels du parcours d'une offre — prêts à relire, modifier et envoyer.
 *
 * Aucun service d'envoi n'est branché côté serveur : « Send » ouvre un
 * brouillon PRÉ-REMPLI (destinataire, copies, objet, texte) dans Gmail ou dans
 * le logiciel de messagerie, et l'opérateur n'a plus qu'à cliquer sur Envoyer.
 * Rien ne part sans lui — c'est aussi ce qu'on veut pour un courriel qui
 * engage l'entreprise.
 *
 * Les modifications et les copies se gardent dans ce navigateur, par offre et
 * par courriel : elles survivent à un rechargement, pas à un changement de
 * poste. Les conserver pour toute l'équipe demandera une route backend.
 */

export type ComposerEmail = Readonly<{
  id: string
  subject: string
  trigger: string
  body: string
  /** Le courriel de l'étape en cours : déplié par défaut. */
  current: boolean
}>

type Draft = { subject: string; body: string; to: string; cc: string }

const keyOf = (offerId: string, emailId: string) => `hc-offer-email:${offerId}:${emailId}`

function load(offerId: string, email: ComposerEmail, to: string): Draft {
  try {
    const raw = localStorage.getItem(keyOf(offerId, email.id))
    if (raw) return { subject: email.subject, body: email.body, to, cc: '', ...(JSON.parse(raw) as Partial<Draft>) }
  } catch {
    /* Stockage indisponible : on repart du modèle. */
  }
  return { subject: email.subject, body: email.body, to, cc: '' }
}

function save(offerId: string, emailId: string, draft: Draft) {
  try {
    localStorage.setItem(keyOf(offerId, emailId), JSON.stringify(draft))
  } catch {
    /* Navigation privée : les modifications restent pour la session. */
  }
}

/** Les adresses saisies, nettoyées : séparées par virgule, point-virgule ou espace. */
const addresses = (raw: string) =>
  raw
    .split(/[,;\s]+/)
    .map((a) => a.trim())
    .filter((a) => a.includes('@'))

const FIELD =
  'w-full rounded-lg border border-[var(--ud-line)] bg-[var(--ud-card)] px-3 py-2 text-sm text-fg placeholder:text-fg-tertiary focus:border-[var(--hearst-green)] focus:outline-none'

export function EmailComposer({
  offerId,
  to,
  emails,
}: Readonly<{ offerId: string; to: string | null; emails: readonly ComposerEmail[] }>) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-fg-tertiary">
        Emails — review, edit, then send from Gmail or your mail app. Nothing is sent automatically.
      </p>
      {emails.map((email) => (
        <EmailRow key={email.id} offerId={offerId} to={to ?? ''} email={email} />
      ))}
    </div>
  )
}

function EmailRow({ offerId, to, email }: Readonly<{ offerId: string; to: string; email: ComposerEmail }>) {
  const [draft, setDraft] = useState<Draft>({ subject: email.subject, body: email.body, to, cc: '' })
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => setDraft(load(offerId, email, to)), [offerId, email, to])

  const update = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    save(offerId, email.id, next)
  }

  const toList = addresses(draft.to)
  const ccList = addresses(draft.cc)
  const edited = draft.subject !== email.subject || draft.body !== email.body

  const gmailHref =
    'https://mail.google.com/mail/?view=cm&fs=1' +
    `&to=${encodeURIComponent(toList.join(','))}` +
    (ccList.length > 0 ? `&cc=${encodeURIComponent(ccList.join(','))}` : '') +
    `&su=${encodeURIComponent(draft.subject)}` +
    `&body=${encodeURIComponent(draft.body)}`
  const mailtoHref =
    `mailto:${toList.map(encodeURIComponent).join(',')}` +
    `?subject=${encodeURIComponent(draft.subject)}` +
    (ccList.length > 0 ? `&cc=${ccList.map(encodeURIComponent).join(',')}` : '') +
    `&body=${encodeURIComponent(draft.body)}`

  return (
    <details open={email.current} className="group rounded-lg bg-[var(--ud-inset)] ring-1 ring-[var(--ud-line)]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hearst-green)] [&::-webkit-details-marker]:hidden">
        <span className="text-[var(--hearst-green)] transition-transform group-open:rotate-90" aria-hidden="true">
          ▸
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-[var(--hearst-green)]">{draft.subject}</span>
        {edited ? <span className="text-[11px] text-fg-tertiary">edited</span> : null}
        <span className="shrink-0 text-xs text-fg-tertiary">{email.trigger}</span>
      </summary>

      <div className="flex flex-col gap-3 border-t border-[var(--ud-line)] px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">To</span>
            <input
              className={FIELD}
              value={draft.to}
              placeholder="client@company.com"
              onChange={(e) => update({ to: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-tertiary">CC — separate addresses with a comma</span>
            <input
              className={FIELD}
              value={draft.cc}
              placeholder="cfo@company.com, legal@company.com"
              onChange={(e) => update({ cc: e.target.value })}
            />
          </label>
        </div>

        {editing ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-fg-tertiary">Subject</span>
              <input className={FIELD} value={draft.subject} onChange={(e) => update({ subject: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-fg-tertiary">Message</span>
              <textarea
                className={`${FIELD} min-h-[260px] font-mono text-xs leading-relaxed`}
                value={draft.body}
                onChange={(e) => update({ body: e.target.value })}
              />
            </label>
          </>
        ) : (
          <pre className="max-h-[320px] overflow-y-auto rounded-lg bg-[var(--ud-card)] px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap text-fg-secondary">
            {draft.body}
          </pre>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={toList.length > 0 ? gmailHref : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={toList.length === 0}
            className={`ud-cta ${toList.length === 0 ? 'pointer-events-none opacity-40' : ''}`}
          >
            Send with Gmail
          </a>
          <a
            href={toList.length > 0 ? mailtoHref : undefined}
            aria-disabled={toList.length === 0}
            className={`inline-flex h-9 items-center rounded-full px-5 text-[13px] font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5 ${toList.length === 0 ? 'pointer-events-none opacity-40' : ''}`}
          >
            Mail app
          </a>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="inline-flex h-9 items-center rounded-full px-5 text-[13px] font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5"
          >
            {editing ? 'Done editing' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              } catch {
                /* Presse-papier refusé : le texte reste sélectionnable. */
              }
            }}
            className="inline-flex h-9 items-center rounded-full px-5 text-[13px] font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          {edited ? (
            <button
              type="button"
              onClick={() => update({ subject: email.subject, body: email.body })}
              className="text-xs text-fg-tertiary hover:text-fg"
            >
              Reset to template
            </button>
          ) : null}
          {toList.length === 0 ? <span className="text-xs text-amber-400">Add a recipient to send.</span> : null}
        </div>
      </div>
    </details>
  )
}
