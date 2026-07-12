import {
  Accessibility,
  Building2,
  FileCheck2,
  Lock,
  MapPin,
  ShieldCheck,
  Users,
  UserSquare2,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const TAGLINE = 'Community-controlled confirmation, with a clearer path for everyone.';

const DESCRIPTION =
  'BlakPath is a secure, community-controlled case-management and evidence ' +
  'platform for authorised Aboriginal and Torres Strait Islander organisations ' +
  'administering Confirmation of Aboriginality applications.';

export const metadata: Metadata = {
  title: 'BlakPath — community-controlled confirmation',
  description: DESCRIPTION,
};

/** A labelled content section with a heading wired for screen-reader navigation. */
function Section({
  id,
  title,
  lead,
  children,
  muted = false,
}: {
  id: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={muted ? 'bg-surface-muted' : undefined}
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <h2
          id={`${id}-heading`}
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {title}
        </h2>
        {lead ? (
          <p className="text-muted-foreground mt-3 max-w-3xl text-lg">{lead}</p>
        ) : null}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-heading" className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            BlakPath
          </p>
          <h1
            id="hero-heading"
            className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl"
          >
            {TAGLINE}
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl text-lg">{DESCRIPTION}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild variant="primary" size="lg">
              <Link href="/sign-in">Sign in to your organisation</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/organisations">Find an organisation</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/verify">Verify a certificate</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Community authority statement — the product's most important boundary. */}
      <section aria-labelledby="authority-heading" className="bg-charcoal text-off-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="flex flex-col gap-4">
            <ShieldCheck className="text-desert-gold size-8" aria-hidden="true" />
            <h2
              id="authority-heading"
              className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              The software facilitates. Community decides.
            </h2>
            <p className="text-off-white-warm max-w-3xl text-lg">
              BlakPath never determines a person&rsquo;s Aboriginality. It does not score,
              rank, predict, infer, auto-approve or auto-reject. Every decision rests with
              authorised people in the community organisation. The platform&rsquo;s job is
              to keep the work organised, the evidence safe, and the process clear and
              respectful for everyone involved.
            </p>
          </div>
        </div>
      </section>

      {/* What it is */}
      <Section
        id="what"
        title="What BlakPath is"
        lead="A calm, secure home for the case work behind Confirmation of Aboriginality — built around the authority of community organisations."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Lock className="text-primary size-6" aria-hidden="true" />
              <CardTitle>Secure by design</CardTitle>
              <CardDescription>
                Strict separation between organisations, permission checks on every
                sensitive action, and a full audit trail. Your data stays in Australia.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <FileCheck2 className="text-primary size-6" aria-hidden="true" />
              <CardTitle>Evidence handled with care</CardTitle>
              <CardDescription>
                Supporting documents are stored safely and shared only with the people who
                need them, for as long as they need them.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Users className="text-primary size-6" aria-hidden="true" />
              <CardTitle>Community-controlled</CardTitle>
              <CardDescription>
                Only authorised organisations administer applications, using their own
                processes. BlakPath supports those processes — it does not replace human
                judgement.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Section>

      {/* For organisations */}
      <Section
        id="organisations"
        title="For organisations"
        muted
        lead="Reduce the administrative load so your people can focus on their community and their process."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex gap-4">
            <Building2 className="text-primary size-6 shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-lg font-semibold">Manage cases in one place</h3>
              <p className="text-muted-foreground mt-1">
                Track applications from first contact to a signed outcome, with clear
                status, tasks and a complete history — visible only to your organisation.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <ShieldCheck className="text-primary size-6 shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-lg font-semibold">Accountable, not automated</h3>
              <p className="text-muted-foreground mt-1">
                Roles and permissions reflect how your organisation already works. Every
                action is recorded, so decisions stay transparent and firmly in human
                hands.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* For applicants */}
      <Section
        id="applicants"
        title="For applicants"
        lead="A clearer, calmer path — with respect for you and your family at every step."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex gap-4">
            <UserSquare2 className="text-primary size-6 shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-lg font-semibold">Know where things are up to</h3>
              <p className="text-muted-foreground mt-1">
                Share your information securely with the organisation you&rsquo;re
                applying through, and see clear updates on your application in plain
                language.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <MapPin className="text-primary size-6 shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-lg font-semibold">Start with an organisation</h3>
              <p className="text-muted-foreground mt-1">
                Applications are administered by authorised community organisations. Find
                one to begin, or verify an existing certificate.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild variant="secondary" size="sm">
                  <Link href="/organisations">Find an organisation</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/verify">Verify a certificate</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Accessibility + privacy */}
      <Section
        id="trust"
        title="Accessibility &amp; privacy"
        muted
        lead="Built to be usable and respectful for everyone, and to keep sensitive information safe."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex gap-4">
            <Accessibility className="text-primary size-6 shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-lg font-semibold">Accessible to everyone</h3>
              <p className="text-muted-foreground mt-1">
                BlakPath aims to meet WCAG 2.2 AA: keyboard-friendly, readable contrast,
                clear focus, and content that works well on slower connections and older
                devices. Read our{' '}
                <Link
                  href="/accessibility"
                  className="text-primary font-medium underline underline-offset-4"
                >
                  accessibility statement
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Lock className="text-primary size-6 shrink-0" aria-hidden="true" />
            <div>
              <h3 className="text-lg font-semibold">Your information, protected</h3>
              <p className="text-muted-foreground mt-1">
                Data is stored in Australia and access is tightly controlled. See how we
                handle personal information in our{' '}
                <Link
                  href="/privacy"
                  className="text-primary font-medium underline underline-offset-4"
                >
                  privacy notice
                </Link>
                , or{' '}
                <Link
                  href="/support"
                  className="text-primary font-medium underline underline-offset-4"
                >
                  contact support
                </Link>{' '}
                for help.
              </p>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
