import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/rbac';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { UserStatus, Role } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin();

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          include: {
            organisation: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    return apiSuccess(user);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, status: true },
    });

    if (!user) {
      throw new NotFoundError('Target user not found.');
    }

    // Safety: prevent super admin from suspending themselves
    if (user.id === admin.id && body.status === UserStatus.SUSPENDED) {
      throw new ValidationError('You cannot suspend your own Super Administrator account.');
    }

    // Safety: prevent super admin from demoting themselves if they are the only super admin
    if (user.id === admin.id && body.role && body.role !== Role.SUPER_ADMIN) {
      throw new ValidationError('You cannot revoke your own Super Administrator privileges.');
    }

    const dataToUpdate: { status?: UserStatus; role?: Role } = {};

    if (body.status) {
      if (!Object.values(UserStatus).includes(body.status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${Object.values(UserStatus).join(', ')}`);
      }
      dataToUpdate.status = body.status;
    }

    if (body.role) {
      if (!Object.values(Role).includes(body.role)) {
        throw new ValidationError(`Invalid role. Must be one of: ${Object.values(Role).join(', ')}`);
      }
      dataToUpdate.role = body.role;
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return apiSuccess(updated, 'User administrative status updated successfully.');
  } catch (error) {
    return apiError(error);
  }
}
