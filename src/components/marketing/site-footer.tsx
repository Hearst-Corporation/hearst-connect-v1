export function SiteFooter() {
  return (
    <footer className="bg-white dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl border-t border-zinc-900/10 px-6 py-8 dark:border-white/10">
        <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">
          © {new Date().getFullYear()} Hearst Corporation. Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}
