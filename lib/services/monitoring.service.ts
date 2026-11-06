import { prisma } from '@/lib/prisma';
import { PresenceService } from './presence.service';
import { ActivityService } from './activity.service';
import { NotFoundError, ForbiddenError } from '@/lib/errors';

export class MonitoringService {
  /**
   * Aggregate live telemetry, presence, lab sessions, and challenge progress for a workshop
   */
  static async getWorkshopLiveSummary(workshopId: string, userId?: string) {
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        organisation: true,
        workshopLabs: {
          include: {
            labTemplate: {
              include: {
                challenges: {
                  select: { id: true, title: true, points: true, displayOrder: true },
                  orderBy: { displayOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!workshop) {
      throw new NotFoundError(`Workshop "${workshopId}" not found`);
    }

    // 1. Participant Presences
    const presenceData = await PresenceService.getWorkshopPresences(workshopId);

    // 2. Workshop Registrations
    const registrations = await prisma.workshopRegistration.findMany({
      where: { workshopId },
      include: {
        student: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    const registeredStudents = registrations.filter((r) => r.status === 'REGISTERED');
    const pendingApprovalCount = registrations.filter((r) => r.status === 'PENDING_APPROVAL').length;
    const waitlistedCount = registrations.filter((r) => r.status === 'WAITLISTED').length;

    // 3. Lab Sessions Status
    const labSessions = await prisma.labSession.findMany({
      where: { workshopId },
      select: {
        id: true,
        studentId: true,
        status: true,
        environmentProfile: true,
        startedAt: true,
        lastActivityAt: true,
        student: { select: { id: true, name: true, email: true } },
      },
    });

    const activeSessions = labSessions.filter((s) => s.status === 'RUNNING');
    const provisioningSessions = labSessions.filter((s) => s.status === 'PROVISIONING');
    const queuedSessions = labSessions.filter((s) => s.status === 'PENDING');
    const failedSessions = labSessions.filter((s) => s.status === 'FAILED');
    const stoppedSessions = labSessions.filter((s) =>
      ['STOPPED', 'COMPLETED', 'TERMINATED', 'EXPIRED'].includes(s.status)
    );

    // 4. Challenge Progress Breakdown
    const studentProgressRecords = await prisma.studentProgress.findMany({
      where: { workshopId },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
    });

    const totalChallengesCount = workshop.workshopLabs.reduce(
      (acc, wl) => acc + (wl.labTemplate.challenges?.length || 0),
      0
    );

    // Map each registered student with their live presence, lab session, and progress
    const studentRoster = registeredStudents.map((reg) => {
      const presence = presenceData.participants.find((p) => p.userId === reg.studentId);
      const session = labSessions.find(
        (s) => s.studentId === reg.studentId && ['RUNNING', 'PROVISIONING', 'PENDING'].includes(s.status)
      );
      const progress = studentProgressRecords.find((p) => p.studentId === reg.studentId);

      return {
        studentId: reg.student.id,
        name: reg.student.name,
        email: reg.student.email,
        avatar: reg.student.avatar,
        registeredAt: reg.registeredAt,
        presenceStatus: presence?.status || 'OFFLINE',
        lastHeartbeat: presence?.lastHeartbeat || null,
        activeSession: session
          ? {
              id: session.id,
              status: session.status,
              profile: session.environmentProfile,
              startedAt: session.startedAt,
            }
          : null,
        progress: {
          completedChallenges: progress?.completedChallenges || 0,
          totalChallenges: totalChallengesCount,
          totalPoints: progress?.totalPoints || 0,
          percentage: progress?.completionPercentage || 0,
          status:
            !progress || progress.completedChallenges === 0
              ? 'NOT_STARTED'
              : progress.completedChallenges >= totalChallengesCount
              ? 'COMPLETED'
              : 'IN_PROGRESS',
        },
      };
    });

    // 5. Help Requests Queue
    const helpRequests = await prisma.helpRequest.findMany({
      where: {
        workshopId,
        status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
      },
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
        assignedOrganiser: { select: { id: true, name: true, email: true } },
        challenge: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 6. Chronological Activity Timeline (latest 20 events)
    const recentActivity = await ActivityService.list({
      workshopId,
      limit: 20,
    });

    // 7. Recent Announcements
    const recentAnnouncements = await prisma.workshopAnnouncement.findMany({
      where: { workshopId, status: 'PUBLISHED' },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: 5,
    });

    return {
      workshop: {
        id: workshop.id,
        title: workshop.title,
        slug: workshop.slug,
        domain: workshop.domain,
        status: workshop.status,
        startDate: workshop.startDate,
        endDate: workshop.endDate,
        organisation: {
          id: workshop.organisation.id,
          name: workshop.organisation.name,
        },
      },
      participation: {
        totalRegistered: registeredStudents.length,
        currentlyActive: presenceData.online,
        idleCount: presenceData.idle,
        offlineCount: presenceData.offline,
        pendingApprovals: pendingApprovalCount,
        waitlistedCount,
        currentlyInLab: activeSessions.length,
      },
      labs: {
        activeCount: activeSessions.length,
        provisioningCount: provisioningSessions.length,
        queuedCount: queuedSessions.length,
        failedCount: failedSessions.length,
        completedCount: stoppedSessions.length,
      },
      challenges: {
        totalChallengesCount,
        completedStudentsCount: studentRoster.filter((s) => s.progress.status === 'COMPLETED').length,
        inProgressStudentsCount: studentRoster.filter((s) => s.progress.status === 'IN_PROGRESS').length,
        notStartedStudentsCount: studentRoster.filter((s) => s.progress.status === 'NOT_STARTED').length,
      },
      roster: studentRoster,
      helpRequests,
      recentActivity: recentActivity.items,
      recentAnnouncements,
    };
  }
}
