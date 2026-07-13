'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function VerificationForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = code.trim();
    if (clean) router.push(`/verify/${encodeURIComponent(clean)}`);
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="grid flex-1 gap-2">
        <Label htmlFor="verification-code">Certificate code</Label>
        <Input
          id="verification-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          required
        />
      </div>
      <Button type="submit">Verify certificate</Button>
    </form>
  );
}
