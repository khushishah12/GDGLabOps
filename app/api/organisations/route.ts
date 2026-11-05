import { NextRequest } from 'next/server';
import { OrganisationService } from '@/lib/services/organisation.service';
import { createOrganisationSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const orgs = await OrganisationService.list();
    return apiSuccess(orgs);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createOrganisationSchema.parse(body);
    const org = await OrganisationService.create(validated);
    return apiSuccess(org, 'Organisation created successfully', 201);
  } catch (err) {
    return apiError(err);
  }
}
