import { NextRequest } from 'next/server';
import { HelpRequestService } from '@/lib/services/help-request.service';
import { createHelpRequestSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';
import { UnauthorizedError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { HelpRequestCategory, HelpRequestStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') as HelpRequestStatus | 'ALL') || 'ALL';
    const category = (searchParams.get('category') as HelpRequestCategory | 'ALL') || 'ALL';
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    // Check if user is organiser of the workshop
    const workshop = await prisma.workshop.findUnique({
      where: { id: params.id },
      include: {
        organisation: {
          include: {
            members: { where: { userId: user.id } },
          },
        },
      },
    });

    const isOrganiser =
      user.role === 'SUPER_ADMIN' ||
      workshop?.organiserId === user.id ||
      (workshop?.organisation.members && workshop.organisation.members.length > 0);

    const result = await HelpRequestService.list({
      workshopId: params.id,
      userId: user.id,
      userRole: user.role,
      isOrganiser: Boolean(isOrganiser),
      status,
      category,
      page,
      limit,
    });

    return apiSuccess(result);
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
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const body = await req.json();
    const validated = createHelpRequestSchema.parse(body);

    const request = await HelpRequestService.create({
      workshopId: params.id,
      studentId: user.id,
      category: validated.category,
      description: validated.description,
      labTemplateId: validated.labTemplateId,
      challengeId: validated.challengeId,
    });

    return apiSuccess(request, 'Help request submitted to organisers', 201);
  } catch (err) {
    return apiError(err);
  }
}
