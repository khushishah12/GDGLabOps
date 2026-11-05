import { NextRequest } from 'next/server';
import { WorkshopService } from '@/lib/services/workshop.service';
import { createWorkshopSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireOrganiser, requireOrganisationMembership } from '@/lib/auth/rbac';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain') || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;
    const venueType = searchParams.get('venueType') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const organisationId = searchParams.get('organisationId') || undefined;
    const isPublicParam = searchParams.get('isPublic');
    const isPublic = isPublicParam !== null ? isPublicParam === 'true' : undefined;
    const upcomingOnly = searchParams.get('upcomingOnly') === 'true';
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const result = await WorkshopService.list({
      domain,
      difficulty,
      venueType,
      status,
      search,
      organisationId,
      isPublic,
      upcomingOnly,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const validated = createWorkshopSchema.parse(body);

    // Verify authenticated organiser privileges and organisation membership (IDOR defense)
    if (user) {
      await requireOrganiser();
      await requireOrganisationMembership(validated.organisationId);
    }

    const organiserId = user ? user.id : validated.organiserId;
    const workshop = await WorkshopService.create(validated, organiserId);

    return apiSuccess(workshop, 'Workshop created successfully', 201);
  } catch (err) {
    return apiError(err);
  }
}
