import { NextRequest } from 'next/server';
import { WorkshopLabService } from '@/lib/services/workshop-lab.service';
import { getCurrentUser } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api-response';
import prisma from '@/lib/prisma';
import { NotFoundError, ForbiddenError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: { workshopId: string; labId: string } }
) {
  try {
    const user = await getCurrentUser();
    const studentId = user ? user.id : undefined;

    // Verify workshop exists
    const workshop = await prisma.workshop.findUnique({
      where: { id: params.workshopId },
      select: {
        id: true,
        title: true,
        status: true,
        domain: true,
      },
    });

    if (!workshop) {
      throw new NotFoundError('Workshop not found');
    }

    // If user is logged in as student, verify registration
    if (user && user.role === 'STUDENT') {
      const registration = await prisma.workshopRegistration.findFirst({
        where: {
          workshopId: params.workshopId,
          studentId: user.id,
        },
      });

      if (!registration || registration.status === 'CANCELLED' || registration.status === 'REJECTED') {
        throw new ForbiddenError('You must be registered for this workshop to access its lab materials.');
      }
    }

    const lab = await WorkshopLabService.getWorkshopLab(params.workshopId, params.labId, studentId);

    // Fetch student's overall progress for this workshop
    let studentProgress = null;
    if (studentId) {
      studentProgress = await prisma.studentProgress.findFirst({
        where: {
          studentId,
          workshopId: params.workshopId,
          labTemplateId: params.labId,
        },
      });
    }

    return apiSuccess({
      workshop,
      lab,
      studentProgress,
    });
  } catch (err) {
    return apiError(err);
  }
}
