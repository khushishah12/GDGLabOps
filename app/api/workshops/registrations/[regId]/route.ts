import { NextRequest } from 'next/server';
import { RegistrationService } from '@/lib/services/registration.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAuthenticatedUser } from '@/lib/auth/rbac';
import { getCurrentUser } from '@/lib/auth/session';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { regId: string } }
) {
  try {
    const user = await getCurrentUser();
    let studentId = '00000000-0000-4000-8000-000000000003'; // Fallback for local mock

    if (user) {
      await requireAuthenticatedUser();
      studentId = user.id;
    }

    const cancelled = await RegistrationService.cancelOwnRegistration(
      params.regId,
      studentId
    );

    return apiSuccess(cancelled, 'Workshop registration cancelled successfully.');
  } catch (err) {
    return apiError(err);
  }
}
