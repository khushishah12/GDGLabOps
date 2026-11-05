import { NextRequest } from 'next/server';
import { ChallengeService } from '@/lib/services/challenge.service';
import { TemplateService } from '@/lib/services/template.service';
import { createChallengeSchema, reorderChallengesSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';
import { requireOrganiser, requireOrganisationMembership } from '@/lib/auth/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const isStudent = !user || user.role === 'STUDENT';
    const challenges = await ChallengeService.list(params.id, isStudent);
    return apiSuccess(challenges);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const template = await TemplateService.getById(params.id);

    if (user) {
      await requireOrganiser();
      await requireOrganisationMembership(template.organisationId);
    }

    const body = await req.json();
    body.labTemplateId = params.id;

    const validated = createChallengeSchema.parse(body);
    const challenge = await ChallengeService.create(validated);

    return apiSuccess(challenge, 'Challenge created successfully', 201);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const template = await TemplateService.getById(params.id);

    if (user) {
      await requireOrganiser();
      await requireOrganisationMembership(template.organisationId);
    }

    const body = await req.json();
    const { orderedIds } = reorderChallengesSchema.parse(body);
    const reordered = await ChallengeService.reorder(params.id, orderedIds);

    return apiSuccess(reordered, 'Challenges reordered successfully');
  } catch (err) {
    return apiError(err);
  }
}
