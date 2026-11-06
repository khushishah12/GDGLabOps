import prisma from '@/lib/prisma';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { Prisma, PointsTransactionType } from '@prisma/client';
import { NotificationService } from './notification.service';
import { RealtimeEventService } from './realtime-event.service';

export interface AwardPointsParams {
  userId: string;
  amount: number;
  reason: string;
  sourceActivity: string; // 'CHALLENGE_COMPLETION' | 'LAB_COMPLETION' | 'WORKSHOP_ATTENDANCE' | 'ACHIEVEMENT_UNLOCKED' | 'BONUS'
  referenceId?: string;
  workshopId?: string;
  challengeId?: string;
  organisationId?: string;
  metadata?: Record<string, any>;
}

export interface RevertPointsParams {
  transactionId?: string;
  idempotencyKey?: string;
  reason: string;
  actorId?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  points: number;
  badgesCount: number;
  isCurrentUser: boolean;
  isAnonymous: boolean;
}

export class GamificationService {
  /**
   * Appends an immutable points transaction to the ledger and increments user points.
   * Ensures idempotency: duplicate activities with the same key are safely skipped.
   */
  static async awardPoints(params: AwardPointsParams) {
    const {
      userId,
      amount,
      reason,
      sourceActivity,
      referenceId,
      workshopId,
      challengeId,
      organisationId,
      metadata,
    } = params;

    if (amount <= 0) {
      throw new ValidationError('Point award amount must be greater than zero');
    }

    // Deterministic idempotency key
    const refKey = referenceId || challengeId || workshopId || 'manual';
    const idempotencyKey = `${sourceActivity.toLowerCase()}-${userId}-${refKey}`;

    // Execute in a transaction to guarantee consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if transaction already exists
      const existing = await tx.pointsTransaction.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        return { transaction: existing, alreadyAwarded: true };
      }

      // 2. Create the ledger entry
      const transaction = await tx.pointsTransaction.create({
        data: {
          userId,
          amount,
          type: PointsTransactionType.EARNED,
          reason,
          sourceActivity,
          referenceId: referenceId || null,
          workshopId: workshopId || null,
          challengeId: challengeId || null,
          organisationId: organisationId || null,
          idempotencyKey,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });

      // 3. Atomically update user total points
      await tx.user.update({
        where: { id: userId },
        data: {
          totalPoints: { increment: amount },
        },
      });

      return { transaction, alreadyAwarded: false };
    });

    // Notify user if points were freshly awarded
    if (!result.alreadyAwarded) {
      try {
        await NotificationService.create({
          userId,
          title: `+${amount} Points Earned!`,
          message: reason,
          type: 'SUCCESS',
          metadata: {
            pointsAwarded: amount,
            sourceActivity,
            transactionId: result.transaction.id,
          },
        });

        if (workshopId) {
          await RealtimeEventService.publish({
            workshopId,
            eventType: 'workshop:points:awarded',
            targetUserId: userId,
            data: {
              userId,
              pointsAwarded: amount,
              reason,
            },
          });
        }
      } catch (err) {
        // Non-critical notification error should not roll back points
        console.warn('Failed to send points notification:', err);
      }

      // Evaluate achievements post-award
      await this.evaluateAchievements(userId, { workshopId });
    }

    return result.transaction;
  }

  /**
   * Issues a compensating reversal transaction to deduct previously awarded points.
   * Past transactions are never deleted from the ledger.
   */
  static async revertPoints(params: RevertPointsParams) {
    const { transactionId, idempotencyKey, reason } = params;

    const original = await prisma.pointsTransaction.findFirst({
      where: transactionId ? { id: transactionId } : { idempotencyKey },
    });

    if (!original) {
      throw new NotFoundError('Original points transaction not found for reversal');
    }

    if (original.type === PointsTransactionType.REVERSED) {
      throw new ValidationError('Cannot reverse an already reversed transaction');
    }

    const reversalKey = `reversal-${original.idempotencyKey}`;

    return prisma.$transaction(async (tx) => {
      // Check if already reversed
      const existingReversal = await tx.pointsTransaction.findUnique({
        where: { idempotencyKey: reversalKey },
      });

      if (existingReversal) {
        return existingReversal;
      }

      // Create negative compensating transaction
      const reversalTx = await tx.pointsTransaction.create({
        data: {
          userId: original.userId,
          amount: -Math.abs(original.amount),
          type: PointsTransactionType.REVERSED,
          reason: `Reversal: ${reason} (Original: ${original.reason})`,
          sourceActivity: `REVERSAL_${original.sourceActivity}`,
          referenceId: original.id,
          workshopId: original.workshopId,
          challengeId: original.challengeId,
          organisationId: original.organisationId,
          idempotencyKey: reversalKey,
        },
      });

      // Update user total points, ensuring it doesn't drop below 0
      const user = await tx.user.findUnique({
        where: { id: original.userId },
        select: { totalPoints: true },
      });

      const currentPoints = user?.totalPoints || 0;
      const newTotal = Math.max(0, currentPoints - Math.abs(original.amount));

      await tx.user.update({
        where: { id: original.userId },
        data: { totalPoints: newTotal },
      });

      return reversalTx;
    });
  }

  /**
   * Evaluates all achievement criteria for a user against real database records.
   * Unlocks new achievements and awards points idempotently.
   */
  static async evaluateAchievements(userId: string, context?: { workshopId?: string }) {
    // 1. Fetch all active achievements and current user achievements
    const [allAchievements, userAchievements, user] = await Promise.all([
      prisma.achievement.findMany({ where: { isActive: true } }),
      prisma.userAchievement.findMany({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!user) return [];

    const earnedAchievementIds = new Set(userAchievements.map((ua) => ua.achievementId));
    const newlyEarned: string[] = [];

    // 2. Fetch real metric records for this student
    const [
      attendedRegistrationsCount,
      completedLabsCount,
      passedSubmissions,
      completedProgressList,
    ] = await Promise.all([
      prisma.workshopRegistration.count({
        where: {
          studentId: userId,
          OR: [{ attendanceStatus: 'ATTENDED' }, { status: 'ATTENDED' }],
        },
      }),
      prisma.labSession.count({
        where: {
          studentId: userId,
          status: 'COMPLETED',
        },
      }),
      prisma.challengeSubmission.findMany({
        where: {
          studentId: userId,
          status: 'PASSED',
        },
        include: {
          challenge: {
            include: {
              labTemplate: { select: { domain: true } },
            },
          },
        },
      }),
      prisma.studentProgress.findMany({
        where: {
          studentId: userId,
        },
      }),
    ]);

    const passedChallengesCount = passedSubmissions.length;

    // Distinct domains completed
    const uniqueDomains = new Set<string>();
    passedSubmissions.forEach((sub) => {
      if (sub.challenge?.labTemplate?.domain) {
        uniqueDomains.add(sub.challenge.labTemplate.domain.toLowerCase());
      }
    });

    // Check if any challenge was completed on first try without hints
    const hasFirstTryNoHints = passedSubmissions.some((sub) => {
      const data = sub.submissionData as any;
      const hintsUsed = data?.hintsViewed || data?.hintsUsed || 0;
      return hintsUsed === 0;
    });

    // Check if any lab has 100% completion with perfect score
    const hasPerfectLab = completedProgressList.some(
      (p) => p.completionPercentage >= 100 && p.completedChallenges > 0
    );

    // 3. Evaluate each unearned achievement
    for (const ach of allAchievements) {
      if (earnedAchievementIds.has(ach.id)) continue;

      let isQualified = false;
      const slug = ach.slug;

      if (slug === 'first-workshop' && attendedRegistrationsCount >= 1) {
        isQualified = true;
      } else if (slug === 'first-lab' && completedLabsCount >= 1) {
        isQualified = true;
      } else if (slug === 'first-challenge' && passedChallengesCount >= 1) {
        isQualified = true;
      } else if (slug === 'quick-learner' && hasFirstTryNoHints) {
        isQualified = true;
      } else if (slug === 'lab-master' && hasPerfectLab) {
        isQualified = true;
      } else if (slug === 'domain-explorer' && uniqueDomains.size >= 3) {
        isQualified = true;
      } else if (slug === 'shell-master' && passedChallengesCount >= 10) {
        isQualified = true;
      } else if (slug === 'container-pilot' && uniqueDomains.has('cloud')) {
        isQualified = true;
      }

      if (isQualified) {
        try {
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: ach.id,
            },
          });

          newlyEarned.push(ach.name);

          // Award achievement bonus points
          if (ach.points > 0) {
            await this.awardPoints({
              userId,
              amount: ach.points,
              reason: `Achievement Unlocked: ${ach.name}`,
              sourceActivity: 'ACHIEVEMENT_UNLOCKED',
              referenceId: ach.id,
              workshopId: context?.workshopId,
              metadata: { achievementSlug: ach.slug, achievementName: ach.name },
            });
          }

          // In-app notification
          await NotificationService.create({
            userId,
            title: `🏆 Badge Unlocked: ${ach.name}!`,
            message: ach.description,
            type: 'ACHIEVEMENT',
            link: '/student/learning',
            metadata: { achievementId: ach.id, slug: ach.slug, icon: ach.icon },
          });
        } catch (e) {
          // If already inserted concurrently, catch unique constraint violation gracefully
          console.warn(`Achievement ${ach.slug} already awarded or collision:`, e);
        }
      }
    }

    return newlyEarned;
  }

  /**
   * Multi-level leaderboard supporting Organisation, Workshop, Monthly, and All-Time scopes.
   * Respects student privacy: masks names when `leaderboardOptOut` is true and never leaks emails.
   */
  static async getLeaderboard(params: {
    scope: 'all-time' | 'monthly' | 'organisation' | 'workshop';
    scopeId?: string;
    limit?: number;
    offset?: number;
    currentUserId?: string;
  }): Promise<{ entries: LeaderboardEntry[]; totalCount: number; userRank?: LeaderboardEntry }> {
    const { scope, scopeId, limit = 50, offset = 0, currentUserId } = params;

    let usersQuery: any = { status: 'ACTIVE' };
    let pointsByUserId: Record<string, number> = {};

    if (scope === 'workshop' && scopeId) {
      // Find all students registered or participated in this workshop
      const registrations = await prisma.workshopRegistration.findMany({
        where: { workshopId: scopeId },
        select: { studentId: true },
      });
      const studentIds = registrations.map((r) => r.studentId);
      usersQuery.id = { in: studentIds };

      // Sum points earned in this workshop
      const workshopTxs = await prisma.pointsTransaction.groupBy({
        by: ['userId'],
        where: { workshopId: scopeId },
        _sum: { amount: true },
      });

      workshopTxs.forEach((tx) => {
        pointsByUserId[tx.userId] = Math.max(0, tx._sum.amount || 0);
      });
    } else if (scope === 'organisation' && scopeId) {
      const memberships = await prisma.organisationMembership.findMany({
        where: { organisationId: scopeId, status: 'ACTIVE' },
        select: { userId: true },
      });
      const userIds = memberships.map((m) => m.userId);
      usersQuery.id = { in: userIds };

      const orgTxs = await prisma.pointsTransaction.groupBy({
        by: ['userId'],
        where: { organisationId: scopeId },
        _sum: { amount: true },
      });

      orgTxs.forEach((tx) => {
        pointsByUserId[tx.userId] = Math.max(0, tx._sum.amount || 0);
      });
    } else if (scope === 'monthly') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthlyTxs = await prisma.pointsTransaction.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      });

      monthlyTxs.forEach((tx) => {
        pointsByUserId[tx.userId] = Math.max(0, tx._sum.amount || 0);
      });
    }

    // Fetch candidate users with their earned achievements
    const users = await prisma.user.findMany({
      where: usersQuery,
      select: {
        id: true,
        name: true,
        avatar: true,
        totalPoints: true,
        leaderboardOptOut: true,
        _count: {
          select: { userAchievements: true },
        },
      },
    });

    // Map each user to rankable structure
    const rankedList = users
      .map((u) => {
        const points =
          scope === 'all-time'
            ? u.totalPoints
            : pointsByUserId[u.id] !== undefined
            ? pointsByUserId[u.id]
            : u.totalPoints;

        return {
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          points,
          badgesCount: u._count.userAchievements,
          leaderboardOptOut: u.leaderboardOptOut,
        };
      })
      .sort((a, b) => b.points - a.points || b.badgesCount - a.badgesCount);

    const totalCount = rankedList.length;

    // Apply ranking & privacy masks
    let userRankEntry: LeaderboardEntry | undefined;

    const allEntries: LeaderboardEntry[] = rankedList.map((item, idx) => {
      const rank = idx + 1;
      const isCurrentUser = item.id === currentUserId;
      const isOptedOut = item.leaderboardOptOut;

      const entry: LeaderboardEntry = {
        rank,
        userId: isCurrentUser ? item.id : isOptedOut ? 'anonymous' : item.id,
        name: isOptedOut && !isCurrentUser ? 'Anonymous Explorer' : item.name,
        avatar: isOptedOut && !isCurrentUser ? null : item.avatar,
        points: item.points,
        badgesCount: item.badgesCount,
        isCurrentUser,
        isAnonymous: isOptedOut && !isCurrentUser,
      };

      if (isCurrentUser) {
        userRankEntry = entry;
      }

      return entry;
    });

    const pagedEntries = allEntries.slice(offset, offset + limit);

    return {
      entries: pagedEntries,
      totalCount,
      userRank: userRankEntry,
    };
  }

  /**
   * Allows student to toggle their presence on public leaderboards.
   */
  static async toggleLeaderboardOptOut(userId: string, optOut: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { leaderboardOptOut: optOut },
      select: { id: true, leaderboardOptOut: true },
    });
  }
}
