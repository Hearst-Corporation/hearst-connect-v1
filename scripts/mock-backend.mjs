/**
 * Mock backend Hearst Connect — DÉVELOPPEMENT LOCAL UNIQUEMENT.
 *
 * Sert le contrat décrit par `src/lib/backend/endpoints.ts` afin de faire
 * tourner le front sans le backend Railway. Les données et les écritures
 * vivent dans `src/app/api/demo-backend/mock-data.js`, partagé avec la démo
 * déployée : ce fichier n'ajoute que le serveur HTTP, les jetons et la
 * persistance sur disque.
 *
 * Ce fichier ne contourne aucune authentification : il implémente
 * `POST /api/v1/auth/login` comme un vrai backend (vérification des
 * identifiants, émission d'un jeton).
 *
 * Usage :  node scripts/mock-backend.mjs
 *          puis HEARST_API_URL=http://localhost:4106 dans .env.local
 */

import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  ACCOUNTS,
  ENVELOPE_EXEMPT,
  handleWrite,
  payloadFor,
  problem,
  envelope,
  serializeWorld,
  useWorld,
} from '../src/app/api/demo-backend/mock-data.js'

const PORT = Number(process.env.MOCK_PORT ?? 4106)

/*
 * Jetons émis, persistés sur disque.
 *
 * En mémoire seule, chaque redémarrage du mock déconnectait le navigateur : le
 * cookie de session pointait vers un jeton disparu, et TOUS les appels
 * retombaient en 401 — un symptôme qui ressemble à un bug de l'application
 * alors que rien ne l'est. Le fichier survit au redémarrage, la session aussi.
 *
 * Mock de développement local : ce fichier n'a aucune valeur de sécurité et ne
 * quitte jamais la machine. Il vit dans le dossier temporaire du système, pas
 * dans le dépôt.
 */
const TOKEN_STORE = join(tmpdir(), 'hearst-mock-tokens.json')

/* Les offres créées, les décisions, l'horloge… vivent dans le MONDE du mock,
   qui voyage avec la session (en-tête `x-demo-world`) — plus de fichier
   temporaire à recharger. */

const TOKENS = new Map(
  (() => {
    try {
      const raw = JSON.parse(readFileSync(TOKEN_STORE, 'utf8'))
      return Array.isArray(raw) ? raw : []
    } catch {
      // Premier lancement, fichier illisible ou effacé : on repart à vide.
      return []
    }
  })(),
)

function persistTokens() {
  try {
    /*
     * FUSION et non écrasement : deux instances du mock, ou deux démarrages
     * successifs, se volaient mutuellement leurs jetons — le dernier à écrire
     * effaçait les sessions de l'autre, et le navigateur retombait en 401 sur
     * TOUS les appels alors que rien n'était cassé côté application.
     *
     * On relit le fichier avant d'écrire, et les jetons en mémoire priment sur
     * ceux du disque pour une même clé.
     */
    let onDisk = []
    try {
      const raw = JSON.parse(readFileSync(TOKEN_STORE, 'utf8'))
      if (Array.isArray(raw)) onDisk = raw
    } catch {
      // Fichier absent ou illisible : la mémoire fait foi.
    }
    const merged = new Map([...onDisk, ...TOKENS])
    writeFileSync(TOKEN_STORE, JSON.stringify([...merged]))
  } catch {
    // La persistance est un confort : son échec ne doit pas casser le login.
  }
}


const readBody = (req) =>
  new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch { resolve(null) }
    })
  })

const send = (res, status, body) => {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'X-Request-Id': randomUUID(),
    'X-RateLimit-Remaining': '999',
    // Le monde après la requête : le front le garde dans la session.
    'X-Demo-World': serializeWorld(),
  })
  res.end(payload)
}

// En-têtes jusqu'à 64 Ko : le monde de la démo y voyage.
const server = createServer({ maxHeaderSize: 65_536 }, async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname
  // Le corps d'abord : tout ce qui suit est synchrone, aucune autre requête ne
  // peut réappliquer SON monde entre `useWorld` et la réponse.
  const body = req.method === 'GET' ? null : await readBody(req)
  // Le monde de CETTE session (décisions, offres, horloge…), relayé par le front.
  useWorld(req.headers['x-demo-world'])

  // Authentification : vérifiée pour de bon, comme le ferait le backend.
  if (path === '/api/v1/auth/login' && req.method === 'POST') {
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const account = ACCOUNTS.find((a) => a.email === email && a.password === password)
    if (!account) {
      return send(res, 401, problem(401, 'UNAUTHORIZED', 'Invalid email or password.'))
    }
    const token = randomUUID().replace(/-/g, '')
    TOKENS.set(token, account)
    persistTokens()
    return send(res, 200, {
      token,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 12 * 3_600_000).toISOString(),
      user: { id: account.id, email: account.email, role: account.role },
    })
  }

  if (path === '/api/v1/auth/register' && req.method === 'POST') {
    return send(res, 403, problem(403, 'FORBIDDEN', 'Registration is closed on this instance.'))
  }

  const isPublic = ENVELOPE_EXEMPT.has(path)
  if (!isPublic) {
    const auth = req.headers.authorization ?? ''
    const token = auth.replace(/^Bearer\s+/i, '').trim()
    if (!TOKENS.has(token)) {
      return send(res, 401, problem(401, 'UNAUTHORIZED', 'Missing or invalid bearer token.'))
    }
  }

  const write = handleWrite(req.method, path, body)
  if (write) return send(res, write.status, write.body)

  const data = payloadFor(path, url.search.replace(/^\?/, ''))
  return send(res, 200, isPublic ? data : envelope(data))
})

server.listen(PORT, () => {
  console.log(`Mock backend Hearst Connect → http://localhost:${PORT}`)
  console.log(`Connexion : ${ACCOUNTS[0].email} / ${ACCOUNTS[0].password}`)
  console.log('Toutes les données sont FICTIVES — annoncées meta.status = LIVE pour peupler le front.')
})
