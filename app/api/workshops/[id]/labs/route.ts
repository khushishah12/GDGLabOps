import { NextRequest } from 'next/server';
import { WorkshopLabService } from '@/lib/services/workshop-lab.service';
import { WorkshopService } from '@/lib/services/workshop.service';
import { attachWorkshopLabSchema, reorderWorkshopLabsSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';
import { requireOrganiser, requireOrganisationMembership } from '@/lib/auth/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const studentId = user && user.role === 'STUDENT' ? user.id : undefined;

    const labs = await WorkshopLabService.listForWorkshop(params.id, studentId);
    return apiSuccess(labs);
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
    const workshop = await WorkshopService.getById(params.id);

    if (user) {
      await requireOrganiser();
      await requireOrganisationMembership(workshop.organisationId);
    }

    const body = await req.json();
    body.workshopId = params.id;

    const validated = attachWorkshopLabSchema.parse(body);
    const attached = await WorkshopLabService.attach(validated);

    return apiSuccess(attached, 'Lab template attached to workshop successfully', 201);
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
    const workshop = await WorkshopService.getById(params.id);

    if (user) {
      await requireOrganiser();
      await requireOrganisationMembership(workshop.organisationId);
    }

    const body = await req.json();
    const { orderedTemplateIds } = reorderWorkshopLabsSchema.parse(body);
    const reordered = await WorkshopLabService.reorder(params.id, orderedTemplateIds);

    return apiSuccess(reordered, 'Workshop labs reordered successfully');
  } catch (err) {
    return apiError(err);
  }
}
