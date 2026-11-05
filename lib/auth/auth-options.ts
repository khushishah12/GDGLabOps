import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit';
import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'gdg-labops-development-secret-32-chars-long',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@campus.dev' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error('INVALID_INPUT');
        }

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Rate Limiting Check (Max 5 attempts per 15 minutes)
        const rateLimitKey = `login:${normalizedEmail}`;
        const rateLimit = checkRateLimit(rateLimitKey, 5, 900);
        if (!rateLimit.success) {
          throw new Error(`RATE_LIMITED: Too many failed login attempts. Please try again in ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes.`);
        }

        // 2. Query User
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
            status: true,
            avatar: true,
          },
        });

        // 3. Generic error for nonexistent user or missing password
        if (!user || !user.passwordHash) {
          throw new Error('INVALID_CREDENTIALS');
        }

        // 4. Verify Account Status
        if (user.status === UserStatus.SUSPENDED) {
          throw new Error('ACCOUNT_SUSPENDED');
        }

        // 5. Verify Password Hash
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          throw new Error('INVALID_CREDENTIALS');
        }

        // 6. Reset Rate Limit on success
        resetRateLimit(rateLimitKey);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
        };
      },
    }),
    // Google OAuth provider placeholder for future expansion:
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.avatar = user.avatar;
      }

      // Handle programmatic session updates
      if (trigger === 'update' && session?.user) {
        if (session.user.name) token.name = session.user.name;
        if (session.user.avatar !== undefined) token.avatar = session.user.avatar;
      }

      // Verification on subsequent token calls to revoke access if user is suspended
      if (token.id && !user) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { status: true, role: true },
          });
          if (freshUser) {
            token.status = freshUser.status;
            token.role = freshUser.role;
          }
        } catch {
          // Gracefully maintain cached token in offline / test setups
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.status = token.status as UserStatus;
        session.user.avatar = (token.avatar as string) || null;
      }
      return session;
    },
  },
};
