/**
 * Thème produit — dark only.
 *
 * Hearst Connect est toujours en sombre. Aucune bascule clair/sombre,
 * aucune lecture de `prefers-color-scheme` ni de préférence mémorisée.
 * Le script d’init retire un éventuel `.light` résiduel (anciennes sessions).
 */

const THEME_STORAGE_KEY = 'theme'

/**
 * Script avant première peinture : impose `dark`, purge `light` + storage.
 * Évite un flash clair si une ancienne préférence « light » trainait.
 */
export const THEME_INIT_SCRIPT = `try{document.documentElement.classList.remove('light');document.documentElement.classList.add('dark');localStorage.setItem('${THEME_STORAGE_KEY}','dark')}catch(e){try{document.documentElement.classList.add('dark')}catch(_){}}`
