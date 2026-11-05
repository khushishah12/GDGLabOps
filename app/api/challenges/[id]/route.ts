import { NextRequest } from 'next/server';
import { ChallengeService } from '@/lib/services/challenge.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const challenge = await ChallengeService.getById(params.id);
    return apiSuccess(challenge);
  } catch (err) {
    return apiError(err);
  }
}
