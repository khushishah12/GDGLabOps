import { NextRequest } from 'next/server';
import { SessionService } from '@/lib/services/session.service';
import { getCurrentUser } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const reset = await SessionService.resetSession(params.id, user?.id);
    return apiSuccess(reset, 'Lab environment reset successfully with clean container workspace');
  } catch (err) {
    return apiError(err);
  }
}
