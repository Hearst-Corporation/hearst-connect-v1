import { NextResponse } from 'next/server'
import { ACCOUNTS, ENVELOPE_EXEMPT, envelope, handleWrite, payloadFor, problem, randomUUID, serializeWorld, useWorld } from '../mock-data.js'

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

/**
 * Jeton sans état : chaque requête Vercel s'exécute dans une instance
 * serverless distincte, donc une `Map` en mémoire perdait le jeton émis au
 * login dès l'appel suivant. Un préfixe fixe suffit ici — ce backend ne sert
 * que des données fictives, il n'y a rien à protéger.
 */
const DEMO_TOKEN_PREFIX = 'demo-'

/* `body` est lu AVANT d'appliquer le monde de la session : la suite est
   synchrone, aucune requête concurrente ne peut réappliquer le sien entre-temps. */
function handle(req: Request, path: string, body: unknown): NextResponse {
  // Le garde vise le PROJET, pas l'environnement : la démo est déployée en
  // production sur son propre projet Vercel, alors que le projet de l'équipe ne
  // doit jamais exposer cette route. Sans `DEMO_BACKEND=1`, rien ne répond.
  if (process.env.DEMO_BACKEND !== '1') {
    return NextResponse.json(problem(404, 'NOT_FOUND', 'Not found.'), { status: 404 })
  }

  if (path === '/api/v1/auth/login' && req.method === 'POST') {
    const creds = (body ?? {}) as { email?: unknown; password?: unknown }
    const email = String(creds.email ?? '').trim().toLowerCase()
    const password = String(creds.password ?? '')
    const account = (ACCOUNTS as { email: string; password: string; id: string; role: string }[])
      .find((a) => a.email === email && a.password === password)
    if (!account) {
      return NextResponse.json(problem(401, 'UNAUTHORIZED', 'Invalid email or password.'), { status: 401 })
    }
    const token = DEMO_TOKEN_PREFIX + String(randomUUID()).replace(/-/g, '')
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
    if (!token.startsWith(DEMO_TOKEN_PREFIX)) {
      return NextResponse.json(
        problem(401, 'UNAUTHORIZED', 'Missing or invalid bearer token.'),
        { status: 401 },
      )
    }
  }

  // Les écritures sont celles du mock local, au caractère près.
  if (req.method !== 'GET') {
    const write = handleWrite(req.method, path, body) as { status: number; body: unknown } | null
    if (write) return NextResponse.json(write.body, { status: write.status })
  }

  // La query porte les paramètres de simulation d'une offre : sans elle,
  // chaque propale retomberait sur les valeurs par défaut.
  const data = payloadFor(path, new URL(req.url).searchParams.toString())
  return NextResponse.json(isPublic ? data : envelope(data))
}

type Ctx = { params: Promise<{ path: string[] }> }

/** Le chemin d'origine est reconstruit : le front appelle `/api/v1/...`. */
/* Le monde de la session — décisions, offres, horloge — arrive dans l'en-tête
   `x-demo-world` et repart dans la réponse : une instance serverless n'en
   garde rien d'une requête à l'autre. */
async function routed(req: Request, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params
  const body = req.method === 'GET' ? null : await req.json().catch(() => null)
  ;(useWorld as (h: string | null) => void)(req.headers.get('x-demo-world'))
  const res = handle(req, '/' + (path ?? []).join('/'), body)
  res.headers.set('x-demo-world', (serializeWorld as () => string)())
  return res
}

export const GET = routed
export const POST = routed
export const PUT = routed
export const PATCH = routed
export const DELETE = routed

export const dynamic = 'force-dynamic'
