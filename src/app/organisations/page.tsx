import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OrganisationsPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"
    >
      <h1 className="text-3xl font-semibold tracking-tight">Find an organisation</h1>
      <div className="text-muted-foreground mt-6 space-y-5 leading-7">
        <p>
          Confirmation processes are controlled by the relevant Aboriginal or Torres
          Strait Islander organisation. BlakPath does not decide which organisation is
          right for a person, and it does not make identity determinations.
        </p>
        <p>
          If you are unsure who to contact, seek guidance from a local Aboriginal
          Community Controlled Organisation or the organisation that asked you to provide
          confirmation.
        </p>
      </div>
      <Button asChild variant="outline" className="mt-7">
        <Link href="/support">Get support</Link>
      </Button>
    </main>
  );
}
