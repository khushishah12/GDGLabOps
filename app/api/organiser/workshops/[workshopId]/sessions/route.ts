import { NextRequest } from 'next/server';
import { SessionService } from '@/lib/services/session.service';
import { requireOrganiser } from '@/lib/auth/rbac';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { workshopId: string } }
) {
  try {
    const user = await requireOrganiser();
    const sessions = await SessionService.getWorkshopSessions(params.workshopId, user.id);
    return apiSuccess(sessions);
  } catch (err) {
    return apiError(err);
  }
}
