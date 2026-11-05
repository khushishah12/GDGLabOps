import prisma from '@/lib/prisma';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ResourceExhaustedError,
} from '@/lib/errors';
import { z } from 'zod';
import { registerWorkshopSchema } from '@/lib/validations';

export class RegistrationService {
  static async register(data: z.infer<typeof registerWorkshopSchema>) {
    // 1. Locate workshop by either ID or Event Code
    const workshop = data.workshopId
      ? await prisma.workshop.findUnique({
          where: { id: data.workshopId },
          include: { _count: { select: { registrations: true } } },
        })
      : await prisma.workshop.findUnique({
          where: { registrationCode: data.registrationCode!.toUpperCase() },
          include: { _count: { select: { registrations: true } } },
        });

    if (!workshop) {
      throw new NotFoundError(
        data.workshopId
          ? `Workshop with ID "${data.workshopId}" not found`
          : `Invalid event code "${data.registrationCode}"`
      );
    }

    // 2. Business Rule: Students cannot register for draft or cancelled workshops
    if (workshop.status !== 'PUBLISHED' && workshop.status !== 'ONGOING') {
      throw new ConflictError(
        `Workshop is not open for registration (Current status: ${workshop.status})`
      );
    }

    // 3. Business Rule: Students cannot register after the deadline
    const now = new Date();
    if (now > workshop.registrationDeadline) {
      throw new ConflictError('Registration for this workshop has closed (Deadline exceeded)');
    }

    // 4. Verify Student user exists
    const student = await prisma.user.findUnique({
      where: { id: data.studentId },
    });
    if (!student) {
      throw new NotFoundError(`Student with ID "${data.studentId}" not found`);
    }

    // 5. Execute registration atomically inside a transaction with lock-safety
    return prisma.$transaction(async (tx) => {
      // Check for existing duplicate registration
      const existing = await tx.workshopRegistration.findUnique({
        where: {
          unique_workshop_student_registration: {
            workshopId: workshop.id,
            studentId: data.studentId,
          },
        },
      });

      if (existing) {
        if (existing.status === 'CANCELLED') {
          // Re-activate cancelled registration
          return tx.workshopRegistration.update({
            where: { id: existing.id },
            data: { status: 'REGISTERED', registeredAt: new Date() },
          });
        }
        throw new ConflictError('Student is already registered for this workshop');
      }

      // Check current registration count against participant limit
      const currentCount = await tx.workshopRegistration.count({
        where: {
          workshopId: workshop.id,
          status: 'REGISTERED',
        },
      });

      if (currentCount >= workshop.participantLimit) {
        throw new ResourceExhaustedError(
          `Workshop capacity reached (${workshop.participantLimit} attendees limit)`
        );
      }

      // Create new registration record
      return tx.workshopRegistration.create({
        data: {
          workshopId: workshop.id,
          studentId: data.studentId,
          status: 'REGISTERED',
          attendanceStatus: 'ABSENT',
        },
        include: {
          workshop: {
            select: { id: true, title: true, domain: true, startDate: true },
          },
        },
      });
    });
  }

  static async cancel(workshopId: string, studentId: string) {
    const registration = await prisma.workshopRegistration.findUnique({
      where: {
        unique_workshop_student_registration: {
          workshopId,
          studentId,
        },
      },
    });

    if (!registration) {
      throw new NotFoundError('No active registration found for this student and workshop');
    }

    return prisma.workshopRegistration.update({
      where: { id: registration.id },
      data: { status: 'CANCELLED' },
    });
  }

  static async listWorkshopParticipants(workshopId: string) {
    const workshop = await prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop) {
      throw new NotFoundError(`Workshop with ID "${workshopId}" not found`);
    }

    return prisma.workshopRegistration.findMany({
      where: { workshopId },
      orderBy: { registeredAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  static async getStudentRegistrations(studentId: string) {
    return prisma.workshopRegistration.findMany({
      where: { studentId },
      orderBy: { registeredAt: 'desc' },
      include: {
        workshop: {
          include: {
            organisation: { select: { name: true, slug: true } },
            workshopLabs: {
              include: { labTemplate: true },
            },
          },
        },
      },
    });
  }
}
