'use client'

import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { THEME_STORAGE_KEY, type Theme } from '@/lib/theme'

/**
 * Jour / nuit. Le fond blanc est la version principale ; la nuit reprend le
 * même écran en noir et gris. Le choix est gardé dans le navigateur.
 */
export function ThemeToggle({ className = '' }: Readonly<{ className?: string }>) {
  const [theme, setTheme] = useState<Theme>('light')
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  }, [])
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      aria-label={next === 'dark' ? 'Switch to night mode' : 'Switch to day mode'}
      title={next === 'dark' ? 'Night mode' : 'Day mode'}
      onClick={() => {
        document.documentElement.dataset.theme = next
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next)
        } catch {
          /* Navigation privée : le thème vaut pour la session. */
        }
        setTheme(next)
      }}
    >
      {theme === 'dark' ? <SunIcon className="size-4" aria-hidden="true" /> : <MoonIcon className="size-4" aria-hidden="true" />}
    </button>
  )
}
