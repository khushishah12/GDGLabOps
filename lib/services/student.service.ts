import prisma from '@/lib/prisma';
import { NotFoundError } from '@/lib/errors';

export class StudentService {
  static async getProfile(studentId: string) {
    const user = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        _count: {
          select: {
            registrations: { where: { status: 'REGISTERED' } },
            labSessions: true,
            userAchievements: true,
            submissions: { where: { status: 'PASSED' } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError(`Student with ID "${studentId}" was not found`);
    }

    // Calculate total earned points from passed submissions
    const passedSubmissions = await prisma.challengeSubmission.findMany({
      where: { studentId, status: 'PASSED' },
      select: { score: true },
    });
    const totalPoints = passedSubmissions.reduce((acc, curr) => acc + curr.score, 0);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      totalPoints,
      enrolledWorkshopsCount: user._count.registrations,
      solvedChallengesCount: user._count.submissions,
      unlockedAchievementsCount: user._count.userAchievements,
      createdAt: user.createdAt,
    };
  }

  static async getEnrolledWorkshops(studentId: string) {
    return prisma.workshopRegistration.findMany({
      where: { studentId, status: 'REGISTERED' },
      orderBy: { registeredAt: 'desc' },
      include: {
        workshop: {
          include: {
            organisation: { select: { id: true, name: true, slug: true } },
            workshopLabs: {
              include: { labTemplate: true },
            },
            studentProgress: {
              where: { studentId },
            },
          },
        },
      },
    });
  }

  static async getProgress(studentId: string, workshopId?: string) {
    const where: any = { studentId };
    if (workshopId) {
      where.workshopId = workshopId;
    }

    return prisma.studentProgress.findMany({
      where,
      include: {
        workshop: { select: { id: true, title: true, domain: true } },
        labTemplate: { select: { id: true, name: true, domain: true } },
      },
    });
  }

  static async getAchievements(studentId: string) {
    const allAchievements = await prisma.achievement.findMany({
      include: {
        userAchievements: {
          where: { userId: studentId },
        },
      },
    });

    return allAchievements.map((ach) => ({
      id: ach.id,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      category: ach.category,
      points: ach.points,
      isUnlocked: ach.userAchievements.length > 0,
      awardedAt: ach.userAchievements[0]?.awardedAt || null,
    }));
  }
}
