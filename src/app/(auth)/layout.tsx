import type { ReactNode } from 'react';

/**
 * Auth shell (RSC) — placeholder.
 *
 * A minimal, centred, accessible shell for sign-in / sign-up / password flows.
 * The <main> landmark is the skip-link target. The authentication phase fills
 * this with the actual Better Auth flows and forms.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface-muted flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <main
        id="main-content"
        tabIndex={-1}
        className="border-border bg-surface w-full max-w-md rounded-xl border p-6 shadow-md sm:p-8"
      >
        <h1 className="text-xl font-semibold tracking-tight">
          <span className="text-primary">Blak</span>Path
        </h1>
        {/* Populated by the authentication phase. */}
        {children}
      </main>
    </div>
  );
}
