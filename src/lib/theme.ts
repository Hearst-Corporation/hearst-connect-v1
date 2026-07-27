/**
 * Bascule de thème — côté navigateur uniquement.
 *
 * Trois états possibles sur <html> :
 *   - aucune classe : on suit la préférence système (cas par défaut) ;
 *   - `.light` / `.dark` : choix explicite de l'utilisateur, mémorisé.
 *
 * Le variant `dark` de Tailwind (voir src/styles/tailwind.css) lit les deux.
 */

export const THEME_STORAGE_KEY = 'theme'

/** Le thème effectivement affiché en ce moment. */
export function currentTheme(): 'light' | 'dark' {
  const root = document.documentElement
  if (root.classList.contains('dark')) return 'dark'
  if (root.classList.contains('light')) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Passe au thème opposé et mémorise le choix. */
export function toggleTheme(): void {
  const next = currentTheme() === 'dark' ? 'light' : 'dark'
  const root = document.documentElement

  root.classList.remove('light', 'dark')
  root.classList.add(next)

  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Stockage indisponible (navigation privée stricte) : le choix ne survit
    // pas au rechargement, la bascule fonctionne quand même sur la page.
  }
}

/**
 * Script exécuté avant la première peinture, injecté dans le <head>.
 * Sans lui, une page mémorisée en sombre s'afficherait en clair le temps que
 * React s'hydrate — le fameux flash blanc.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light'){document.documentElement.classList.add(t)}}catch(e){}`
