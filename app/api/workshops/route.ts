import { NextRequest } from 'next/server';
import { WorkshopService } from '@/lib/services/workshop.service';
import { createWorkshopSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const organisationId = searchParams.get('organisationId') || undefined;

    const workshops = await WorkshopService.list({
      domain,
      status,
      search,
      organisationId,
    });

    return apiSuccess(workshops);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createWorkshopSchema.parse(body);
    const workshop = await WorkshopService.create(validated);
    return apiSuccess(workshop, 'Workshop created successfully', 201);
  } catch (err) {
    return apiError(err);
  }
}
