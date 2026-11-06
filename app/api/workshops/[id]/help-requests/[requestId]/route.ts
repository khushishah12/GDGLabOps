import { NextRequest } from 'next/server';
import { HelpRequestService } from '@/lib/services/help-request.service';
import { updateHelpRequestStatusSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth/session';
import { UnauthorizedError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; requestId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

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

    const helpRequest = await HelpRequestService.getById(
      params.requestId,
      user.id,
      Boolean(isOrganiser)
    );

    return apiSuccess(helpRequest);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; requestId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

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

    const body = await req.json();
    const validated = updateHelpRequestStatusSchema.parse(body);

    const updated = await HelpRequestService.updateStatus({
      helpRequestId: params.requestId,
      userId: user.id,
      isOrganiser: Boolean(isOrganiser),
      status: validated.status,
      assignedOrganiserId: validated.assignedOrganiserId,
      resolutionNotes: validated.resolutionNotes,
    });

    return apiSuccess(updated, 'Help request status updated');
  } catch (err) {
    return apiError(err);
  }
}
