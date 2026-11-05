import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const [
      totalWorkshops,
      publishedWorkshops,
      totalRegistrations,
      confirmedRegistrations,
      waitlistedRegistrations,
      pendingRegistrations,
      totalStudents,
      recentWorkshops,
      recentRegistrations,
    ] = await Promise.all([
      prisma.workshop.count(),
      prisma.workshop.count({ where: { status: 'PUBLISHED' } }),
      prisma.workshopRegistration.count(),
      prisma.workshopRegistration.count({ where: { status: 'REGISTERED' } }),
      prisma.workshopRegistration.count({ where: { status: 'WAITLISTED' } }),
      prisma.workshopRegistration.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.workshop.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          organisation: { select: { name: true } },
          _count: {
            select: {
              registrations: { where: { status: 'REGISTERED' } },
            },
          },
        },
      }),
      prisma.workshopRegistration.findMany({
        take: 6,
        orderBy: { registeredAt: 'desc' },
        include: {
          student: { select: { id: true, name: true, email: true, avatar: true } },
          workshop: { select: { id: true, title: true, registrationCode: true } },
        },
      }),
    ]);

    return apiSuccess({
      totalWorkshops,
      publishedWorkshops,
      totalRegistrations,
      confirmedRegistrations,
      waitlistedRegistrations,
      pendingRegistrations,
      totalStudents,
      recentWorkshops,
      recentRegistrations,
    });
  } catch (err) {
    return apiError(err);
  }
}
