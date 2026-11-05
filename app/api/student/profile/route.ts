import { NextRequest } from 'next/server';
import { StudentService } from '@/lib/services/student.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let studentId = searchParams.get('studentId');

    // Default to the first student in database for development testing if not specified
    if (!studentId) {
      const student = await prisma.user.findFirst({
        where: { role: 'STUDENT' },
      });
      studentId = student?.id || null;
    }

    if (!studentId) {
      return apiSuccess({
        name: 'Elena Rostova',
        email: 'elena.rostova@university.edu',
        role: 'STUDENT',
        totalPoints: 850,
        enrolledWorkshopsCount: 2,
        solvedChallengesCount: 14,
        unlockedAchievementsCount: 4,
      });
    }

    const profile = await StudentService.getProfile(studentId);
    return apiSuccess(profile);
  } catch (err) {
    return apiError(err);
  }
}
