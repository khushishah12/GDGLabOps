import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resetPasswordSchema } from '@/lib/validations';
import { hashPassword, hashToken } from '@/lib/auth/password';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ValidationError, NotFoundError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || 'Invalid password reset input';
      throw new ValidationError(issue);
    }

    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);

    // 1. Locate and validate active token
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord) {
      throw new ValidationError('Invalid or expired password reset token.');
    }

    if (new Date() > tokenRecord.expiresAt) {
      await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } });
      throw new ValidationError('Password reset token has expired. Please request a new one.');
    }

    // 2. Find User
    const user = await prisma.user.findUnique({
      where: { email: tokenRecord.email },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundError('User associated with this token no longer exists.');
    }

    // 3. Hash New Password
    const passwordHash = await hashPassword(password);

    // 4. Update Password and Clean up Token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { email: tokenRecord.email },
      }),
    ]);

    return apiSuccess({ success: true }, 'Password has been reset successfully. You can now log in.');
  } catch (error) {
    return apiError(error);
  }
}
