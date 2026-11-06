import { NextRequest } from 'next/server';
import { PresenceService } from '@/lib/services/presence.service';
import { getCurrentUser } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-response';
import { UnauthorizedError } from '@/lib/errors';
import { presenceHeartbeatSchema } from '@/lib/validations';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const summary = await PresenceService.getWorkshopPresences(params.id);
    return apiSuccess(summary);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required to record presence');
    }

    const body = await req.json().catch(() => ({}));
    const validated = presenceHeartbeatSchema.parse(body);
    const isNewClient = req.nextUrl.searchParams.get('newClient') === 'true';

    const record = await PresenceService.recordHeartbeat({
      workshopId: params.id,
      userId: user.id,
      status: validated.status as 'ONLINE' | 'IDLE',
      isNewClient,
    });

    return apiSuccess(record);
  } catch (err) {
    return apiError(err);
  }
}
