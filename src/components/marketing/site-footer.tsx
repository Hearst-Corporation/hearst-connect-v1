export function SiteFooter() {
  return (
    <footer className="bg-console-app">
      <div className="mx-auto max-w-7xl border-t border-console-line px-6 py-8">
        <p className="text-sm/6 text-white/50">
          © {new Date().getFullYear()} Hearst Corporation. Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}
