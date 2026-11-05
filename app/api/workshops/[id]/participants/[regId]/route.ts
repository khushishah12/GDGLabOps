import { NextRequest } from 'next/server';
import { RegistrationService } from '@/lib/services/registration.service';
import { manageParticipantSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireWorkshopOwnership } from '@/lib/auth/rbac';
import { getCurrentUser } from '@/lib/auth/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; regId: string } }
) {
  try {
    const user = await getCurrentUser();
    let organiserId = '00000000-0000-4000-8000-000000000002'; // Fallback for local mock

    if (user) {
      await requireWorkshopOwnership(params.id);
      organiserId = user.id;
    }

    const body = await req.json();
    const validated = manageParticipantSchema.parse(body);

    const updated = await RegistrationService.manageParticipant(
      params.regId,
      validated,
      organiserId
    );

    return apiSuccess(
      updated,
      `Participant registration updated to ${updated.status}`
    );
  } catch (err) {
    return apiError(err);
  }
}
