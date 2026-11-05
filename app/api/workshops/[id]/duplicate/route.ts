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
    let organiserId = '00000000-0000-4000-8000-000000000002'; // Fallback for local mock

    if (user) {
      await requireWorkshopOwnership(params.id);
      organiserId = user.id;
    }

    const duplicated = await WorkshopService.duplicate(params.id, organiserId);
    return apiSuccess(duplicated, 'Workshop duplicated successfully', 201);
  } catch (err) {
    return apiError(err);
  }
}
