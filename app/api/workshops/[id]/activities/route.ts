import { NextRequest } from 'next/server';
import { ActivityService } from '@/lib/services/activity.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get('eventType') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const result = await ActivityService.list({
      workshopId: params.id,
      eventType,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
