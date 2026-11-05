import { NextRequest } from 'next/server';
import { WorkshopService } from '@/lib/services/workshop.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { getCurrentUser } from '@/lib/auth/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (user) {
      await requireWorkshopOwnership(params.id);
    }

    const body = await req.json();
    const enabled = Boolean(body.enabled);
    const updated = await WorkshopService.toggleCodeJoin(params.id, enabled);

    return apiSuccess(
      updated,
      enabled ? 'Code-based joining enabled' : 'Code-based joining disabled'
    );
  } catch (err) {
    return apiError(err);
  }
}
