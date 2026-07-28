/**
 * Theme toggle — browser side only.
 *
 * Three possible states on <html>:
 *   - no class: follows the system preference (default case);
 *   - `.light` / `.dark`: explicit user choice, remembered.
 *
 * Tailwind's `dark` variant (see src/styles/tailwind.css) reads both.
 */

export const THEME_STORAGE_KEY = 'theme'

/** The theme actually displayed right now. */
export function currentTheme(): 'light' | 'dark' {
  const root = document.documentElement
  if (root.classList.contains('dark')) return 'dark'
  if (root.classList.contains('light')) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Switches to the opposite theme and remembers the choice. */
export function toggleTheme(): void {
  const next = currentTheme() === 'dark' ? 'light' : 'dark'
  const root = document.documentElement

  root.classList.remove('light', 'dark')
  root.classList.add(next)

  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Storage unavailable (strict private browsing): the choice doesn't
    // survive a reload, but the toggle still works on the page.
  }
}

/**
 * Script run before first paint, injected into the <head>.
 * Without it, a page remembered as dark would flash light while React
 * hydrates — the classic white flash.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light'){document.documentElement.classList.add(t)}}catch(e){}`
