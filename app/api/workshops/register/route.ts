import { NextRequest } from 'next/server';
import { RegistrationService } from '@/lib/services/registration.service';
import { registerWorkshopSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const validated = registerWorkshopSchema.parse(body);

    const studentId = user ? user.id : validated.studentId;
    const registration = await RegistrationService.register(validated, studentId);

    return apiSuccess(registration, (registration as any).message || 'Registration processed', 201);
  } catch (err) {
    return apiError(err);
  }
}
