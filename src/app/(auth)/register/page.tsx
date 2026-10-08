import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Request access',
}

/* La demande d'accès — même typographie que la connexion et la landing. */
export default function RegisterPage() {
  return (
    <div className="auth-card">
      <div>
        <p className="auth-eyebrow">Hearst Connect</p>
        <h1 className="auth-h2">Invitation-only access</h1>
        <p className="auth-lead">
          Hearst Connect accounts are opened by the workspace owner: there is no open registration. Email us with your
          organization details and we will open the workspace and invite you.
        </p>
      </div>

      <div className="auth-fields">
        <a href="mailto:connect@hearstcorporation.io?subject=Hearst%20Connect%20access%20request" className="auth-btn">
          Email the team
        </a>
        <p className="auth-meta">
          Already have an account?{' '}
          <Link href="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
