import { NextRequest } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth/rbac';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const data = await AnalyticsService.getStudentLearningAnalytics(user.id);
    return apiSuccess(data);
  } catch (err) {
    return apiError(err);
  }
}
