import { NextRequest } from 'next/server';
import { PresenceService } from '@/lib/services/presence.service';
import { getCurrentUser } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-response';
import { UnauthorizedError } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const result = await PresenceService.recordDisconnect(params.id, user.id);
    return apiSuccess(result, 'Presence disconnected');
  } catch (err) {
    return apiError(err);
  }
}
