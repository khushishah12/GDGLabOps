import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/validations';
import { generateCryptoToken, hashToken } from '@/lib/auth/password';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('A valid email address is required.');
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim();

    // 1. Query User
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    // 2. Generic response prevents account enumeration
    const genericResponse = 'If an account exists with this email, password reset instructions have been dispatched.';

    if (!user) {
      return apiSuccess({ sent: true }, genericResponse);
    }

    // 3. Generate Cryptographic Token
    const rawToken = generateCryptoToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    // 4. Invalidate Previous Tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    });

    // 5. Store Secure Token Hash
    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        expiresAt,
      },
    });

    // 6. Development Workflow Email Dispatching (Logged securely on server console)
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
    console.log(`\n======================================================`);
    console.log(`🔑 [DEV AUTH NOTIFICATION] Password Reset Requested`);
    console.log(`Recipient: ${normalizedEmail}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Token expires: ${expiresAt.toISOString()}`);
    console.log(`======================================================\n`);

    return apiSuccess({ sent: true, resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined }, genericResponse);
  } catch (error) {
    return apiError(error);
  }
}
