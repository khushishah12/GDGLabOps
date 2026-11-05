import { NextRequest } from 'next/server';
import { RegistrationService } from '@/lib/services/registration.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const participants = await RegistrationService.listWorkshopParticipants(params.id);
    return apiSuccess(participants);
  } catch (err) {
    return apiError(err);
  }
}
