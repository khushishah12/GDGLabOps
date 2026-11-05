import { NextRequest } from 'next/server';
import { ChallengeService } from '@/lib/services/challenge.service';
import { createChallengeTaskSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = createChallengeTaskSchema.parse({
      ...body,
      challengeId: params.id,
    });
    const task = await ChallengeService.createTask(validated);
    return apiSuccess(task, 'Challenge task created successfully', 201);
  } catch (err) {
    return apiError(err);
  }
}
