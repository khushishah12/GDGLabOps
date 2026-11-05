import { NextRequest } from 'next/server';
import { WorkshopService } from '@/lib/services/workshop.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (user) {
      await requireWorkshopOwnership(params.id);
    }

    const workshop = await WorkshopService.unpublish(params.id);
    return apiSuccess(workshop, 'Workshop reverted to draft');
  } catch (err) {
    return apiError(err);
  }
}
