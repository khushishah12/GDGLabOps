import { NextRequest } from 'next/server';
import { RegistrationService } from '@/lib/services/registration.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (user) {
      await requireWorkshopOwnership(params.id);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 25;

    const result = await RegistrationService.listParticipants(params.id, {
      status,
      search,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}
