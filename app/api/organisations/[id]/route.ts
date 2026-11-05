import { NextRequest } from 'next/server';
import { OrganisationService } from '@/lib/services/organisation.service';
import { updateOrganisationSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const org = await OrganisationService.getById(params.id);
    return apiSuccess(org);
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
    const validated = updateOrganisationSchema.parse(body);
    const updated = await OrganisationService.update(params.id, validated);
    return apiSuccess(updated, 'Organisation updated successfully');
  } catch (err) {
    return apiError(err);
  }
}
