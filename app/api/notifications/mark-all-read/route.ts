import { NextRequest } from 'next/server';
import { NotificationService } from '@/lib/services/notification.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';
import { UnauthorizedError } from '@/lib/errors';

export async function POST(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const result = await NotificationService.markAllRead(user.id);
    return apiSuccess(result, 'All notifications marked as read');
  } catch (err) {
    return apiError(err);
  }
}
