'use client'

import { useEffect } from 'react'

/** Au-delà de cette largeur, le CSS laisse les tableaux en colonnes. */
const WIDE = '(min-width: 1440px)'

/**
 * Les tableaux de la console se replient en cartes quand ils ne tiennent pas :
 * la première cellule en titre, puis une ligne « intitulé — valeur » par
 * colonne, l'action en haut à droite (voir user-dashboard.css). Comme sur
 * /account, rien ne défile en largeur.
 *
 * Deux rôles :
 * - recopier l'intitulé de chaque colonne sur ses cellules (`data-label`), que
 *   le CSS affiche dans la carte ;
 * - au-delà de 1440px, où le CSS garde les colonnes, mesurer chaque tableau :
 *   s'il déborde de sa carte (carte étroite, colonnes nombreuses), le marquer
 *   `data-stack` pour qu'il se replie lui aussi. Sa largeur naturelle est
 *   retenue, et il redevient un tableau dès que la carte la retrouve.
 *
 * Refait quand un tableau change de page ou se déplie, et au redimensionnement.
 * Une seule pose pour toute la console : les tableaux n'ont rien à déclarer.
 */
export function TableLabels() {
  useEffect(() => {
    const wide = window.matchMedia(WIDE)

    const fit = (table: HTMLTableElement) => {
      if (!wide.matches) {
        if (table.hasAttribute('data-stack')) table.removeAttribute('data-stack')
        return
      }
      const box = (table.parentElement?.closest('.overflow-x-auto') as HTMLElement | null) ?? table.parentElement
      if (box === null) return
      if (table.hasAttribute('data-stack')) {
        if (box.clientWidth >= Number(table.dataset.natural ?? Infinity)) table.removeAttribute('data-stack')
      } else if (table.offsetWidth > box.clientWidth + 1) {
        table.dataset.natural = String(table.offsetWidth)
        table.setAttribute('data-stack', '')
      }
    }

    const run = () => {
      for (const table of document.querySelectorAll<HTMLTableElement>('.ud-admin table')) {
        // Les tableaux pour lecteur d'écran (données des graphiques) ne se
        // replient pas : rien à étiqueter.
        if (table.closest('.sr-only')) continue
        // La projection reste un tableau partout, comme sur /account.
        if (table.classList.contains('projection-table')) continue
        // Un tableau qui gère lui-même son affichage étroit (il défile) s'exclut.
        if (table.hasAttribute('data-no-labels')) continue
        // `textContent` et non `innerText` : l'en-tête est masqué en mode
        // cartes, et `innerText` dépend du rendu. Une colonne d'actions n'a
        // qu'un intitulé pour lecteur d'écran (`.sr-only`) : pas d'étiquette.
        const heads = [...table.querySelectorAll('thead tr:last-child th')].map((th) => {
          const visible = th.cloneNode(true) as HTMLElement
          for (const sr of visible.querySelectorAll('.sr-only')) sr.remove()
          return (visible.textContent ?? '').replace(/\s+/g, ' ').trim()
        })
        for (const tr of table.querySelectorAll('tbody tr')) {
          let col = 0
          for (const td of tr.children) {
            const l = heads[col] ?? ''
            if (td.getAttribute('data-label') !== l) td.setAttribute('data-label', l)
            col += (td as HTMLTableCellElement).colSpan || 1
          }
        }
        fit(table)
      }
    }

    run()
    let queued = false
    const schedule = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        run()
      })
    }
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', schedule)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [])
  return null
}
