import { NextRequest } from 'next/server';
import { NotificationService } from '@/lib/services/notification.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';
import { UnauthorizedError } from '@/lib/errors';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const updated = await NotificationService.markRead(params.id, user.id);
    return apiSuccess(updated, 'Notification marked as read');
  } catch (err) {
    return apiError(err);
  }
}
