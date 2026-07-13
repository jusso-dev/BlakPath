import { NextResponse } from 'next/server';
import { proposeDecision, type ProposeDecisionInput } from '@/domains/decisions';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const input = (await request.json()) as ProposeDecisionInput;
    const decision = await withRequestTenant(() => proposeDecision(id, input));
    return NextResponse.json({ decision }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
