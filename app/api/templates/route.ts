import { NextRequest } from 'next/server';
import { TemplateService } from '@/lib/services/template.service';
import { createLabTemplateSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';
import { requireOrganiser, requireOrganisationMembership } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain') || undefined;
    const difficulty = (searchParams.get('difficulty') as any) || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const organisationId = searchParams.get('organisationId') || undefined;
    const search = searchParams.get('search') || undefined;

    const templates = await TemplateService.list({
      domain,
      difficulty,
      status,
      organisationId,
      search,
    });
    return apiSuccess(templates);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    // Default organisationId and createdBy from current user if omitted
    if (user && !body.createdBy) {
      body.createdBy = user.id;
    }
    if (user && !body.organisationId && user.memberships?.length > 0) {
      body.organisationId = user.memberships[0].organisationId;
    }

    const validated = createLabTemplateSchema.parse(body);

    if (user) {
      await requireOrganiser();
      await requireOrganisationMembership(validated.organisationId);
    }

    const template = await TemplateService.create(validated);
    return apiSuccess(template, 'Lab template created successfully', 201);
  } catch (err) {
    return apiError(err);
  }
}
