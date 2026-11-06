import { NextRequest } from 'next/server';
import { requireOrganiser } from '@/lib/auth/rbac';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    await requireOrganiser();
    const url = new URL(req.url);
    const organisationId = url.searchParams.get('organisationId') || undefined;
    const workshopId = url.searchParams.get('workshopId') || undefined;
    const domain = url.searchParams.get('domain') || undefined;
    const difficulty = url.searchParams.get('difficulty') || undefined;
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    const data = await AnalyticsService.getOrganiserAnalytics({
      organisationId,
      workshopId,
      domain,
      difficulty,
      startDate,
      endDate,
    });

    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}
