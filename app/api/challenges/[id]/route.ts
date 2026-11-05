import { NextRequest } from 'next/server';
import { ChallengeService } from '@/lib/services/challenge.service';
import { TemplateService } from '@/lib/services/template.service';
import { updateChallengeSchema } from '@/lib/validations';
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

    if (isStudent) {
      const sanitized = await ChallengeService.getStudentView(params.id);
      return apiSuccess(sanitized);
    }

    const challenge = await ChallengeService.getById(params.id);
    return apiSuccess(challenge);
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
    const existing = await ChallengeService.getById(params.id);
    const template = await TemplateService.getById(existing.labTemplateId);

    if (user) {
      await requireOrganiser();
      await requireOrganisationMembership(template.organisationId);
    }

    const body = await req.json();
    const validated = updateChallengeSchema.parse(body);
    const updated = await ChallengeService.update(params.id, validated);

    return apiSuccess(updated, 'Challenge updated successfully');
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const existing = await ChallengeService.getById(params.id);
    const template = await TemplateService.getById(existing.labTemplateId);

    if (user) {
      await requireOrganiser();
      await requireOrganisationMembership(template.organisationId);
    }

    const deleted = await ChallengeService.delete(params.id);
    return apiSuccess(deleted, 'Challenge deleted successfully');
  } catch (err) {
    return apiError(err);
  }
}
