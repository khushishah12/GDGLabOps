import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/auth/password';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { UserStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      throw new ValidationError('A verification token is required.');
    }

    const tokenHash = hashToken(token);

    // 1. Locate Token
    const tokenRecord = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord) {
      throw new ValidationError('Invalid or expired email verification token.');
    }

    if (new Date() > tokenRecord.expiresAt) {
      await prisma.emailVerificationToken.delete({ where: { id: tokenRecord.id } });
      throw new ValidationError('Verification token has expired. Please request a new verification link.');
    }

    // 2. Locate User and Mark Verified
    const user = await prisma.user.findUnique({
      where: { email: tokenRecord.email },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundError('User associated with this verification token no longer exists.');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.emailVerificationToken.deleteMany({
        where: { email: tokenRecord.email },
      }),
    ]);

    return apiSuccess({ verified: true }, 'Email verified successfully. Your account is active.');
  } catch (error) {
    return apiError(error);
  }
}
