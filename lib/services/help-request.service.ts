import { prisma } from '@/lib/prisma';
import { RealtimeEventService } from './realtime-event.service';
import { NotificationService } from './notification.service';
import { ActivityService } from './activity.service';
import { NotFoundError, ForbiddenError } from '@/lib/errors';
import { HelpRequestCategory, HelpRequestStatus, Role } from '@prisma/client';

export class HelpRequestService {
  /**
   * Student creates a help request
   */
  static async create(params: {
    workshopId: string;
    studentId: string;
    category: HelpRequestCategory;
    description: string;
    labTemplateId?: string | null;
    challengeId?: string | null;
  }) {
    const { workshopId, studentId, category, description, labTemplateId = null, challengeId = null } = params;

    // Verify workshop and student registration
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        organiser: { select: { id: true } },
      },
    });

    if (!workshop) {
      throw new NotFoundError(`Workshop "${workshopId}" not found`);
    }

    const helpRequest = await prisma.helpRequest.create({
      data: {
        workshopId,
        studentId,
        category,
        description,
        labTemplateId,
        challengeId,
        status: 'OPEN',
      },
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
        challenge: { select: { id: true, title: true } },
        labTemplate: { select: { id: true, name: true } },
      },
    });

    // 1. Record chronological activity
    await ActivityService.record({
      workshopId,
      eventType: 'HELP_REQUESTED',
      actorId: studentId,
      relatedEntityId: helpRequest.id,
      metadata: {
        requestId: helpRequest.id,
        category: helpRequest.category,
        challengeTitle: helpRequest.challenge?.title,
      },
    });

    // 2. Broadcast real-time event to workshop organisers
    await RealtimeEventService.publish({
      workshopId,
      eventType: 'workshop:help-request:created',
      targetRoom: 'organisers',
      data: {
        id: helpRequest.id,
        workshopId,
        category: helpRequest.category,
        description: helpRequest.description,
        status: helpRequest.status,
        student: helpRequest.student,
        challenge: helpRequest.challenge,
        labTemplate: helpRequest.labTemplate,
        createdAt: helpRequest.createdAt,
      },
    });

    // 3. Notify the workshop organiser
    await NotificationService.create({
      userId: workshop.organiserId,
      type: 'INFO',
      title: `New Help Request from ${helpRequest.student.name}`,
      message: `${helpRequest.category}: ${description.slice(0, 100)}`,
      link: `/dashboard/workshops/${workshopId}/live`,
      metadata: { helpRequestId: helpRequest.id, workshopId },
    });

    return helpRequest;
  }

  /**
   * List help requests with strict authorisation
   * - Organisers see all requests in the workshop
   * - Students see ONLY their own requests (IDOR defense)
   */
  static async list(params: {
    workshopId: string;
    userId: string;
    userRole: Role;
    isOrganiser: boolean;
    status?: HelpRequestStatus | 'ALL';
    category?: HelpRequestCategory | 'ALL';
    limit?: number;
    page?: number;
  }) {
    const { workshopId, userId, isOrganiser, status, category, limit = 50, page = 1 } = params;
    const skip = (page - 1) * limit;

    const where: any = { workshopId };

    // Strict multi-tenant / student isolation:
    if (!isOrganiser) {
      where.studentId = userId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    const [total, items] = await Promise.all([
      prisma.helpRequest.count({ where }),
      prisma.helpRequest.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, email: true, avatar: true } },
          assignedOrganiser: { select: { id: true, name: true, email: true } },
          challenge: { select: { id: true, title: true } },
          labTemplate: { select: { id: true, name: true } },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              sender: { select: { id: true, name: true, role: true, avatar: true } },
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // OPEN first
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single help request with IDOR access check
   */
  static async getById(helpRequestId: string, userId: string, isOrganiser: boolean) {
    const request = await prisma.helpRequest.findUnique({
      where: { id: helpRequestId },
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
        assignedOrganiser: { select: { id: true, name: true, email: true } },
        challenge: { select: { id: true, title: true } },
        labTemplate: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, name: true, role: true, avatar: true } },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundError('Help request not found');
    }

    // IDOR protection: only student who filed it or organiser can read
    if (!isOrganiser && request.studentId !== userId) {
      throw new ForbiddenError('You are not authorized to view this help request');
    }

    return request;
  }

  /**
   * Update status of a help request (Organiser or Student closing their own request)
   */
  static async updateStatus(params: {
    helpRequestId: string;
    userId: string;
    isOrganiser: boolean;
    status: HelpRequestStatus;
    assignedOrganiserId?: string | null;
    resolutionNotes?: string | null;
  }) {
    const { helpRequestId, userId, isOrganiser, status, assignedOrganiserId, resolutionNotes } = params;

    const existing = await prisma.helpRequest.findUnique({
      where: { id: helpRequestId },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError('Help request not found');
    }

    // Students may only mark their own request CLOSED
    if (!isOrganiser) {
      if (existing.studentId !== userId) {
        throw new ForbiddenError('Unauthorized');
      }
      if (status !== 'CLOSED' && status !== 'RESOLVED') {
        throw new ForbiddenError('Students can only close or resolve their own requests');
      }
    }

    const isNowResolved = status === 'RESOLVED' || status === 'CLOSED';

    const updated = await prisma.helpRequest.update({
      where: { id: helpRequestId },
      data: {
        status,
        assignedOrganiserId: isOrganiser && assignedOrganiserId !== undefined ? assignedOrganiserId : existing.assignedOrganiserId,
        resolutionNotes: resolutionNotes !== undefined ? resolutionNotes : existing.resolutionNotes,
        resolvedAt: isNowResolved ? new Date() : null,
      },
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
        assignedOrganiser: { select: { id: true, name: true, email: true } },
        challenge: { select: { id: true, title: true } },
      },
    });

    // 1. Record activity if resolved
    if (isNowResolved) {
      await ActivityService.record({
        workshopId: existing.workshopId,
        eventType: 'HELP_RESOLVED',
        actorId: userId,
        relatedEntityId: helpRequestId,
        metadata: { status, resolutionNotes },
      });
    }

    // 2. Broadcast real-time status update to workshop and student
    await RealtimeEventService.publish({
      workshopId: existing.workshopId,
      eventType: 'workshop:help-request:updated',
      data: {
        id: updated.id,
        status: updated.status,
        assignedOrganiser: updated.assignedOrganiser,
        resolutionNotes: updated.resolutionNotes,
        resolvedAt: updated.resolvedAt,
        studentId: existing.studentId,
      },
    });

    // 3. Notify student when organiser updates status
    if (isOrganiser) {
      await NotificationService.create({
        userId: existing.studentId,
        type: 'HELP_REQUEST_STATUS_CHANGED',
        title: `Help Request ${status}`,
        message: `Your help request has been marked as ${status}${resolutionNotes ? `: "${resolutionNotes}"` : '.'}`,
        link: `/student/workshops/${existing.workshopId}`,
        metadata: { helpRequestId, status },
      });
    }

    return updated;
  }

  /**
   * Post a threaded message inside a help request
   */
  static async sendMessage(params: {
    helpRequestId: string;
    senderId: string;
    senderRole: Role;
    message: string;
  }) {
    const { helpRequestId, senderId, senderRole, message } = params;

    const request = await prisma.helpRequest.findUnique({
      where: { id: helpRequestId },
      include: {
        student: { select: { id: true, name: true } },
        assignedOrganiser: { select: { id: true, name: true } },
      },
    });

    if (!request) {
      throw new NotFoundError('Help request not found');
    }

    // IDOR validation: sender must be the student or an organiser/admin
    const isStudentOwner = request.studentId === senderId;
    const isOrganiserUser = senderRole === 'ORGANISER' || senderRole === 'SUPER_ADMIN';

    if (!isStudentOwner && !isOrganiserUser) {
      throw new ForbiddenError('Unauthorized to send messages in this help request');
    }

    const newMessage = await prisma.helpRequestMessage.create({
      data: {
        helpRequestId,
        senderId,
        senderRole,
        message,
      },
      include: {
        sender: { select: { id: true, name: true, role: true, avatar: true } },
      },
    });

    // If organiser replies and status is OPEN, auto-advance to IN_PROGRESS
    if (isOrganiserUser && request.status === 'OPEN') {
      await prisma.helpRequest.update({
        where: { id: helpRequestId },
        data: {
          status: 'IN_PROGRESS',
          assignedOrganiserId: senderId,
        },
      });
    }

    // Broadcast real-time message event
    await RealtimeEventService.publish({
      workshopId: request.workshopId,
      eventType: 'workshop:help-request:message',
      data: {
        helpRequestId,
        message: {
          id: newMessage.id,
          message: newMessage.message,
          senderRole: newMessage.senderRole,
          createdAt: newMessage.createdAt,
          sender: newMessage.sender,
        },
        studentId: request.studentId,
      },
    });

    // Notify the other party
    const recipientId = isOrganiserUser ? request.studentId : request.assignedOrganiserId;
    if (recipientId) {
      await NotificationService.create({
        userId: recipientId,
        type: 'HELP_REQUEST_RESPONSE',
        title: `Response from ${newMessage.sender.name}`,
        message: message.slice(0, 120),
        link: isOrganiserUser
          ? `/student/workshops/${request.workshopId}`
          : `/dashboard/workshops/${request.workshopId}/live`,
        metadata: { helpRequestId, messageId: newMessage.id },
      });
    }

    return newMessage;
  }
}
