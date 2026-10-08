'use client'

import Link from 'next/link'
import { login, quickLoginOwner, type LoginState } from '@/lib/actions'
import { useActionState } from 'react'

const initialState: LoginState = { error: null }

/**
 * Sign-in form.
 *
 * Holds no token or secret: it posts to a Server Action that talks to the
 * backend and seals the session cookie. The component only receives
 * user-facing messages.
 *
 * Typographie et contrôles de la landing (connect.hearst.app) : surtitre vert
 * 16px, titre FK Grotesk Regular 48px, texte 18px gris, champs et boutons en
 * pilule de 48px — la page d'entrée continue la landing sans rupture.
 */
export function LoginForm({
  notice = null,
  loginReady = true,
  devQuickLoginAvailable = false,
}: Readonly<{ notice?: string | null; loginReady?: boolean; devQuickLoginAvailable?: boolean }>) {
  const [state, formAction, pending] = useActionState(login, initialState)
  const [quickState, quickAction, quickPending] = useActionState(quickLoginOwner, initialState)

  return (
    <div className="auth-card">
      <div>
        <p className="auth-eyebrow">Hearst Connect</p>
        <h1 className="auth-h2">Sign in</h1>
        <p className="auth-lead">Use the professional email address linked to your organization.</p>
      </div>

      <form action={formAction} className="auth-fields">
        {notice ? <output className="auth-notice">{notice}</output> : null}

        {!loginReady ? (
          <output className="auth-notice is-neutral">
            Authentication is not configured on this deployment: sign-in is not available right now.
          </output>
        ) : null}

        <label className="auth-field">
          <span className="auth-label">Email address</span>
          <input
            className="auth-input"
            type="email"
            name="email"
            autoComplete="username"
            placeholder="you@company.com"
            required
            autoFocus
            disabled={pending}
            aria-invalid={!!state.error}
          />
        </label>

        <label className="auth-field">
          <span className="auth-label">Password</span>
          <input
            className="auth-input"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            disabled={pending}
            aria-invalid={!!state.error}
          />
        </label>
        {state.error ? (
          <p className="auth-error" role="alert">
            {state.error}
          </p>
        ) : null}

        <button type="submit" className="auth-btn" disabled={pending || !loginReady}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="auth-meta">
          No access yet?{' '}
          <Link href="/register" className="auth-link">
            Request an invitation
          </Link>
        </p>
      </form>

      {devQuickLoginAvailable ? (
        <form action={quickAction} className="auth-dev">
          <button type="submit" className="auth-btn is-ghost" disabled={quickPending}>
            {quickPending ? 'Opening the demo…' : 'Explore the demo'}
          </button>
          <p className="auth-meta">No sign-in needed: the client platform with demo data, the admin one click away.</p>
          {quickState.error ? (
            <p className="auth-error" role="alert">
              {quickState.error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}
