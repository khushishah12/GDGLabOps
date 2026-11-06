import { prisma } from '@/lib/prisma';
import { RealtimeEventService } from './realtime-event.service';
import { NotFoundError } from '@/lib/errors';
import { NotificationType } from '@prisma/client';

export class NotificationService {
  /**
   * Create an in-app notification and broadcast to the specific user channel
   */
  static async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    const { userId, type, title, message, link = null, metadata = null } = params;

    // Deduplication check: prevent identical notification within 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type,
        title,
        createdAt: { gte: tenSecondsAgo },
      },
    });

    if (existing) {
      return existing;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        metadata: metadata ? (metadata as any) : undefined,
        isRead: false,
      },
    });

    // Broadcast in real-time targeted to user
    await RealtimeEventService.publish({
      workshopId: (metadata?.workshopId as string) || 'global',
      eventType: 'workshop:notification:new',
      targetUserId: userId,
      targetRoom: 'user',
      data: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
      },
    });

    return notification;
  }

  /**
   * Retrieve notification history for a user
   */
  static async list(userId: string, options?: { unreadOnly?: boolean; limit?: number; page?: number }) {
    const limit = options?.limit || 20;
    const page = options?.page || 1;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options?.unreadOnly) {
      where.isRead = false;
    }

    const [total, unreadCount, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark a single notification as read
   */
  static async markRead(notificationId: string, userId: string) {
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Notification not found');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }
}
