import { NextRequest } from 'next/server';
import { RegistrationService } from '@/lib/services/registration.service';
import { registerWorkshopSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registerWorkshopSchema.parse(body);
    const registration = await RegistrationService.register(validated);
    return apiSuccess(registration, 'Successfully registered for workshop', 201);
  } catch (err) {
    return apiError(err);
  }
}
