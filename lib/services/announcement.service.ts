import { prisma } from '@/lib/prisma';
import { RealtimeEventService } from './realtime-event.service';
import { NotificationService } from './notification.service';
import { ActivityService } from './activity.service';
import { NotFoundError, ForbiddenError } from '@/lib/errors';

export class AnnouncementService {
  /**
   * Create and immediately broadcast an announcement
   */
  static async create(params: {
    workshopId: string;
    organiserId: string;
    title: string;
    message: string;
    priority?: 'NORMAL' | 'IMPORTANT' | 'URGENT';
    isPinned?: boolean;
    targetGroup?: string | null;
    scheduledAt?: string | null;
  }) {
    const {
      workshopId,
      organiserId,
      title,
      message,
      priority = 'NORMAL',
      isPinned = false,
      targetGroup = null,
      scheduledAt = null,
    } = params;

    // Verify workshop exists
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        registrations: {
          where: { status: 'REGISTERED' },
          select: { studentId: true },
        },
      },
    });

    if (!workshop) {
      throw new NotFoundError(`Workshop "${workshopId}" not found`);
    }

    const announcement = await prisma.workshopAnnouncement.create({
      data: {
        workshopId,
        createdById: organiserId,
        title,
        message,
        priority,
        status: 'PUBLISHED',
        isPinned,
        targetGroup,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        publishedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    // 1. Record chronological activity
    await ActivityService.record({
      workshopId,
      eventType: 'ANNOUNCEMENT_POSTED',
      actorId: organiserId,
      relatedEntityId: announcement.id,
      metadata: {
        title: announcement.title,
        priority: announcement.priority,
        isPinned: announcement.isPinned,
      },
    });

    // 2. Broadcast real-time event to workshop channel
    await RealtimeEventService.publish({
      workshopId,
      eventType: 'workshop:announcement:published',
      data: {
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        priority: announcement.priority,
        isPinned: announcement.isPinned,
        publishedAt: announcement.publishedAt,
        author: announcement.author,
      },
    });

    // 3. Deliver in-app notification to all registered students
    const studentIds = workshop.registrations.map((r) => r.studentId);
    for (const studentId of studentIds) {
      NotificationService.create({
        userId: studentId,
        type: 'WORKSHOP_ANNOUNCEMENT',
        title: `Announcement: ${announcement.title}`,
        message: announcement.message.slice(0, 150),
        link: `/student/workshops/${workshopId}`,
        metadata: {
          announcementId: announcement.id,
          priority: announcement.priority,
          workshopId,
        },
      }).catch((err) => {
        console.error('[AnnouncementService] Failed to notify student:', studentId, err.message);
      });
    }

    return announcement;
  }

  /**
   * List announcements for a workshop (pinned first, then chronological)
   */
  static async list(workshopId: string, options?: { limit?: number; page?: number }) {
    const limit = options?.limit || 20;
    const page = options?.page || 1;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.workshopAnnouncement.count({
        where: { workshopId, status: { not: 'ARCHIVED' } },
      }),
      prisma.workshopAnnouncement.findMany({
        where: { workshopId, status: { not: 'ARCHIVED' } },
        include: {
          author: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { publishedAt: 'desc' },
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
   * Toggle pin status
   */
  static async togglePin(announcementId: string, organiserId: string, isPinned: boolean) {
    const existing = await prisma.workshopAnnouncement.findUnique({
      where: { id: announcementId },
    });

    if (!existing) {
      throw new NotFoundError('Announcement not found');
    }

    return prisma.workshopAnnouncement.update({
      where: { id: announcementId },
      data: { isPinned },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Archive an announcement
   */
  static async archive(announcementId: string) {
    const existing = await prisma.workshopAnnouncement.findUnique({
      where: { id: announcementId },
    });

    if (!existing) {
      throw new NotFoundError('Announcement not found');
    }

    return prisma.workshopAnnouncement.update({
      where: { id: announcementId },
      data: { status: 'ARCHIVED' },
    });
  }
}
