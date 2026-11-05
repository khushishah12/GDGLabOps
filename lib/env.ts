import { z } from 'zod';

const placeholderDbUrl =
  'postgresql://neondb_owner:npg_placeholder_pwd@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true';

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .default(placeholderDbUrl)
    .refine(
      (url) => url.startsWith('postgres://') || url.startsWith('postgresql://'),
      'DATABASE_URL must be a valid PostgreSQL connection string'
    ),
  DIRECT_URL: z
    .string()
    .optional()
    .refine(
      (url) => !url || url.startsWith('postgres://') || url.startsWith('postgresql://'),
      'DIRECT_URL must be a valid PostgreSQL connection string'
    ),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().min(16).default('gdg-labops-development-secret-32-chars-long'),
});

export function getValidatedEnv() {
  const rawUrl = process.env.DATABASE_URL || placeholderDbUrl;
  const rawDirect = process.env.DIRECT_URL || rawUrl.replace('-pooler', '').replace('&pgbouncer=true', '');

  const parsed = envSchema.safeParse({
    DATABASE_URL: rawUrl,
    DIRECT_URL: rawDirect,
    NODE_ENV: process.env.NODE_ENV || 'development',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'gdg-labops-development-secret-32-chars-long',
  });

  if (!parsed.success) {
    return {
      DATABASE_URL: placeholderDbUrl,
      DIRECT_URL: placeholderDbUrl.replace('-pooler', '').replace('&pgbouncer=true', ''),
      NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      NEXTAUTH_SECRET: 'gdg-labops-development-secret-32-chars-long',
    };
  }

  return parsed.data;
}

export const env = getValidatedEnv();
