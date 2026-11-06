import { NextRequest } from 'next/server';
import { RealtimeEventService } from '@/lib/services/realtime-event.service';
import { getCurrentUser } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since') || new Date(Date.now() - 3600000).toISOString();

    const missedEvents = await RealtimeEventService.getMissedEvents(
      params.id,
      since,
      user?.id
    );

    return apiSuccess({
      workshopId: params.id,
      since,
      events: missedEvents,
      count: missedEvents.length,
    });
  } catch (err) {
    return apiError(err);
  }
}
