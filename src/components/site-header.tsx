import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * Public site header (RSC).
 *
 * A single primary navigation landmark with an accessible label, plus a clear
 * sign-in call to action. No client JavaScript — links only — to stay
 * low-bandwidth and resilient.
 */
function SiteHeader() {
  return (
    <header className="border-border bg-surface border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-foreground focus-visible:ring-ring rounded-sm text-lg font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <span className="text-primary">Blak</span>Path
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/organisations">Find an organisation</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/verify">Verify a certificate</Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export { SiteHeader };
