import { NextResponse } from 'next/server';
import { z } from 'zod';
import { finaliseReview, reopenReview } from '@/domains/reviews';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';

const mutationSchema = z.object({
  operation: z.enum(['finalise', 'reopen']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const input = mutationSchema.parse(await request.json().catch(() => null));
    const review = await withRequestTenant(() =>
      input.operation === 'finalise' ? finaliseReview(id) : reopenReview(id),
    );
    return NextResponse.json({ review });
  } catch (error) {
    return toErrorResponse(error);
  }
}
