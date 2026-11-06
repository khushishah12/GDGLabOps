import { NextRequest } from 'next/server';
import { AnnouncementService } from '@/lib/services/announcement.service';
import { updateAnnouncementSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { getCurrentUser } from '@/lib/auth/session';
import { UnauthorizedError } from '@/lib/errors';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; announcementId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    await requireWorkshopOwnership(params.id);

    const body = await req.json();
    const validated = updateAnnouncementSchema.parse(body);

    if (validated.isPinned !== undefined) {
      const updated = await AnnouncementService.togglePin(
        params.announcementId,
        user.id,
        validated.isPinned
      );
      return apiSuccess(updated, 'Pin status updated');
    }

    return apiSuccess({ id: params.announcementId });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; announcementId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    await requireWorkshopOwnership(params.id);

    const archived = await AnnouncementService.archive(params.announcementId);
    return apiSuccess(archived, 'Announcement archived');
  } catch (err) {
    return apiError(err);
  }
}
