import { NextRequest, NextResponse } from 'next/server';
import { StudentService } from '@/lib/services/student.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import prisma from '@/lib/prisma';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_STUDENT_ID = '50409751-b925-4de7-a23d-9e68026c00ee';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let studentId = searchParams.get('studentId');

    // If studentId is not a valid UUID (e.g. legacy 'user-stu-1'), or null, map to default student
    if (!studentId || !UUID_REGEX.test(studentId)) {
      studentId = DEFAULT_STUDENT_ID;
    }

    // Verify user exists in database, otherwise fallback to first registered student
    let user = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { role: 'STUDENT' },
        select: { id: true },
      });
      studentId = user?.id || DEFAULT_STUDENT_ID;
    }

    const enrolled = await StudentService.getEnrolledWorkshops(studentId);
    const response = apiSuccess(enrolled);
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=60');
    return response;
  } catch (err) {
    return apiError(err);
  }
}
