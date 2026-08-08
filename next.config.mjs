/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production'

/**
 * Content-Security-Policy.
 *
 * Compromis assumé sur `script-src` : ce projet n'a pas de middleware et on ne veut pas
 * en ajouter ici, donc pas de nonce Next. Le layout embarque un `<script>` inline de
 * bootstrap (thème / localStorage) et le runtime Next injecte du script inline ; on
 * autorise donc `'unsafe-inline'`. Un durcissement via nonce + middleware est un TODO
 * séparé. En dev uniquement, `'unsafe-eval'` est requis par react-refresh.
 *
 * `connect-src 'self'` suffit : le backend Hearst n'est appelé que côté serveur, jamais
 * depuis le navigateur — son URL n'a rien à faire dans la CSP.
 */
const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data:",
  "font-src 'self'",
  // Next injecte des styles inline (Server Components, styled-jsx).
  "style-src 'self' 'unsafe-inline'",
  // 'unsafe-inline' : script de bootstrap thème + runtime Next. 'unsafe-eval' : react-refresh (dev seulement).
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "connect-src 'self'",
  "form-action 'self'",
  // Force HTTPS uniquement en prod (casserait http://localhost en dev).
  ...(isProd ? ['upgrade-insecure-requests'] : []),
]

const contentSecurityPolicy = cspDirectives.join('; ')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Redondant avec `frame-ancestors 'none'`, conservé pour les anciens navigateurs.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // HSTS uniquement en prod : jamais sur http://localhost.
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
]

const nextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/admin/conformite', destination: '/admin/compliance', permanent: true },
      { source: '/admin/produit', destination: '/admin/product', permanent: true },
      { source: '/admin/administration/produit', destination: '/admin/product', permanent: true },
      { source: '/espace', destination: '/account', permanent: true },
      { source: '/espace/dashboard', destination: '/account/dashboard', permanent: true },
      { source: '/espace/bitcoin', destination: '/account/bitcoin', permanent: true },
      { source: '/espace/activite', destination: '/account/activity', permanent: true },
      { source: '/espace/profil', destination: '/account/profile', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
