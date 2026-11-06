import { NextRequest } from 'next/server';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireWorkshopOwnership(params.id);
    const data = await AnalyticsService.getWorkshopPerformanceAnalytics(params.id);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}
