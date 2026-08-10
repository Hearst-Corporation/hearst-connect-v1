/**
 * Product theme — dark only.
 *
 * Hearst Connect is always dark. No light/dark toggle, no reading of
 * `prefers-color-scheme`, and no stored preference.
 * The init script removes any leftover `.light` class (from older sessions).
 */

const THEME_STORAGE_KEY = 'theme'

/**
 * Pre-first-paint script: forces `dark`, purges `light` + storage.
 * Avoids a light flash if an old "light" preference was lingering.
 */
export const THEME_INIT_SCRIPT = `try{document.documentElement.classList.remove('light');document.documentElement.classList.add('dark');localStorage.setItem('${THEME_STORAGE_KEY}','dark')}catch(e){try{document.documentElement.classList.add('dark')}catch(_){}}`
