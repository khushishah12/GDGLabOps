import { NextRequest } from 'next/server';
import { StudentService } from '@/lib/services/student.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let studentId = searchParams.get('studentId');

    if (!studentId) {
      const student = await prisma.user.findFirst({
        where: { role: 'STUDENT' },
      });
      studentId = student?.id || null;
    }

    if (!studentId) {
      return apiSuccess([]);
    }

    const achievements = await StudentService.getAchievements(studentId);
    return apiSuccess(achievements);
  } catch (err) {
    return apiError(err);
  }
}
