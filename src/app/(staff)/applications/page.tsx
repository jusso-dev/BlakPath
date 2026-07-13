import {
  ApplicationRegister,
  type RegisterApplication,
} from '@/components/applications/application-register';
import { listApplications } from '@/domains/applications';
import { withRequestTenant } from '@/lib/http/tenant-route';

export default async function ApplicationsPage() {
  let applications: RegisterApplication[] = [];
  let unavailable = false;
  try {
    const result = await withRequestTenant(() => listApplications({ limit: 100 }));
    applications = result.items.map((application) => ({
      id: application.id,
      reference: application.reference,
      applicantName: application.applicantName,
      status: application.status,
      priority: application.priority,
      createdAt: application.createdAt.toISOString(),
    }));
  } catch {
    unavailable = true;
  }

  if (unavailable) {
    return (
      <p className="text-muted-foreground mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        Sign in and select an organisation to view applications.
      </p>
    );
  }
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <ApplicationRegister applications={applications} />
    </div>
  );
}
