import { NextRequest } from 'next/server';
import { TemplateService } from '@/lib/services/template.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';
import { requireOrganiser, requireOrganisationMembership } from '@/lib/auth/rbac';

export async function POST(
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

    const published = await TemplateService.publish(params.id);
    return apiSuccess(published, 'Lab template published successfully');
  } catch (err) {
    return apiError(err);
  }
}
