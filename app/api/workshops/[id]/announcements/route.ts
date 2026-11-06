import { NextRequest } from 'next/server';
import { AnnouncementService } from '@/lib/services/announcement.service';
import { createAnnouncementSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { getCurrentUser } from '@/lib/auth/session';
import { UnauthorizedError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const result = await AnnouncementService.list(params.id, { page, limit });
    return apiSuccess(result);
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
      throw new UnauthorizedError('Authentication required');
    }

    await requireWorkshopOwnership(params.id);

    const body = await req.json();
    const validated = createAnnouncementSchema.parse(body);

    const announcement = await AnnouncementService.create({
      workshopId: params.id,
      organiserId: user.id,
      title: validated.title,
      message: validated.message,
      priority: validated.priority,
      isPinned: validated.isPinned,
      targetGroup: validated.targetGroup,
      scheduledAt: validated.scheduledAt,
    });

    return apiSuccess(announcement, 'Announcement broadcast successfully', 201);
  } catch (err) {
    return apiError(err);
  }
}
