import {
  CertificatePanel,
  type PanelCertificate,
  type PanelDecision,
} from '@/components/certificates/certificate-panel';
import { withRequestTenant } from '@/lib/http/tenant-route';
import { getApplication } from '@/domains/applications';
import { listDecisions } from '@/domains/decisions';
import { listCertificates } from '@/domains/certificates';

/**
 * Application detail (RSC).
 *
 * A minimal case view: the application summary, its committee decisions, and the
 * certificate panel. Loaded inside a DB-verified tenant context; the read is
 * permission-checked and audited by `getApplication`. A fuller case view (intake,
 * evidence, reviews, meetings) is future work — this page currently anchors the
 * Phase 6 certificate flow.
 */
interface LoadedData {
  reference: string;
  applicantName: string;
  status: string;
  decisions: PanelDecision[];
  certificates: PanelCertificate[];
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: LoadedData | null = null;
  try {
    data = await withRequestTenant(async () => {
      const { application } = await getApplication(id);
      const decisions = await listDecisions(id);
      const certificates = await listCertificates(id);
      return {
        reference: application.reference,
        applicantName: application.applicantName,
        status: application.status,
        decisions: decisions.map((d) => ({
          id: d.id,
          proposedOutcome: d.proposedOutcome,
          finalOutcome: d.finalOutcome,
          status: d.status,
        })),
        certificates: certificates.map((c) => ({
          id: c.id,
          reference: c.reference,
          status: c.status,
          decisionId: c.decisionId,
          revokedReason: c.revokedReason,
        })),
      };
    });
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-muted-foreground">
          Sign in and select your organisation to view this application, or you may not
          have access to it.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{data.reference}</h1>
        <p className="text-muted-foreground mt-1">
          {data.applicantName} · {data.status.replace(/_/g, ' ')}
        </p>
      </header>

      <section aria-label="Decisions" className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Committee decisions</h2>
        {data.decisions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No decisions recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {data.decisions.map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <span>Proposed: {d.proposedOutcome.replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground">
                  {d.status}
                  {d.finalOutcome ? ` · ${d.finalOutcome.replace(/_/g, ' ')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CertificatePanel
        applicationId={id}
        decisions={data.decisions}
        certificates={data.certificates}
      />
    </div>
  );
}
