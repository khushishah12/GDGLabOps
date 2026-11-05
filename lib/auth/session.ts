import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/prisma';
import { Role, UserStatus } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatar: string | null;
  memberships: {
    organisationId: string;
    role: string;
    status: string;
  }[];
}

/**
 * Retrieve the current NextAuth session on the server
 */
export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

/**
 * Retrieve the full authenticated user record with organisation memberships
 * Returns null if not logged in or account is suspended
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          select: {
            organisationId: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!user || user.status === UserStatus.SUSPENDED) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      memberships: user.memberships,
    };
  } catch (error) {
    console.error('[getCurrentUser Error]:', error);
    return null;
  }
}
