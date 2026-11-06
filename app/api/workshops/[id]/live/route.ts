import { NextRequest } from 'next/server';
import { MonitoringService } from '@/lib/services/monitoring.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { getCurrentUser } from '@/lib/auth/session';
import { UnauthorizedError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    await requireWorkshopOwnership(params.id);

    const summary = await MonitoringService.getWorkshopLiveSummary(params.id, user.id);
    return apiSuccess(summary);
  } catch (err) {
    return apiError(err);
  }
}
