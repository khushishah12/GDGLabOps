import { NextRequest } from 'next/server';
import { SessionService } from '@/lib/services/session.service';
import { getCurrentUser } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-response';
import { UnauthorizedError } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    const studentId = user?.id || body.studentId;

    if (!studentId) {
      return apiError(new UnauthorizedError('Unauthorized: login required to obtain terminal connection ticket'));
    }

    const ticketData = await SessionService.refreshTicket(params.id, studentId);
    return apiSuccess(ticketData, 'New connection ticket issued');
  } catch (err) {
    return apiError(err);
  }
}
