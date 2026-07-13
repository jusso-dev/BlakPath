'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface MemberView {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: string[];
}
export interface RoleView {
  id: string;
  name: string;
}

export function MemberManagement({
  members,
  roles,
}: {
  members: MemberView[];
  roles: RoleView[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, roleId }),
      });
      if (!response.ok) {
        setMessage(
          'We could not add that person. They need to create an account first, or you may not have permission.',
        );
        return;
      }
      setEmail('');
      setMessage('Staff member added. Their access is now active.');
      router.refresh();
    } catch {
      setMessage('We could not reach the service. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function setStatus(id: string, status: 'active' | 'suspended' | 'revoked') {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/memberships/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok)
        setMessage(
          'That access change could not be made. You cannot change your own access here.',
        );
      else router.refresh();
    } catch {
      setMessage('We could not reach the service. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-muted-foreground text-sm font-medium">Organisation settings</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">People and access</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Add staff who already have an account, give them one role, or suspend access.
          Changes are recorded in the organisation audit trail.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a staff member</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={add}
            className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_16rem_auto] sm:items-end"
          >
            <div className="grid gap-2">
              <Label htmlFor="member-email">Their account email</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="member-role">Role</Label>
              <select
                id="member-role"
                value={roleId}
                onChange={(event) => setRoleId(event.target.value)}
                className="border-input bg-surface h-10 rounded-md border px-3 text-sm"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={busy || !roleId}>
              {busy ? 'Adding…' : 'Add staff member'}
            </Button>
          </form>
        </CardContent>
      </Card>
      {message ? (
        <Alert tone={message.startsWith('Staff') ? 'success' : 'destructive'}>
          {message}
        </Alert>
      ) : null}
      <section aria-labelledby="members-heading">
        <h2 id="members-heading" className="text-lg font-semibold">
          Current access
        </h2>
        <ul className="border-border divide-border mt-4 divide-y overflow-hidden rounded-lg border">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">{member.name}</p>
                <p className="text-muted-foreground text-sm">
                  {member.email} · {member.roles.join(', ') || 'No role assigned'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm capitalize">
                  {member.status}
                </span>
                {member.status === 'active' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void setStatus(member.id, 'suspended')}
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void setStatus(member.id, 'active')}
                  >
                    Restore
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy || member.status === 'revoked'}
                  onClick={() => void setStatus(member.id, 'revoked')}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
