import { NextRequest } from 'next/server';
import { ChallengeService } from '@/lib/services/challenge.service';
import { createChallengeSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const labTemplateId = searchParams.get('labTemplateId') || undefined;
    const challenges = await ChallengeService.list(labTemplateId);
    return apiSuccess(challenges);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createChallengeSchema.parse(body);
    const challenge = await ChallengeService.create(validated);
    return apiSuccess(challenge, 'Challenge created successfully', 201);
  } catch (err) {
    return apiError(err);
  }
}
