import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validations';
import { hashPassword } from '@/lib/auth/password';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ConflictError, ValidationError } from '@/lib/errors';
import { Role, UserStatus, OrganisationRole } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Strict Payload Validation
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      throw new ValidationError('Validation failed on registration fields', issues);
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 2. Prevent Duplicate Email Registration
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError('An account with this email address already exists.');
    }

    // 3. Securely Hash Password with Bcrypt (12 rounds)
    const passwordHash = await hashPassword(password);

    // 4. Create User Record (Default role: STUDENT, never elevated via registration)
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        createdAt: true,
      },
    });

    // 5. Automatically link new student as MEMBER in the default community chapter if it exists
    const defaultOrg = await prisma.organisation.findFirst({
      select: { id: true },
    });

    if (defaultOrg) {
      await prisma.organisationMembership.create({
        data: {
          organisationId: defaultOrg.id,
          userId: user.id,
          role: OrganisationRole.MEMBER,
        },
      }).catch(() => {
        // Membership creation is non-blocking on signup
      });
    }

    return apiSuccess(user, 'Account registered successfully. You can now log in.', 201);
  } catch (error) {
    return apiError(error);
  }
}
