import { NextRequest } from 'next/server';
import { WorkshopService } from '@/lib/services/workshop.service';
import { updateWorkshopSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workshop = await WorkshopService.getById(params.id);
    return apiSuccess(workshop);
  } catch (err) {
    return apiError(err);
  }
}

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
    const validated = updateWorkshopSchema.parse(body);
    const updated = await WorkshopService.update(params.id, validated);
    return apiSuccess(updated, 'Workshop updated successfully');
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (user) {
      await requireWorkshopOwnership(params.id);
    }

    await WorkshopService.delete(params.id);
    return apiSuccess(null, 'Draft workshop deleted successfully');
  } catch (err) {
    return apiError(err);
  }
}
