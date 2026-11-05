import { NextRequest } from 'next/server';
import { SessionService } from '@/lib/services/session.service';
import { requireOrganiser } from '@/lib/auth/rbac';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireOrganiser();
    const terminated = await SessionService.terminateSession(
      params.sessionId,
      'ADMIN_TERMINATED',
      user.id
    );
    return apiSuccess(terminated, 'Lab session forcefully terminated by organiser');
  } catch (err) {
    return apiError(err);
  }
}
