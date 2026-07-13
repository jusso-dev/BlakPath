import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SupportPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"
    >
      <h1 className="text-3xl font-semibold tracking-tight">Support</h1>
      <div className="text-muted-foreground mt-6 space-y-5 leading-7">
        <p>
          For a question about an application, evidence or a certificate, contact the
          organisation that is managing the matter. They are the people authorised to
          explain their process and make decisions.
        </p>
        <p>
          If you are a staff member, sign in to see your organisation’s work and
          notifications. Never send sensitive documents or personal details through an
          unverified channel.
        </p>
      </div>
      <Button asChild className="mt-7">
        <Link href="/sign-in">Staff sign in</Link>
      </Button>
    </main>
  );
}
