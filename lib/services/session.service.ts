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
import { RunnerClientService } from './runner-client.service';
import { getApprovedImageProfile } from '@/lib/runner/image-registry';
import { RealtimeEventService } from './realtime-event.service';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';
import crypto from 'crypto';

export class SessionService {
  /**
   * Launch a secure cloud lab session for a student
   */
  static async create(data: z.infer<typeof createLabSessionSchema>) {
    // 1. Verify student registration
    const registration = await prisma.workshopRegistration.findUnique({
      where: {
        unique_workshop_student_registration: {
          workshopId: data.workshopId,
          studentId: data.studentId,
        },
      },
      include: { workshop: true },
    });

    if (!registration || (registration.status !== 'REGISTERED' && registration.status !== 'ATTENDED')) {
      throw new ForbiddenError('Student must be actively registered for the workshop to launch a lab environment');
    }

    if (registration.workshop.status !== 'PUBLISHED' && registration.workshop.status !== 'ONGOING') {
      throw new ConflictError(`Cannot launch lab environment for workshop in "${registration.workshop.status}" status`);
    }

    // 2. Verify lab template is attached to workshop
    const workshopLab = await prisma.workshopLab.findFirst({
      where: {
        workshopId: data.workshopId,
        labTemplateId: data.labTemplateId,
      },
      include: {
        labTemplate: true,
        workshop: { select: { id: true, title: true, domain: true, environmentProfile: true, requiredTools: true } },
      },
    });

    if (!workshopLab) {
      throw new NotFoundError('This lab template is not associated with the specified workshop');
    }

    const template = workshopLab.labTemplate;
    const workshop = workshopLab.workshop;

    const profileId =
      data.environmentProfile ||
      workshop.environmentProfile ||
      template.environmentProfile ||
      'LINUX_LAB';
    const profile = getApprovedImageProfile(profileId);

    // Resolve tools & desktop requirements
    const toolsList: string[] = Array.isArray(workshop.requiredTools) ? (workshop.requiredTools as string[]) : [];
    const { TOOL_CATALOGUE } = await import('@/lib/workshop/tool-catalogue');
    const hasDesktopTool = toolsList.some((tId) => TOOL_CATALOGUE[tId]?.requiresDesktop);
    const accessMethod = hasDesktopTool ? 'desktop' : 'terminal';

    // 3. Enforce student concurrent session quota (Max 1 active running lab per student)
    const existingActive = await prisma.labSession.findFirst({
      where: {
        studentId: data.studentId,
        status: { in: ['PROVISIONING', 'RUNNING'] },
      },
      include: {
        workshop: { select: { id: true, title: true } },
        labTemplate: { select: { id: true, name: true } },
      },
    });

    if (existingActive) {
      // If the active session is for the exact same lab, return it with a fresh ticket
      if (
        existingActive.workshopId === data.workshopId &&
        existingActive.labTemplateId === data.labTemplateId
      ) {
        const { ticket, wsUrl } = RunnerClientService.generateTicket(
          existingActive.id,
          data.studentId,
          data.workshopId,
          profile.id
        );

        // Update ticket in database
        await prisma.labSession.update({
          where: { id: existingActive.id },
          data: {
            connectionTicket: ticket,
            ticketExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
            accessUrl: wsUrl,
            lastActivityAt: new Date(),
          },
        });

        return this.sanitizeSession({
          ...existingActive,
          connectionTicket: ticket,
          accessUrl: wsUrl,
        });
      }

      throw new ConflictError(
        `You already have an active lab environment running for "${existingActive.workshop.title}". Please terminate it before launching a new one.`
      );
    }

    // 4. Generate unique session token
    const sessionToken = `ses_${crypto.randomBytes(18).toString('hex')}`;
    const initialDurationMin = template.estimatedDuration || profile.defaultLimits.maxDurationMinutes;

    // 5. Create session in database in PROVISIONING state
    const session = await prisma.labSession.create({
      data: {
        studentId: data.studentId,
        workshopId: data.workshopId,
        labTemplateId: data.labTemplateId,
        status: 'PROVISIONING',
        environmentProfile: profile.id,
        configuredTools: toolsList as any,
        accessMethod,
        sessionToken,
        resourceLimits: profile.defaultLimits as any,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + initialDurationMin * 60 * 1000),
        events: {
          create: {
            eventType: 'PROVISION_REQUESTED',
            message: `Initiating provisioning for profile ${profile.id}`,
            metadata: { profileId: profile.id, limits: profile.defaultLimits as any },
          },
        },
      },
      include: {
        labTemplate: { select: { id: true, name: true, domain: true, environmentType: true } },
      },
    });

    // Broadcast provisioning event
    await RealtimeEventService.publish({
      workshopId: data.workshopId,
      eventType: 'lab:session:provisioning',
      data: {
        sessionId: session.id,
        studentId: data.studentId,
        profile: profile.id,
      },
    });

    // 6. Invoke Remote Execution Plane to allocate isolated container
    try {
      const runnerRes = await RunnerClientService.provision({
        sessionId: session.id,
        studentId: data.studentId,
        workshopId: data.workshopId,
        profileId: profile.id,
        customMaxDurationMinutes: initialDurationMin,
      });

      // 7. Update session to RUNNING with connection credentials
      const updated = await prisma.labSession.update({
        where: { id: session.id },
        data: {
          status: 'RUNNING',
          containerReference: runnerRes.session.containerId,
          connectionTicket: runnerRes.connection.ticket,
          ticketExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          accessUrl: runnerRes.connection.wsEndpoint,
          startedAt: new Date(runnerRes.session.startedAt),
          expiresAt: new Date(runnerRes.session.expiresAt),
          lastActivityAt: new Date(),
          events: {
            create: {
              eventType: 'CONTAINER_STARTED',
              message: `Container provisioned and running. Profile: ${profile.id}`,
              metadata: { limits: runnerRes.session.limits },
            },
          },
        },
        include: {
          labTemplate: { select: { id: true, name: true, domain: true, environmentType: true } },
        },
      });

      // Broadcast started lifecycle event & record activity
      await RealtimeEventService.publish({
        workshopId: data.workshopId,
        eventType: 'lab:session:started',
        data: {
          sessionId: updated.id,
          studentId: data.studentId,
          profile: profile.id,
          startedAt: updated.startedAt,
          expiresAt: updated.expiresAt,
        },
      });

      await ActivityService.record({
        workshopId: data.workshopId,
        eventType: 'LAB_LAUNCHED',
        actorId: data.studentId,
        relatedEntityId: updated.id,
        metadata: {
          profile: profile.id,
          labTemplateName: updated.labTemplate?.name,
        },
      });

      await NotificationService.create({
        userId: data.studentId,
        type: 'LAB_SESSION_STARTED',
        title: 'Lab Sandbox Ready',
        message: `Your cloud environment (${profile.id}) is online and ready for practice.`,
        link: `/student/lab/${updated.id}`,
        metadata: { sessionId: updated.id },
      });

      return this.sanitizeSession(updated);
    } catch (err: any) {
      // Mark failed if runner provisioning errors
      await prisma.labSession.update({
        where: { id: session.id },
        data: {
          status: 'FAILED',
          failureReason: err.message || 'Container provisioning failed',
          terminatedAt: new Date(),
          events: {
            create: {
              eventType: 'ERROR',
              message: `Provisioning failed: ${err.message}`,
            },
          },
        },
      });

      await RealtimeEventService.publish({
        workshopId: data.workshopId,
        eventType: 'lab:session:failed',
        data: {
          sessionId: session.id,
          studentId: data.studentId,
          reason: err.message,
        },
      });

      await NotificationService.create({
        userId: data.studentId,
        type: 'LAB_SESSION_FAILED',
        title: 'Lab Launch Failed',
        message: `Unable to allocate sandbox: ${err.message}`,
        metadata: { sessionId: session.id },
      });

      throw new ConflictError(`Failed to launch lab container: ${err.message}`);
    }
  }

  /**
   * Generate a fresh short-lived connection ticket for an active session
   */
  static async refreshTicket(sessionId: string, studentId: string) {
    const session = await prisma.labSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.studentId !== studentId) {
      throw new ForbiddenError('Unauthorized: You do not own this lab session');
    }

    if (session.status !== 'RUNNING') {
      throw new ConflictError(`Cannot connect to terminal: session status is ${session.status}`);
    }

    // Check if lease expired
    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
      await this.terminateSession(sessionId, 'TIMEOUT_EXPIRED');
      throw new ConflictError('Lab session duration has expired');
    }

    const { ticket, wsUrl } = RunnerClientService.generateTicket(
      session.id,
      session.studentId,
      session.workshopId,
      session.environmentProfile || 'ubuntu-fundamentals'
    );

    await prisma.labSession.update({
      where: { id: sessionId },
      data: {
        connectionTicket: ticket,
        ticketExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        accessUrl: wsUrl,
        lastActivityAt: new Date(),
        events: {
          create: {
            eventType: 'WS_CONNECTED',
            message: 'Issued new WebSocket connection ticket',
          },
        },
      },
    });

    return { ticket, wsUrl };
  }

  /**
   * Process client keepalive heartbeat
   */
  static async heartbeat(sessionId: string, studentId: string) {
    const session = await prisma.labSession.findUnique({
      where: { id: sessionId },
      select: { id: true, studentId: true, status: true, expiresAt: true },
    });

    if (!session || session.studentId !== studentId) {
      return { success: false, reason: 'NOT_FOUND' };
    }

    if (session.status !== 'RUNNING') {
      return { success: false, status: session.status };
    }

    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
      await this.terminateSession(sessionId, 'TIMEOUT_EXPIRED');
      return { success: false, status: 'EXPIRED' };
    }

    await prisma.labSession.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });

    const remainingMs = session.expiresAt ? Math.max(0, session.expiresAt.getTime() - Date.now()) : 0;
    return { success: true, remainingMs };
  }

  /**
   * Update session status (with state machine transition guard)
   */
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
          data.status === 'TERMINATED' || data.status === 'COMPLETED' || data.status === 'EXPIRED' || data.status === 'STOPPED'
            ? new Date()
            : undefined,
        stoppedAt: data.status === 'STOPPED' ? new Date() : undefined,
      },
    });

    return this.sanitizeSession(updated);
  }

  /**
   * Terminate a session (by student or organiser)
   */
  static async terminateSession(
    sessionId: string,
    reason: string = 'STUDENT_STOPPED',
    initiatorUserId?: string
  ) {
    const session = await prisma.labSession.findUnique({
      where: { id: sessionId },
      include: { workshop: true },
    });

    if (!session) {
      throw new NotFoundError(`Lab session with ID "${sessionId}" not found`);
    }

    // If already in terminal state, return idempotent
    if (['TERMINATED', 'COMPLETED', 'EXPIRED', 'FAILED', 'STOPPED'].includes(session.status)) {
      return this.sanitizeSession(session);
    }

    // Call execution runner to stop & clean container
    await RunnerClientService.destroy(sessionId);

    const updated = await prisma.labSession.update({
      where: { id: sessionId },
      data: {
        status: reason === 'TIMEOUT_EXPIRED' ? 'EXPIRED' : 'TERMINATED',
        terminatedAt: new Date(),
        stoppedAt: new Date(),
        terminationReason: reason,
        events: {
          create: {
            eventType: 'CONTAINER_DESTROYED',
            message: `Session terminated: ${reason}${initiatorUserId ? ` by user ${initiatorUserId}` : ''}`,
            metadata: { reason, initiatorUserId },
          },
        },
      },
    });

    const isExpired = reason === 'TIMEOUT_EXPIRED';
    await RealtimeEventService.publish({
      workshopId: session.workshopId,
      eventType: isExpired ? 'lab:session:expired' : 'lab:session:stopped',
      data: {
        sessionId: updated.id,
        studentId: session.studentId,
        reason,
        stoppedAt: updated.stoppedAt,
      },
    });

    await ActivityService.record({
      workshopId: session.workshopId,
      eventType: isExpired ? 'LAB_EXPIRED' : 'LAB_STOPPED',
      actorId: initiatorUserId || session.studentId,
      relatedEntityId: sessionId,
      metadata: { reason },
    });

    return this.sanitizeSession(updated);
  }

  /**
   * Reset environment session to fresh state (cleans filesystem and re-attaches container)
   */
  static async resetSession(sessionId: string, initiatorUserId?: string) {
    const session = await prisma.labSession.findUnique({
      where: { id: sessionId },
      include: {
        workshop: { select: { id: true, title: true, environmentProfile: true, requiredTools: true } },
        labTemplate: true,
      },
    });

    if (!session) {
      throw new NotFoundError(`Lab session with ID "${sessionId}" not found`);
    }

    try {
      await RunnerClientService.destroy(sessionId);
    } catch {
      // ignore
    }

    const profileId = session.environmentProfile || session.workshop.environmentProfile || 'LINUX_LAB';
    const profile = getApprovedImageProfile(profileId);
    const initialDurationMin = session.labTemplate?.estimatedDuration || profile.defaultLimits.maxDurationMinutes;

    const runnerRes = await RunnerClientService.provision({
      sessionId: session.id,
      studentId: session.studentId,
      workshopId: session.workshopId,
      profileId: profile.id,
      customMaxDurationMinutes: initialDurationMin,
    });

    const updated = await prisma.labSession.update({
      where: { id: sessionId },
      data: {
        status: 'RUNNING',
        containerReference: runnerRes.session.containerId,
        connectionTicket: runnerRes.connection.ticket,
        ticketExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        accessUrl: runnerRes.connection.wsEndpoint,
        startedAt: new Date(runnerRes.session.startedAt),
        expiresAt: new Date(runnerRes.session.expiresAt),
        stoppedAt: null,
        terminatedAt: null,
        lastActivityAt: new Date(),
        events: {
          create: {
            eventType: 'SESSION_RESET',
            message: `Environment reset to clean state by ${initiatorUserId || session.studentId}`,
          },
        },
      },
    });

    await ActivityService.record({
      workshopId: session.workshopId,
      eventType: 'LAB_RESET',
      actorId: initiatorUserId || session.studentId,
      relatedEntityId: sessionId,
      metadata: { profileId: profile.id },
    });

    return this.sanitizeSession(updated);
  }

  /**
   * Get session details with sanitized fields
   */
  static async getById(sessionId: string, studentId?: string) {
    const session = await prisma.labSession.findUnique({
      where: { id: sessionId },
      include: {
        workshop: {
          select: {
            id: true,
            title: true,
            domain: true,
            organisationId: true,
            environmentProfile: true,
            requiredTools: true,
            environmentStatus: true,
            environmentVersion: true,
          },
        },
        labTemplate: {
          include: {
            challenges: {
              include: { tasks: true },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!session) {
      throw new NotFoundError(`Lab session with ID "${sessionId}" not found`);
    }

    // Authorization: if studentId provided, ensure ownership
    if (studentId && session.studentId !== studentId) {
      throw new ForbiddenError('You do not have access to this lab session');
    }

    // Fetch live runner stats if running
    let liveMetrics = null;
    if (session.status === 'RUNNING') {
      const runnerStatus = await RunnerClientService.getStatus(sessionId);
      if (runnerStatus?.session?.metrics) {
        liveMetrics = runnerStatus.session.metrics;
      }
    }

    return {
      ...this.sanitizeSession(session),
      liveMetrics,
    };
  }

  /**
   * Find student's active running session
   */
  static async getActiveByStudent(studentId: string) {
    const session = await prisma.labSession.findFirst({
      where: {
        studentId,
        status: { in: ['PROVISIONING', 'RUNNING'] },
      },
      include: {
        workshop: { select: { id: true, title: true, domain: true } },
        labTemplate: {
          include: {
            challenges: {
              include: { tasks: true },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return session ? this.sanitizeSession(session) : null;
  }

  /**
   * Organiser Telemetry: Get all active & recent sessions for a workshop
   */
  static async getWorkshopSessions(workshopId: string, organiserId: string) {
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        organisation: {
          include: { members: { where: { userId: organiserId } } },
        },
      },
    });

    if (!workshop || workshop.organisation.members.length === 0) {
      throw new ForbiddenError('You do not have organiser access to this workshop');
    }

    const sessions = await prisma.labSession.findMany({
      where: { workshopId },
      include: {
        student: { select: { id: true, name: true, email: true } },
        labTemplate: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return sessions.map((s) => ({
      id: s.id,
      studentName: s.student.name,
      studentEmail: s.student.email,
      labName: s.labTemplate.name,
      status: s.status,
      environmentProfile: s.environmentProfile,
      startedAt: s.startedAt,
      expiresAt: s.expiresAt,
      terminatedAt: s.terminatedAt,
      terminationReason: s.terminationReason,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Reconcile any orphaned or expired sessions in database
   */
  static async reconcileExpiredSessions(): Promise<number> {
    const expiredSessions = await prisma.labSession.findMany({
      where: {
        status: { in: ['PROVISIONING', 'RUNNING'] },
        expiresAt: { lt: new Date() },
      },
    });

    for (const session of expiredSessions) {
      await this.terminateSession(session.id, 'TIMEOUT_EXPIRED');
    }

    return expiredSessions.length;
  }

  /**
   * Shields internal container reference details from student-facing payloads
   */
  private static sanitizeSession<T extends { containerReference?: string | null }>(
    session: T
  ): Omit<T, 'containerReference'> {
    const { containerReference, ...safe } = session;
    return safe;
  }
}
