import { NextResponse } from 'next/server'
import { ACCOUNTS, ENVELOPE_EXEMPT, envelope, problem, bloc, payloadFor, nowIso, randomUUID } from '../mock-data.js'

/**
 * Backend de DÉMONSTRATION — données entièrement fictives.
 *
 * Reprend `scripts/mock-backend.mjs` sous forme de route Next, pour qu'une
 * preview déployée montre les écrans peuplés sans dépendre du backend Railway.
 * Refuse en production (`VERCEL_ENV`), et rien ne pointe ici tant que
 * `HEARST_API_URL` ne le désigne pas.
 *
 * Les enveloppes portent `status: 'LIVE'` pour que les surfaces se peuplent —
 * les valeurs restent inventées. À annoncer comme telles en présentation.
 */

const TOKENS = new Map<string, { id: string; email: string; role: string }>()

async function handle(req: Request, path: string): Promise<NextResponse> {
  // Le garde vise le PROJET, pas l'environnement : la démo est déployée en
  // production sur son propre projet Vercel, alors que le projet de l'équipe ne
  // doit jamais exposer cette route. Sans `DEMO_BACKEND=1`, rien ne répond.
  if (process.env.DEMO_BACKEND !== '1') {
    return NextResponse.json(problem(404, 'NOT_FOUND', 'Not found.'), { status: 404 })
  }

  if (path === '/api/v1/auth/login' && req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const account = (ACCOUNTS as { email: string; password: string; id: string; role: string }[])
      .find((a) => a.email === email && a.password === password)
    if (!account) {
      return NextResponse.json(problem(401, 'UNAUTHORIZED', 'Invalid email or password.'), { status: 401 })
    }
    const token = String(randomUUID()).replace(/-/g, '')
    TOKENS.set(token, { id: account.id, email: account.email, role: account.role })
    return NextResponse.json({
      token,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 12 * 3_600_000).toISOString(),
      user: { id: account.id, email: account.email, role: account.role },
    })
  }

  if (path === '/api/v1/auth/register' && req.method === 'POST') {
    return NextResponse.json(problem(403, 'FORBIDDEN', 'Registration is closed on this instance.'), { status: 403 })
  }

  const isPublic = (ENVELOPE_EXEMPT as Set<string>).has(path)
  if (!isPublic) {
    const auth = req.headers.get('authorization') ?? ''
    const token = auth.replace(/^Bearer\s+/i, '').trim()
    if (!TOKENS.has(token)) {
      return NextResponse.json(
        problem(401, 'UNAUTHORIZED', 'Missing or invalid bearer token.'),
        { status: 401 },
      )
    }
  }

  if (path === '/api/v1/me/deposits' && req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const amount = Number(body?.amountUsdc)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(problem(400, 'INVALID_AMOUNT', 'amountUsdc must be a positive whole number of USDC.'), { status: 400 })
    }
    if (amount < 100_000) {
      return NextResponse.json(problem(422, 'BELOW_MINIMUM', 'Amount is below the 100,000 USDC minimum for this vault.'), { status: 422 })
    }
    if (amount > 26_750_000) {
      return NextResponse.json(problem(422, 'CAPACITY_EXCEEDED', 'Amount exceeds the capacity left in the vault.'), { status: 422 })
    }
    return NextResponse.json(envelope({
      deposit: bloc({
        id: `dep_${String(randomUUID()).slice(0, 8)}`,
        amountUsdc: amount,
        status: 'PENDING_SETTLEMENT',
        receivedAt: nowIso(),
      }),
    }))
  }

  const data = payloadFor(path)
  return NextResponse.json(isPublic ? data : envelope(data))
}

type Ctx = { params: Promise<{ path: string[] }> }

/** Le chemin d'origine est reconstruit : le front appelle `/api/v1/...`. */
async function routed(req: Request, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params
  return handle(req, '/' + (path ?? []).join('/'))
}

export const GET = routed
export const POST = routed
export const PUT = routed
export const PATCH = routed
export const DELETE = routed

export const dynamic = 'force-dynamic'
