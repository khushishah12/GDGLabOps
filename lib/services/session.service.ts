import prisma from '@/lib/prisma';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '@/lib/errors';
import { z } from 'zod';
import {
  createLabSessionSchema,
  updateLabSessionStatusSchema,
  validSessionTransitions,
} from '@/lib/validations';

export class SessionService {
  static async create(data: z.infer<typeof createLabSessionSchema>) {
    // 1. Verify student is registered for this workshop
    const registration = await prisma.workshopRegistration.findUnique({
      where: {
        unique_workshop_student_registration: {
          workshopId: data.workshopId,
          studentId: data.studentId,
        },
      },
      include: { workshop: true },
    });

    if (!registration || registration.status !== 'REGISTERED') {
      throw new ForbiddenError('Student must be actively registered for the workshop to spawn a lab session');
    }

    if (registration.workshop.status !== 'PUBLISHED' && registration.workshop.status !== 'ONGOING') {
      throw new ConflictError(`Cannot launch lab session for workshop in "${registration.workshop.status}" status`);
    }

    // 2. Check if student already has a RUNNING or PROVISIONING session for this workshop
    const activeSession = await prisma.labSession.findFirst({
      where: {
        studentId: data.studentId,
        workshopId: data.workshopId,
        status: { in: ['PROVISIONING', 'RUNNING'] },
      },
    });

    if (activeSession) {
      // Return existing active session rather than spawning multiple containers
      return this.sanitizeSession(activeSession);
    }

    // 3. Create new lab session record in PENDING / PROVISIONING state
    const session = await prisma.labSession.create({
      data: {
        studentId: data.studentId,
        workshopId: data.workshopId,
        labTemplateId: data.labTemplateId,
        status: 'PROVISIONING',
        containerReference: `sim_cid_${Math.random().toString(36).substring(2, 9)}`,
        accessUrl: `/student/lab/demo-session`,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 120), // 2 hour maximum lease
      },
      include: {
        labTemplate: { select: { id: true, name: true, domain: true, environmentType: true } },
      },
    });

    return this.sanitizeSession(session);
  }

  static async updateStatus(
    sessionId: string,
    data: z.infer<typeof updateLabSessionStatusSchema>
  ) {
    const session = await prisma.labSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError(`Lab session with ID "${sessionId}" not found`);
    }

    // Enforce state transition rules
    const allowed = validSessionTransitions[session.status];
    if (!allowed || !allowed.includes(data.status)) {
      throw new ConflictError(
        `Invalid session status transition from "${session.status}" to "${data.status}". Completed or terminated sessions cannot be restarted.`
      );
    }

    const updated = await prisma.labSession.update({
      where: { id: sessionId },
      data: {
        status: data.status as any,
        terminatedAt:
          data.status === 'TERMINATED' || data.status === 'COMPLETED' || data.status === 'EXPIRED'
            ? new Date()
            : undefined,
      },
    });

    return this.sanitizeSession(updated);
  }

  static async getById(sessionId: string) {
    const session = await prisma.labSession.findUnique({
      where: { id: sessionId },
      include: {
        workshop: { select: { id: true, title: true, domain: true } },
        labTemplate: true,
      },
    });

    if (!session) {
      throw new NotFoundError(`Lab session with ID "${sessionId}" not found`);
    }

    return this.sanitizeSession(session);
  }

  static async getActiveByStudent(studentId: string) {
    const session = await prisma.labSession.findFirst({
      where: {
        studentId,
        status: { in: ['PROVISIONING', 'RUNNING'] },
      },
      include: {
        workshop: { select: { id: true, title: true, domain: true } },
        labTemplate: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return session ? this.sanitizeSession(session) : null;
  }

  /// Shields internal container reference details from student-facing payloads
  private static sanitizeSession<T extends { containerReference?: string | null }>(
    session: T
  ): Omit<T, 'containerReference'> {
    const { containerReference, ...safe } = session;
    return safe;
  }
}
