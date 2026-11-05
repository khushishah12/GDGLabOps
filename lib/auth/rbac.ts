import { getCurrentUser, AuthenticatedUser } from '@/lib/auth/session';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { Role, OrganisationRole, UserStatus } from '@prisma/client';

/**
 * Ensures the request is from an authenticated user whose account is ACTIVE
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError('Authentication required. Please log in.');
  }
  if (user.status === UserStatus.SUSPENDED) {
    throw new ForbiddenError('Your account has been suspended. Please contact platform administrators.');
  }
  return user;
}

/**
 * Requires SUPER_ADMIN role for platform-wide operations
 */
export async function requireSuperAdmin(): Promise<AuthenticatedUser> {
  const user = await requireAuthenticatedUser();
  if (user.role !== Role.SUPER_ADMIN) {
    throw new ForbiddenError('Access restricted to Super Administrators only.');
  }
  return user;
}

/**
 * Requires ORGANISER or SUPER_ADMIN role
 */
export async function requireOrganiser(): Promise<AuthenticatedUser> {
  const user = await requireAuthenticatedUser();
  if (user.role !== Role.ORGANISER && user.role !== Role.SUPER_ADMIN) {
    throw new ForbiddenError('Organiser permissions required for this resource.');
  }
  return user;
}

/**
 * Requires an active STUDENT role (or any authenticated user for student views)
 */
export async function requireStudent(): Promise<AuthenticatedUser> {
  return requireAuthenticatedUser();
}

/**
 * Validates that an organiser belongs to a specific organisation with appropriate role
 * Prevents Insecure Direct Object Reference (IDOR) attacks across different chapters
 */
export async function requireOrganisationMembership(
  organisationId: string,
  allowedRoles?: OrganisationRole[]
): Promise<{ user: AuthenticatedUser; roleInOrg: OrganisationRole }> {
  const user = await requireAuthenticatedUser();

  // Super Admin bypasses individual chapter membership check
  if (user.role === Role.SUPER_ADMIN) {
    return { user, roleInOrg: OrganisationRole.OWNER };
  }

  const membership = user.memberships.find(
    (m) => m.organisationId === organisationId && m.status === 'ACTIVE'
  );

  if (!membership) {
    throw new ForbiddenError('IDOR Violation: You do not have an active membership in this organisation.');
  }

  const roleInOrg = membership.role as OrganisationRole;

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(roleInOrg)) {
    throw new ForbiddenError(`Insufficient organisation role. Required: [${allowedRoles.join(', ')}]`);
  }

  return { user, roleInOrg };
}

/**
 * Validates that the current user owns or administers the specified workshop
 */
export async function requireWorkshopOwnership(workshopId: string) {
  const user = await requireAuthenticatedUser();

  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    select: {
      id: true,
      title: true,
      organisationId: true,
      organiserId: true,
      status: true,
    },
  });

  if (!workshop) {
    throw new NotFoundError('Workshop not found.');
  }

  // Super Admin has global override
  if (user.role === Role.SUPER_ADMIN) {
    return { user, workshop };
  }

  // Workshop owner has direct control
  if (workshop.organiserId === user.id) {
    return { user, workshop };
  }

  // Organisation Admins/Owners also have governance
  const orgMembership = user.memberships.find(
    (m) => m.organisationId === workshop.organisationId && m.status === 'ACTIVE'
  );

  if (
    orgMembership &&
    (orgMembership.role === OrganisationRole.OWNER || orgMembership.role === OrganisationRole.ADMIN)
  ) {
    return { user, workshop };
  }

  throw new ForbiddenError('You do not have permission to manage this workshop.');
}
