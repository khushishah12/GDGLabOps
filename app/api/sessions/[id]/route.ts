import { NextRequest } from 'next/server';
import { SessionService } from '@/lib/services/session.service';
import { updateLabSessionStatusSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await SessionService.getById(params.id);
    return apiSuccess(session);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = updateLabSessionStatusSchema.parse(body);
    const updated = await SessionService.updateStatus(params.id, validated);
    return apiSuccess(updated, 'Session status updated');
  } catch (err) {
    return apiError(err);
  }
}
