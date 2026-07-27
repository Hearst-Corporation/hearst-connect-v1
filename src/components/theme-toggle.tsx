'use client'

import { toggleTheme } from '@/lib/theme'
import { MoonIcon, SunIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'

/**
 * Bouton de bascule clair / sombre.
 *
 * Les deux icônes sont rendues et l'affichage se joue en CSS (`dark:`) : le
 * serveur n'a donc rien à deviner du thème du visiteur, et il n'y a aucun
 * écart d'hydratation à corriger.
 */
export function ThemeToggle({ className, ...props }: Readonly<React.ComponentPropsWithoutRef<'button'>>) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Basculer entre le thème clair et le thème sombre"
      title="Changer de thème"
      {...props}
      className={clsx(
        className,
        'inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition',
        'hover:bg-zinc-950/5 hover:text-zinc-950',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
        'dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white',
      )}
    >
      <MoonIcon aria-hidden="true" className="size-5 dark:hidden" />
      <SunIcon aria-hidden="true" className="hidden size-5 dark:block" />
    </button>
  )
}
