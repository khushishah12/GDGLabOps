import { NextRequest } from 'next/server';
import { SessionService } from '@/lib/services/session.service';
import { createLabSessionSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createLabSessionSchema.parse(body);
    const session = await SessionService.create(validated);
    return apiSuccess(session, 'Lab session initialized', 201);
  } catch (err) {
    return apiError(err);
  }
}
