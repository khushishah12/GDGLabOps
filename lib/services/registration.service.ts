import prisma from '@/lib/prisma';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
  ResourceExhaustedError,
} from '@/lib/errors';
import { z } from 'zod';
import { registerWorkshopSchema, manageParticipantSchema } from '@/lib/validations';
import { evaluateRegistrationEligibility } from '@/lib/workshop/lifecycle';
import { RegistrationStatus, AttendanceStatus } from '@prisma/client';

export class RegistrationService {
  /**
   * Atomic, lock-safe student workshop registration (supports both direct and code joining)
   */
  static async register(data: z.infer<typeof registerWorkshopSchema>, authenticatedStudentId?: string) {
    const finalStudentId = authenticatedStudentId || data.studentId;
    if (!finalStudentId) {
      throw new ValidationError('Student identity is required for registration.');
    }

    if (!data.workshopId && !data.registrationCode) {
      throw new ValidationError('Either workshopId or registrationCode must be provided.');
    }

    // 1. Locate workshop by ID or unique registration code
    const workshop = data.workshopId
      ? await prisma.workshop.findUnique({
          where: { id: data.workshopId },
        })
      : await prisma.workshop.findUnique({
          where: { registrationCode: data.registrationCode!.toUpperCase().trim() },
        });

    if (!workshop) {
      throw new NotFoundError(
        data.workshopId
          ? `Workshop with ID "${data.workshopId}" not found`
          : `Invalid invitation code "${data.registrationCode}"`
      );
    }

    // 2. If code joining was used, verify code joining is enabled
    if (data.registrationCode && !workshop.codeJoinEnabled) {
      throw new ForbiddenError('Code-based registration is currently disabled for this workshop.');
    }

    // 3. Verify student exists and is active
    const student = await prisma.user.findUnique({
      where: { id: finalStudentId },
      select: { id: true, name: true, email: true, status: true },
    });

    if (!student) {
      throw new NotFoundError('Student account not found.');
    }
    if (student.status === 'SUSPENDED') {
      throw new ForbiddenError('Suspended accounts cannot register for workshops.');
    }

    // 4. Execute registration atomically in a database transaction
    return prisma.$transaction(async (tx) => {
      // Check existing registration
      const existing = await tx.workshopRegistration.findUnique({
        where: {
          unique_workshop_student_registration: {
            workshopId: workshop.id,
            studentId: finalStudentId,
          },
        },
      });

      if (existing) {
        if (existing.status === RegistrationStatus.CANCELLED || existing.status === RegistrationStatus.REJECTED) {
          // Re-evaluate eligibility for reactivation
          const confirmedCount = await tx.workshopRegistration.count({
            where: { workshopId: workshop.id, status: RegistrationStatus.REGISTERED },
          });

          const eligibility = evaluateRegistrationEligibility(workshop, confirmedCount);
          if (!eligibility.allowed) {
            throw new ConflictError(eligibility.reason || 'Workshop is not accepting registrations.');
          }

          return tx.workshopRegistration.update({
            where: { id: existing.id },
            data: {
              status: eligibility.statusToAssign,
              registeredAt: new Date(),
              notes: data.notes || null,
              cancelledAt: null,
            },
            include: {
              workshop: {
                select: { id: true, title: true, domain: true, startDate: true },
              },
            },
          });
        }

        throw new ConflictError(
          `You are already ${existing.status.toLowerCase().replace('_', ' ')} for this workshop.`
        );
      }

      // Count current confirmed attendees
      const confirmedCount = await tx.workshopRegistration.count({
        where: {
          workshopId: workshop.id,
          status: RegistrationStatus.REGISTERED,
        },
      });

      // Evaluate eligibility and status to assign
      const eligibility = evaluateRegistrationEligibility(workshop, confirmedCount);
      if (!eligibility.allowed) {
        throw new ConflictError(eligibility.reason || 'Workshop is not accepting registrations.');
      }

      // Create registration record
      const registration = await tx.workshopRegistration.create({
        data: {
          workshopId: workshop.id,
          studentId: finalStudentId,
          status: eligibility.statusToAssign,
          attendanceStatus: AttendanceStatus.ABSENT,
          notes: data.notes || null,
        },
        include: {
          workshop: {
            select: { id: true, title: true, domain: true, startDate: true, participantLimit: true },
          },
        },
      });

      return {
        ...registration,
        message:
          eligibility.statusToAssign === RegistrationStatus.WAITLISTED
            ? 'Workshop capacity reached. You have been placed on the waitlist.'
            : eligibility.statusToAssign === RegistrationStatus.PENDING_APPROVAL
            ? 'Registration submitted! Awaiting organizer approval.'
            : 'Registration confirmed successfully!',
      };
    });
  }

  /**
   * Allows a student to cancel their own registration before workshop start
   */
  static async cancelOwnRegistration(registrationId: string, studentId: string) {
    const reg = await prisma.workshopRegistration.findUnique({
      where: { id: registrationId },
      include: {
        workshop: { select: { id: true, startDate: true, participantLimit: true, requiresApproval: true } },
      },
    });

    if (!reg) {
      throw new NotFoundError('Registration not found.');
    }

    if (reg.studentId !== studentId) {
      throw new ForbiddenError('You can only cancel your own registration.');
    }

    if (reg.status === RegistrationStatus.CANCELLED) {
      return reg;
    }

    const wasConfirmed = reg.status === RegistrationStatus.REGISTERED;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.workshopRegistration.update({
        where: { id: registrationId },
        data: {
          status: RegistrationStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      // Automatic Waitlist Promotion: If an approved seat was freed up, promote the oldest waitlisted student!
      if (wasConfirmed && !reg.workshop.requiresApproval) {
        const nextWaitlisted = await tx.workshopRegistration.findFirst({
          where: {
            workshopId: reg.workshop.id,
            status: RegistrationStatus.WAITLISTED,
          },
          orderBy: { registeredAt: 'asc' },
        });

        if (nextWaitlisted) {
          await tx.workshopRegistration.update({
            where: { id: nextWaitlisted.id },
            data: {
              status: RegistrationStatus.REGISTERED,
              notes: 'Automatically promoted from waitlist due to cancellation.',
            },
          });
        }
      }

      return updated;
    });
  }

  /**
   * Organiser participant management: Approve, reject, or cancel registrations with audit trail
   */
  static async manageParticipant(
    registrationId: string,
    actionData: z.infer<typeof manageParticipantSchema>,
    organiserUserId: string
  ) {
    const reg = await prisma.workshopRegistration.findUnique({
      where: { id: registrationId },
      include: {
        workshop: { select: { id: true, organisationId: true, participantLimit: true, title: true } },
        student: { select: { id: true, name: true, email: true } },
      },
    });

    if (!reg) {
      throw new NotFoundError('Registration not found.');
    }

    return prisma.$transaction(async (tx) => {
      let targetStatus: RegistrationStatus;
      const now = new Date();

      if (actionData.action === 'APPROVE') {
        // Capacity check
        const currentConfirmed = await tx.workshopRegistration.count({
          where: { workshopId: reg.workshop.id, status: RegistrationStatus.REGISTERED },
        });

        if (currentConfirmed >= reg.workshop.participantLimit) {
          throw new ResourceExhaustedError('Cannot approve: Workshop capacity limit has been reached.');
        }

        targetStatus = RegistrationStatus.REGISTERED;
      } else if (actionData.action === 'REJECT') {
        targetStatus = RegistrationStatus.REJECTED;
      } else {
        targetStatus = RegistrationStatus.CANCELLED;
      }

      const updated = await tx.workshopRegistration.update({
        where: { id: registrationId },
        data: {
          status: targetStatus,
          notes: actionData.notes || undefined,
          approvedAt: actionData.action === 'APPROVE' ? now : undefined,
          cancelledAt: actionData.action === 'CANCEL' ? now : undefined,
        },
      });

      // If an approved seat was cancelled, promote next waitlisted student
      if (reg.status === RegistrationStatus.REGISTERED && actionData.action === 'CANCEL') {
        const nextWaitlisted = await tx.workshopRegistration.findFirst({
          where: { workshopId: reg.workshop.id, status: RegistrationStatus.WAITLISTED },
          orderBy: { registeredAt: 'asc' },
        });

        if (nextWaitlisted) {
          await tx.workshopRegistration.update({
            where: { id: nextWaitlisted.id },
            data: {
              status: RegistrationStatus.REGISTERED,
              notes: 'Promoted from waitlist after participant cancellation.',
            },
          });
        }
      }

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: organiserUserId,
          organisationId: reg.workshop.organisationId,
          action: `REGISTRATION_${actionData.action}`,
          resourceType: 'WorkshopRegistration',
          resourceId: registrationId,
          metadata: {
            workshopTitle: reg.workshop.title,
            studentName: reg.student.name,
            studentEmail: reg.student.email,
            previousStatus: reg.status,
            newStatus: targetStatus,
            notes: actionData.notes || null,
          },
        },
      });

      return updated;
    });
  }

  /**
   * List participants for a workshop with filters, search, and sorting
   */
  static async listParticipants(
    workshopId: string,
    params?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const where: any = { workshopId };

    if (params?.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    if (params?.search) {
      where.student = {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
        ],
      };
    }

    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 20));
    const skip = (page - 1) * limit;

    const [total, participants] = await Promise.all([
      prisma.workshopRegistration.count({ where }),
      prisma.workshopRegistration.findMany({
        where,
        orderBy: { registeredAt: 'desc' },
        skip,
        take: limit,
        include: {
          student: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      }),
    ]);

    return {
      participants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Generate sanitized CSV string for authorized participant exports
   */
  static async exportParticipantsCSV(workshopId: string): Promise<string> {
    const participants = await prisma.workshopRegistration.findMany({
      where: { workshopId },
      orderBy: { registeredAt: 'asc' },
      include: {
        student: { select: { name: true, email: true } },
      },
    });

    const headers = ['Participant Name', 'Email Address', 'Registration Date (UTC)', 'Status', 'Attendance', 'Notes'];
    const rows = participants.map((p) => [
      `"${p.student.name.replace(/"/g, '""')}"`,
      `"${p.student.email.replace(/"/g, '""')}"`,
      `"${p.registeredAt.toISOString()}"`,
      `"${p.status}"`,
      `"${p.attendanceStatus}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  /**
   * Retrieve all workshops a student is currently registered for
   */
  static async getStudentRegistrations(studentId: string) {
    return prisma.workshopRegistration.findMany({
      where: { studentId },
      orderBy: { registeredAt: 'desc' },
      include: {
        workshop: {
          include: {
            organisation: { select: { name: true, slug: true, logo: true } },
            _count: { select: { registrations: { where: { status: 'REGISTERED' } } } },
          },
        },
      },
    });
  }

  /**
   * Mark student attendance and award attendance gamification points.
   */
  static async markAttendance(registrationId: string, attendanceStatus: AttendanceStatus, actorId?: string) {
    const reg = await prisma.workshopRegistration.findUnique({
      where: { id: registrationId },
      include: {
        workshop: { select: { id: true, title: true, organisationId: true } },
      },
    });

    if (!reg) {
      throw new NotFoundError('Registration record not found');
    }

    const updated = await prisma.workshopRegistration.update({
      where: { id: registrationId },
      data: {
        attendanceStatus,
        status: attendanceStatus === 'ATTENDED' ? 'ATTENDED' : reg.status,
      },
    });

    if (attendanceStatus === 'ATTENDED') {
      try {
        const { GamificationService } = await import('./gamification.service');
        await GamificationService.awardPoints({
          userId: reg.studentId,
          amount: 50,
          reason: `Attended workshop: ${reg.workshop.title}`,
          sourceActivity: 'WORKSHOP_ATTENDANCE',
          referenceId: reg.id,
          workshopId: reg.workshop.id,
          organisationId: reg.workshop.organisationId,
        });
      } catch (err) {
        console.warn('Could not award attendance points:', err);
      }
    }

    return updated;
  }
}
