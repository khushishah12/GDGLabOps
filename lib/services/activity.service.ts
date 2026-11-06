import { prisma } from '@/lib/prisma';
import { RealtimeEventService } from './realtime-event.service';

export interface RecordActivityParams {
  workshopId: string;
  eventType: string;
  actorId?: string | null;
  relatedEntityId?: string | null;
  metadata?: Record<string, any> | null;
}

export class ActivityService {
  /**
   * Record a sanitized workshop activity event and broadcast in real time
   */
  static async record(params: RecordActivityParams) {
    const { workshopId, eventType, actorId = null, relatedEntityId = null, metadata = null } = params;

    // Strict sanitization: remove any sensitive fields if accidentally passed
    const safeMetadata = metadata ? { ...metadata } : {};
    delete safeMetadata.password;
    delete safeMetadata.passwordHash;
    delete safeMetadata.token;
    delete safeMetadata.secret;
    delete safeMetadata.sessionToken;
    delete safeMetadata.connectionTicket;
    delete safeMetadata.rawTerminal;

    const activity = await prisma.workshopActivity.create({
      data: {
        workshopId,
        eventType,
        actorId,
        relatedEntityId,
        metadata: safeMetadata,
      },
      include: {
        actor: {
          select: { id: true, name: true, email: true, avatar: true, role: true },
        },
      },
    });

    // Broadcast activity event to live monitoring subscribers
    await RealtimeEventService.publish({
      workshopId,
      eventType: 'workshop:activity:new',
      data: {
        id: activity.id,
        eventType: activity.eventType,
        actorId: activity.actorId,
        actor: activity.actor,
        relatedEntityId: activity.relatedEntityId,
        metadata: activity.metadata,
        createdAt: activity.createdAt,
      },
    });

    return activity;
  }

  /**
   * List chronological activities for a workshop with filters and pagination
   */
  static async list(params: {
    workshopId: string;
    eventType?: string;
    limit?: number;
    page?: number;
  }) {
    const { workshopId, eventType, limit = 50, page = 1 } = params;
    const skip = (page - 1) * limit;

    const where: any = { workshopId };
    if (eventType && eventType !== 'ALL') {
      where.eventType = eventType;
    }

    const [total, items] = await Promise.all([
      prisma.workshopActivity.count({ where }),
      prisma.workshopActivity.findMany({
        where,
        include: {
          actor: {
            select: { id: true, name: true, email: true, avatar: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
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
}
