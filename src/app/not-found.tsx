import { Button } from '@hearst/ui/catalyst/button'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-(--ds-surface) px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-[0.8125rem]/5 text-(--ds-accent) tabular-nums">404</p>
        <h1 className="mt-2 text-2xl/7.5 tracking-[-0.025em] text-balance text-(--ds-text)">
          Page not found
        </h1>
        <p className="mt-2 text-sm/5 text-pretty text-(--ds-text-subtle)">
          This address does not match any Hearst Connect page.
        </p>
        <div className="mt-8 flex items-center justify-center gap-x-4">
          <Button color="accent" href="/">
            Back to home
          </Button>
          <Button plain href="/login">
            Open the console <span aria-hidden="true">→</span>
          </Button>
        </div>
      </div>
    </main>
  )
}
