'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * "New form" control for the forms list.
 *
 * Collects a title, POSTs to `/api/forms`, and navigates to the new form's
 * editor on success so the author can start building straight away.
 */
export function NewFormButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setError('A form needs a title.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        setError('Could not create the form. Please try again.');
        return;
      }
      const { form } = (await res.json()) as { form: { id: string } };
      router.push(`/forms/${form.id}`);
    } catch {
      setError('Could not create the form. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Create a form
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-form-title" required>
          Form title
        </Label>
        <Input
          id="new-form-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled form"
          autoFocus
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Creating…' : 'Create'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm font-medium">
          {error}
        </p>
      ) : null}
    </form>
  );
}
