/**
 * Thème du produit — V2 : jour (fond blanc, la version principale) et nuit
 * (noir / gris, identique). Le choix vit dans le navigateur (`hc-theme`) et
 * s'applique AVANT le premier rendu : pas de flash d'un thème à l'autre.
 *
 * La classe `.dark` reste toujours posée : les composants Catalyst lisent
 * leurs variantes `dark:` dessus. Le thème réel est `data-theme` sur <html>,
 * et ce sont les tokens (`--ud-*`, `--color-*`) qui changent.
 */

export const THEME_STORAGE_KEY = 'hc-theme'
export type Theme = 'light' | 'dark'

export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');document.documentElement.dataset.theme=t==='dark'?'dark':'light';document.documentElement.classList.add('dark')}catch(e){document.documentElement.dataset.theme='light'}`
