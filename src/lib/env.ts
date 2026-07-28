import 'server-only'

/**
 * Canon des variables d'environnement serveur.
 *
 * Source unique : aucun autre module ne lit `process.env` pour ces clés. La
 * validation est explicite et fail-closed — une configuration absente ou
 * invalide produit un état nommé, jamais une valeur de repli ni une donnée
 * simulée.
 *
 * `import 'server-only'` fait échouer le build si ce module atteint un bundle
 * client. Aucune de ces variables n'est préfixée `NEXT_PUBLIC_` : les secrets
 * ne sortent pas du serveur.
 *
 * RÈGLE ABSOLUE : ce module ne journalise JAMAIS une valeur. Les diagnostics
 * exposent le NOM d'une variable et son état (présente / absente / invalide),
 * jamais son contenu.
 */

export type EnvVarStatus = 'ok' | 'missing' | 'invalid'

export type EnvVarReport = {
  name: string
  status: EnvVarStatus
  /** Rôle de la variable, affichable dans l'UI. */
  purpose: string
  /** Ce qui manque ou ne va pas — sans jamais citer la valeur. */
  detail: string | null
}

/** Longueur minimale d'un secret de signature, en caractères. */
const MIN_SECRET_LENGTH = 32

function readSecret(name: string, purpose: string): EnvVarReport {
  const raw = process.env[name]
  if (!raw || raw.trim().length === 0) {
    return { name, status: 'missing', purpose, detail: 'Variable absente.' }
  }
  if (raw.trim().length < MIN_SECRET_LENGTH) {
    return {
      name,
      status: 'invalid',
      purpose,
      detail: `Trop courte : ${MIN_SECRET_LENGTH} caractères minimum attendus.`,
    }
  }
  return { name, status: 'ok', purpose, detail: null }
}

function readUrl(name: string, purpose: string): EnvVarReport {
  const raw = process.env[name]?.trim()
  if (!raw) {
    return { name, status: 'missing', purpose, detail: 'Variable absente.' }
  }
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return { name, status: 'invalid', purpose, detail: 'HTTPS exigé hors développement local.' }
    }
  } catch {
    return { name, status: 'invalid', purpose, detail: "Ce n'est pas une URL absolue valide." }
  }
  return { name, status: 'ok', purpose, detail: null }
}

/** URL du backend, sans barre oblique finale. `null` si non configurée. */
export function backendUrl(): string | null {
  const raw = process.env.HEARST_API_URL?.trim()
  if (!raw) return null
  try {
    new URL(raw)
  } catch {
    return null
  }
  let end = raw.length
  while (end > 0 && raw[end - 1] === '/') end -= 1
  return raw.slice(0, end)
}

/**
 * Secret de protection du cookie de session frontend.
 *
 * Il ne sert JAMAIS à parler au backend : depuis la bascule sur
 * l'authentification backend, ce frontend ne signe plus aucun jeton d'API.
 */
export function authSecret(): string | null {
  const raw = process.env.AUTH_SECRET?.trim()
  return raw && raw.length >= MIN_SECRET_LENGTH ? raw : null
}

/**
 * État complet de la configuration serveur, destiné à l'affichage.
 * Aucune valeur n'y figure — uniquement des noms et des statuts.
 *
 * Interne au canon : l'extérieur passe par `checkConfiguration()`, qui expose
 * ce rapport dans `ConfigHealth.report`. Garder une seule porte d'entrée évite
 * qu'un appelant se construise un jugement parallèle sur `publicReady` /
 * `loginReady`.
 */
function environmentReport(): EnvVarReport[] {
  return [
    readUrl('HEARST_API_URL', 'Base du backend Hearst Connect — autorité d’authentification.'),
    readSecret('AUTH_SECRET', 'Protection du cookie de session frontend, uniquement.'),
  ]
}

export type ConfigHealth = {
  /** Les sondes publiques sont appelables. */
  publicReady: boolean
  /**
   * La connexion est possible : le backend, autorité d'authentification, est
   * adressable, et le cookie de session peut être scellé.
   *
   * Ce n'est PAS « une session existe » : la présence d'une session se lit dans
   * la session elle-même, pas dans la configuration.
   */
  loginReady: boolean
  report: EnvVarReport[]
}

/**
 * Validation au démarrage d'un rendu serveur.
 *
 * Ne lève pas : une console qui explose n'aide personne à diagnostiquer une
 * variable manquante. Elle renvoie un état que l'interface rend honnêtement.
 */
export function checkConfiguration(): ConfigHealth {
  const report = environmentReport()
  const ok = (name: string) => report.find((entry) => entry.name === name)?.status === 'ok'

  return {
    publicReady: ok('HEARST_API_URL'),
    loginReady: ok('HEARST_API_URL') && ok('AUTH_SECRET'),
    report,
  }
}

/**
 * Garde-fou de démarrage : signale les manques une seule fois, par leur NOM.
 * Aucune valeur, aucun fragment de secret n'est écrit dans les journaux.
 *
 * Appelée depuis le `RootLayout` : tout rendu serveur passe par là. Le verrou
 * `announced` est en portée module — un worker journalise une fois, pas à
 * chaque requête.
 *
 * Ne lève jamais : un garde-fou qui casse le rendu transforme une variable
 * oubliée en panne totale. En cas d'imprévu, on se tait plutôt que d'échouer.
 */
let announced = false
export function announceConfigurationOnce(): void {
  if (announced) return
  announced = true

  try {
    const failing = environmentReport().filter((entry) => entry.status !== 'ok')
    if (failing.length === 0) return

    // `name`, `detail` et `purpose` sont des littéraux du présent module : ils
    // ne sont jamais construits à partir de `process.env`. Rien de ce qui suit
    // ne peut donc contenir un fragment de valeur.
    const lines = failing.map(
      (entry) => `  - ${entry.name} : ${entry.detail ?? entry.status} (${entry.purpose})`,
    )
    console.warn(
      `[hearst-connect] Configuration incomplète — les surfaces concernées afficheront « non configuré » :\n${lines.join('\n')}`,
    )
  } catch {
    // Un diagnostic n'a pas le droit de faire tomber une page.
  }
}
