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
      return apiError(new UnauthorizedError('Unauthorized heartbeat'));
    }

    const result = await SessionService.heartbeat(params.id, studentId);
    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
