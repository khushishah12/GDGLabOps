import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth/rbac';
import { changePasswordSchema } from '@/lib/validations';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ValidationError, ForbiddenError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuthenticatedUser();
    const body = await req.json();

    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || 'Invalid password payload';
      throw new ValidationError(issue);
    }

    const { currentPassword, newPassword } = parsed.data;

    // 1. Fetch user's current password hash
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new ForbiddenError('Account does not have a local password configured.');
    }

    // 2. Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new ValidationError('Current password is incorrect.');
    }

    // 3. Hash new password and save
    const newPasswordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return apiSuccess({ success: true }, 'Password changed successfully.');
  } catch (error) {
    return apiError(error);
  }
}
