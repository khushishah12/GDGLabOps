import { NextRequest } from 'next/server';
import { SessionService } from '@/lib/services/session.service';
import { getCurrentUser } from '@/lib/auth/session';
import { createLabSessionSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { UnauthorizedError } from '@/lib/errors';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    // Resolve studentId from session or body
    let studentId = user?.id || body.studentId;
    if (!studentId) {
      // In dev fallback, lookup default student
      const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
      studentId = student?.id;
    }

    if (!studentId) {
      return apiError(new UnauthorizedError('Authentication required: student identity could not be resolved'));
    }

    const validated = createLabSessionSchema.parse({
      ...body,
      studentId,
    });

    const session = await SessionService.create(validated);
    return apiSuccess(session, 'Lab environment provisioned and ready', 201);
  } catch (err) {
    return apiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    let studentId = user?.id || searchParams.get('studentId');

    if (!studentId) {
      const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
      studentId = student?.id || null;
    }

    if (!studentId) {
      return apiSuccess(null);
    }

    const activeSession = await SessionService.getActiveByStudent(studentId);
    return apiSuccess(activeSession);
  } catch (err) {
    return apiError(err);
  }
}
