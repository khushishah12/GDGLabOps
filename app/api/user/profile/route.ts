import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth/rbac';
import { updateProfileSchema } from '@/lib/validations';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors';

export async function GET() {
  try {
    const authUser = await requireAuthenticatedUser();

    const profile = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
        memberships: {
          include: {
            organisation: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    return apiSuccess(profile);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireAuthenticatedUser();
    const body = await req.json();

    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid profile update parameters');
    }

    // Explicitly reject any attempt to escalate role or modify email
    if ('role' in body || 'email' in body || 'status' in body) {
      throw new ValidationError('Security restriction: Cannot modify role, email, or account status via profile endpoint.');
    }

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.avatar !== undefined ? { avatar: parsed.data.avatar } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        updatedAt: true,
      },
    });

    return apiSuccess(updated, 'Profile updated successfully');
  } catch (error) {
    return apiError(error);
  }
}
