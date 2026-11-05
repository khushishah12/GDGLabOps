import { NextRequest } from 'next/server';
import { TemplateService } from '@/lib/services/template.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';
import { requireOrganiser, requireOrganisationMembership } from '@/lib/auth/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const existing = await TemplateService.getById(params.id);

    if (user) {
      await requireOrganiser();
      await requireOrganisationMembership(existing.organisationId);
    }

    const analytics = await TemplateService.getAnalytics(params.id);
    return apiSuccess(analytics);
  } catch (err) {
    return apiError(err);
  }
}
