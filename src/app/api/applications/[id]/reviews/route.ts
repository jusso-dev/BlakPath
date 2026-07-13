import { NextResponse } from 'next/server';
import { createReview, type CreateReviewInput } from '@/domains/reviews';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const input = (await request.json()) as CreateReviewInput;
    const review = await withRequestTenant(() => createReview(id, input));
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
