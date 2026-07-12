import type { ReactNode } from 'react';

/**
 * Applicant shell (RSC) — placeholder.
 *
 * A minimal accessible shell for the applicant self-service area. The
 * applicant-portal phase fills this with authenticated navigation, the
 * application view and secure document sharing (tenant-scoped, permission-
 * checked and audit-logged).
 */
export default function ApplicantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border bg-surface border-b">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <p className="text-lg font-semibold tracking-tight">
            <span className="text-primary">Blak</span>Path
          </p>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Your application</h1>
        {/* Populated by the applicant-portal phase. */}
        {children}
      </main>
    </div>
  );
}
