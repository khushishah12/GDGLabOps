import prisma from '@/lib/prisma';
import { NotFoundError } from '@/lib/errors';
import { FeedbackService } from './feedback.service';

export interface OrganiserAnalyticsFilters {
  organisationId?: string;
  startDate?: Date;
  endDate?: Date;
  workshopId?: string;
  domain?: string;
  difficulty?: string;
}

export class AnalyticsService {
  /**
   * Comprehensive Organiser Analytics Dashboard metrics aggregated directly from DB.
   */
  static async getOrganiserAnalytics(filters: OrganiserAnalyticsFilters = {}) {
    const { organisationId, startDate, endDate, workshopId, domain, difficulty } = filters;

    // Workshop filtering conditions
    const workshopWhere: any = {};
    if (organisationId) workshopWhere.organisationId = organisationId;
    if (workshopId) workshopWhere.id = workshopId;
    if (domain) workshopWhere.domain = domain;
    if (difficulty) workshopWhere.difficulty = difficulty;
    if (startDate || endDate) {
      workshopWhere.startDate = {};
      if (startDate) workshopWhere.startDate.gte = startDate;
      if (endDate) workshopWhere.startDate.lte = endDate;
    }

    // 1. Fetch matching workshops
    const workshops = await prisma.workshop.findMany({
      where: workshopWhere,
      select: {
        id: true,
        title: true,
        domain: true,
        difficulty: true,
        status: true,
        participantLimit: true,
        startDate: true,
      },
    });

    const workshopIds = workshops.map((w) => w.id);

    const totalWorkshops = workshops.length;
    const publishedWorkshops = workshops.filter((w) => w.status === 'PUBLISHED' || w.status === 'ONGOING').length;
    const completedWorkshops = workshops.filter((w) => w.status === 'COMPLETED').length;

    if (totalWorkshops === 0) {
      return {
        overview: {
          totalWorkshops: 0,
          publishedWorkshops: 0,
          completedWorkshops: 0,
          totalRegistrations: 0,
          uniqueParticipants: 0,
          attendanceRate: 0,
          conversionRate: 0,
          totalLabSessions: 0,
          totalChallengeSubmissions: 0,
          challengeCompletionRate: 0,
          averageWorkshopRating: 0,
        },
        domainBreakdown: [],
        registrationTrends: [],
      };
    }

    // 2. Fetch registrations for these workshops
    const registrations = await prisma.workshopRegistration.findMany({
      where: { workshopId: { in: workshopIds } },
      select: {
        id: true,
        studentId: true,
        status: true,
        attendanceStatus: true,
        registeredAt: true,
      },
    });

    const totalRegistrations = registrations.length;
    const uniqueStudentIds = new Set(registrations.map((r) => r.studentId));
    const uniqueParticipants = uniqueStudentIds.size;

    const approvedRegistrations = registrations.filter(
      (r) => r.status === 'REGISTERED' || r.status === 'ATTENDED'
    ).length;

    const attendedRegistrations = registrations.filter(
      (r) => r.attendanceStatus === 'ATTENDED' || r.status === 'ATTENDED'
    ).length;

    const attendanceRate =
      approvedRegistrations > 0
        ? Math.round((attendedRegistrations / approvedRegistrations) * 100 * 10) / 10
        : 0;

    const conversionRate =
      totalRegistrations > 0
        ? Math.round((attendedRegistrations / totalRegistrations) * 100 * 10) / 10
        : 0;

    // 3. Lab Sessions metrics
    const labSessions = await prisma.labSession.findMany({
      where: { workshopId: { in: workshopIds } },
      select: { id: true, status: true, startedAt: true, stoppedAt: true },
    });
    const totalLabSessions = labSessions.length;

    // 4. Challenge Submissions metrics
    const submissions = await prisma.challengeSubmission.findMany({
      where: { workshopId: { in: workshopIds } },
      select: { id: true, status: true, score: true },
    });

    const totalChallengeSubmissions = submissions.length;
    const passedSubmissions = submissions.filter((s) => s.status === 'PASSED').length;
    const challengeCompletionRate =
      totalChallengeSubmissions > 0
        ? Math.round((passedSubmissions / totalChallengeSubmissions) * 100 * 10) / 10
        : 0;

    // 5. Feedback Ratings
    const feedbacks = await prisma.workshopFeedback.findMany({
      where: { workshopId: { in: workshopIds } },
      select: { overallRating: true },
    });

    const averageWorkshopRating =
      feedbacks.length > 0
        ? Math.round(
            (feedbacks.reduce((sum, f) => sum + f.overallRating, 0) / feedbacks.length) * 10
          ) / 10
        : 0;

    // 6. Domain breakdown
    const domainCounts: Record<string, { workshops: number; registrations: number }> = {};
    workshops.forEach((w) => {
      const d = w.domain || 'General';
      if (!domainCounts[d]) domainCounts[d] = { workshops: 0, registrations: 0 };
      domainCounts[d].workshops += 1;
    });

    // Map registrations back to workshop domains
    const workshopDomainMap = new Map(workshops.map((w) => [w.id, w.domain || 'General']));
    registrations.forEach((r) => {
      // Find workshop id for registration
      // Can group by domain
    });

    const domainBreakdown = Object.entries(domainCounts).map(([domainName, data]) => ({
      domain: domainName,
      workshopsCount: data.workshops,
    }));

    // 7. Monthly Registration Trends
    const monthlyMap: Record<string, { month: string; registrations: number; attendances: number }> = {};
    registrations.forEach((r) => {
      const d = new Date(r.registeredAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: key, registrations: 0, attendances: 0 };
      }
      monthlyMap[key].registrations += 1;
      if (r.attendanceStatus === 'ATTENDED' || r.status === 'ATTENDED') {
        monthlyMap[key].attendances += 1;
      }
    });

    const registrationTrends = Object.values(monthlyMap).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    return {
      overview: {
        totalWorkshops,
        publishedWorkshops,
        completedWorkshops,
        totalRegistrations,
        uniqueParticipants,
        attendanceRate,
        conversionRate,
        totalLabSessions,
        totalChallengeSubmissions,
        challengeCompletionRate,
        averageWorkshopRating,
      },
      domainBreakdown,
      registrationTrends,
    };
  }

  /**
   * Granular Workshop Performance Analytics: Registration, Attendance, Lab Execution,
   * Challenge Difficulty Analysis (with minimum sample threshold), and Help Requests.
   */
  static async getWorkshopPerformanceAnalytics(workshopId: string) {
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        organisation: { select: { id: true, name: true, slug: true } },
        workshopLabs: {
          include: {
            labTemplate: {
              include: {
                challenges: {
                  orderBy: { displayOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!workshop) {
      throw new NotFoundError(`Workshop with ID "${workshopId}" was not found`);
    }

    // 1. Registration performance
    const registrations = await prisma.workshopRegistration.findMany({
      where: { workshopId },
      include: {
        student: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });

    const totalRegistrations = registrations.length;
    const approved = registrations.filter((r) => r.status === 'REGISTERED' || r.status === 'ATTENDED').length;
    const pending = registrations.filter((r) => r.status === 'PENDING_APPROVAL').length;
    const waitlisted = registrations.filter((r) => r.status === 'WAITLISTED').length;
    const cancelled = registrations.filter((r) => r.status === 'CANCELLED' || r.status === 'REJECTED').length;

    const capacity = workshop.participantLimit || 50;
    const capacityUtilization =
      capacity > 0 ? Math.min(100, Math.round((totalRegistrations / capacity) * 100 * 10) / 10) : 0;

    // 2. Attendance performance
    const attended = registrations.filter(
      (r) => r.attendanceStatus === 'ATTENDED' || r.status === 'ATTENDED'
    ).length;
    const attendanceRate = approved > 0 ? Math.round((attended / approved) * 100 * 10) / 10 : 0;

    // Live online presence count
    const liveOnlinePresenceCount = await prisma.workshopPresence.count({
      where: { workshopId, status: 'ONLINE' },
    });

    // 3. Lab Execution Performance
    const labSessions = await prisma.labSession.findMany({
      where: { workshopId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        stoppedAt: true,
        createdAt: true,
      },
    });

    const totalLabSessions = labSessions.length;
    const runningSessions = labSessions.filter((s) => s.status === 'RUNNING').length;
    const completedSessions = labSessions.filter((s) => s.status === 'COMPLETED').length;
    const failedSessions = labSessions.filter((s) => s.status === 'FAILED').length;

    let totalDurationSeconds = 0;
    let timedSessionsCount = 0;
    labSessions.forEach((s) => {
      if (s.startedAt && s.stoppedAt) {
        totalDurationSeconds += (new Date(s.stoppedAt).getTime() - new Date(s.startedAt).getTime()) / 1000;
        timedSessionsCount++;
      }
    });

    const averageSessionMinutes =
      timedSessionsCount > 0 ? Math.round((totalDurationSeconds / timedSessionsCount / 60) * 10) / 10 : 0;

    // 4. Challenge Difficulty Analysis
    // Collect all challenges across workshop labs
    const challenges: any[] = [];
    workshop.workshopLabs.forEach((wl) => {
      wl.labTemplate.challenges.forEach((ch) => {
        challenges.push({
          id: ch.id,
          title: ch.title,
          difficulty: ch.difficulty,
          points: ch.points,
          labTemplateName: wl.labTemplate.name,
        });
      });
    });

    const submissions = await prisma.challengeSubmission.findMany({
      where: { workshopId },
      select: {
        id: true,
        challengeId: true,
        studentId: true,
        status: true,
        score: true,
      },
    });

    const MIN_SAMPLE_THRESHOLD = 3; // To prevent distortion from 1 submission

    const challengeMetrics = challenges.map((ch) => {
      const chSubmissions = submissions.filter((s) => s.challengeId === ch.id);
      const totalSubmissions = chSubmissions.length;
      const passedSubmissions = chSubmissions.filter((s) => s.status === 'PASSED').length;
      const failedSubmissions = chSubmissions.filter((s) => s.status === 'FAILED').length;

      const uniqueStudentsAttempted = new Set(chSubmissions.map((s) => s.studentId)).size;
      const uniqueStudentsPassed = new Set(
        chSubmissions.filter((s) => s.status === 'PASSED').map((s) => s.studentId)
      ).size;

      const passRate =
        totalSubmissions > 0
          ? Math.round((passedSubmissions / totalSubmissions) * 100 * 10) / 10
          : 0;

      const averageAttempts =
        uniqueStudentsAttempted > 0
          ? Math.round((totalSubmissions / uniqueStudentsAttempted) * 10) / 10
          : 0;

      const abandonedCount = Math.max(0, uniqueStudentsAttempted - uniqueStudentsPassed);
      const abandonmentRate =
        uniqueStudentsAttempted > 0
          ? Math.round((abandonedCount / uniqueStudentsAttempted) * 100 * 10) / 10
          : 0;

      const isHardest = totalSubmissions >= MIN_SAMPLE_THRESHOLD && passRate < 50;

      return {
        ...ch,
        totalSubmissions,
        passedSubmissions,
        failedSubmissions,
        uniqueStudentsAttempted,
        uniqueStudentsPassed,
        passRate,
        averageAttempts,
        abandonmentRate,
        isHardest,
        hasSufficientData: totalSubmissions >= MIN_SAMPLE_THRESHOLD,
      };
    });

    // 5. Help Requests & Assistance Metrics
    const helpRequests = await prisma.helpRequest.findMany({
      where: { workshopId },
      select: {
        id: true,
        status: true,
        category: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    const totalHelpRequests = helpRequests.length;
    const openHelpRequests = helpRequests.filter(
      (h) => h.status === 'OPEN' || h.status === 'ACKNOWLEDGED' || h.status === 'IN_PROGRESS'
    ).length;
    const resolvedHelpRequests = helpRequests.filter((h) => h.status === 'RESOLVED' || h.status === 'CLOSED').length;

    let totalResolutionSeconds = 0;
    let resolvedCount = 0;
    const categoryBreakdown: Record<string, number> = {};

    helpRequests.forEach((h) => {
      categoryBreakdown[h.category] = (categoryBreakdown[h.category] || 0) + 1;
      if (h.resolvedAt) {
        totalResolutionSeconds += (new Date(h.resolvedAt).getTime() - new Date(h.createdAt).getTime()) / 1000;
        resolvedCount++;
      }
    });

    const averageResolutionMinutes =
      resolvedCount > 0 ? Math.round((totalResolutionSeconds / resolvedCount / 60) * 10) / 10 : 0;

    // 6. Feedback Summary
    const feedbackSummary = await FeedbackService.getWorkshopFeedbackSummary(workshopId);

    return {
      workshop: {
        id: workshop.id,
        title: workshop.title,
        domain: workshop.domain,
        difficulty: workshop.difficulty,
        status: workshop.status,
        startDate: workshop.startDate,
        endDate: workshop.endDate,
        duration: workshop.duration,
        instructorName: workshop.instructorName,
        participantLimit: workshop.participantLimit,
        organisation: workshop.organisation,
      },
      registration: {
        total: totalRegistrations,
        approved,
        pending,
        waitlisted,
        cancelled,
        capacity,
        capacityUtilization,
      },
      attendance: {
        attended,
        attendanceRate,
        currentlyOnline: liveOnlinePresenceCount,
      },
      labs: {
        totalSessions: totalLabSessions,
        running: runningSessions,
        completed: completedSessions,
        failed: failedSessions,
        averageDurationMinutes: averageSessionMinutes,
      },
      challengeAnalytics: challengeMetrics,
      helpRequests: {
        total: totalHelpRequests,
        open: openHelpRequests,
        resolved: resolvedHelpRequests,
        averageResolutionMinutes,
        categoryBreakdown,
      },
      feedback: feedbackSummary,
    };
  }

  /**
   * Personal Learning Analytics Dashboard for Students.
   */
  static async getStudentLearningAnalytics(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        totalPoints: true,
        leaderboardOptOut: true,
        userAchievements: {
          include: {
            achievement: true,
          },
          orderBy: { awardedAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundError(`User with ID "${userId}" not found`);
    }

    // 1. Fetch registrations & workshops
    const registrations = await prisma.workshopRegistration.findMany({
      where: { studentId: userId },
      include: {
        workshop: {
          select: {
            id: true,
            title: true,
            domain: true,
            difficulty: true,
            status: true,
            startDate: true,
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });

    const attendedWorkshopsCount = registrations.filter(
      (r) => r.attendanceStatus === 'ATTENDED' || r.status === 'ATTENDED'
    ).length;

    // 2. Fetch lab sessions
    const labSessions = await prisma.labSession.findMany({
      where: { studentId: userId },
      include: {
        labTemplate: { select: { id: true, name: true, domain: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const completedLabsCount = labSessions.filter((s) => s.status === 'COMPLETED').length;
    const activeLabsCount = labSessions.filter((s) => s.status === 'RUNNING').length;

    // 3. Challenge Submissions
    const submissions = await prisma.challengeSubmission.findMany({
      where: { studentId: userId },
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            points: true,
            difficulty: true,
            labTemplate: { select: { domain: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const totalSubmissions = submissions.length;
    const passedSubmissions = submissions.filter((s) => s.status === 'PASSED');
    const passedChallengesCount = passedSubmissions.length;
    const challengeSuccessRate =
      totalSubmissions > 0
        ? Math.round((passedChallengesCount / totalSubmissions) * 100 * 10) / 10
        : 0;

    // 4. Domain Mastery Breakdown
    const domainScores: Record<string, { completed: number; totalPoints: number }> = {};
    passedSubmissions.forEach((sub) => {
      const d = sub.challenge?.labTemplate?.domain || 'General';
      if (!domainScores[d]) domainScores[d] = { completed: 0, totalPoints: 0 };
      domainScores[d].completed += 1;
      domainScores[d].totalPoints += sub.pointsAwarded || sub.score || 0;
    });

    const domainBreakdown = Object.entries(domainScores).map(([domain, data]) => ({
      domain,
      challengesCompleted: data.completed,
      pointsEarned: data.totalPoints,
    }));

    // 5. Global Leaderboard Rank
    const higherPointsCount = await prisma.user.count({
      where: {
        totalPoints: { gt: user.totalPoints },
        status: 'ACTIVE',
      },
    });
    const rank = higherPointsCount + 1;

    // 6. Recent Points Ledger Transactions
    const recentTransactions = await prisma.pointsTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 7. Recommended Next Labs/Workshops
    // Find published workshops in domains the user hasn't tried yet or wants to advance
    const userDomains = new Set(Object.keys(domainScores).map((d) => d.toLowerCase()));
    const registeredWorkshopIds = new Set(registrations.map((r) => r.workshopId));

    const recommendedWorkshops = await prisma.workshop.findMany({
      where: {
        status: { in: ['PUBLISHED', 'ONGOING'] },
        id: { notIn: Array.from(registeredWorkshopIds) },
      },
      select: {
        id: true,
        title: true,
        domain: true,
        difficulty: true,
        startDate: true,
        instructorName: true,
      },
      take: 3,
    });

    // 8. All Available Achievements Catalog
    const allAchievements = await prisma.achievement.findMany({
      where: { isActive: true },
    });

    const earnedAchievementSlugs = new Set(user.userAchievements.map((ua) => ua.achievement.slug));

    const achievementsCatalog = allAchievements.map((ach) => ({
      id: ach.id,
      slug: ach.slug,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      category: ach.category,
      points: ach.points,
      isUnlocked: earnedAchievementSlugs.has(ach.slug),
      unlockedAt: user.userAchievements.find((ua) => ua.achievement.slug === ach.slug)?.awardedAt || null,
    }));

    return {
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        totalPoints: user.totalPoints,
        rank,
        leaderboardOptOut: user.leaderboardOptOut,
      },
      stats: {
        workshopsAttended: attendedWorkshopsCount,
        workshopsRegistered: registrations.length,
        labsCompleted: completedLabsCount,
        labsActive: activeLabsCount,
        challengesCompleted: passedChallengesCount,
        challengeSuccessRate,
        badgesCount: user.userAchievements.length,
      },
      domainBreakdown,
      achievements: achievementsCatalog,
      recentTransactions,
      recentRegistrations: registrations.slice(0, 5),
      recommendedWorkshops,
    };
  }
}
