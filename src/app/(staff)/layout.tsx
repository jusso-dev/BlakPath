import type { ReactNode } from 'react';

/**
 * Staff shell (RSC) — placeholder.
 *
 * A minimal accessible shell for authorised organisation staff. The
 * case-management phase fills this with tenant-scoped navigation, case lists
 * and decision workflows — all permission-checked and audit-logged, with every
 * query scoped to the signed-in staff member's organisation.
 */
export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border bg-surface border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <p className="text-lg font-semibold tracking-tight">
            <span className="text-primary">Blak</span>Path
          </p>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Cases</h1>
        {/* Populated by the case-management phase. */}
        {children}
      </main>
    </div>
  );
}
