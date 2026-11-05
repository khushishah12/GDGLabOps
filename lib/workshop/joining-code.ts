import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Non-ambiguous uppercase characters (omits 0, O, 1, I to prevent human error)
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate a cryptographically random, human-friendly joining code
 * Example output: GDG-CLOUD-7X9P2 or GDG-SEC-8M3KQ
 */
export function generateRandomCode(categoryPrefix: string = 'DEV', length: number = 5): string {
  const cleanPrefix = categoryPrefix
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 5) || 'LAB';

  const bytes = crypto.randomBytes(length);
  let randomSuffix = '';
  for (let i = 0; i < length; i++) {
    randomSuffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }

  return `GDG-${cleanPrefix}-${randomSuffix}`;
}

/**
 * Generate a unique joining code verified against the Neon database
 */
export async function generateUniqueJoiningCode(categoryPrefix: string = 'DEV'): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const candidateCode = generateRandomCode(categoryPrefix);
    const existing = await prisma.workshop.findUnique({
      where: { registrationCode: candidateCode },
      select: { id: true },
    });

    if (!existing) {
      return candidateCode;
    }
    attempts++;
  }

  // Fallback with timestamp entropy
  return `GDG-${categoryPrefix.toUpperCase().slice(0, 4)}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

/**
 * Sanitize and validate incoming registration code format
 */
export function sanitizeJoiningCode(input: string): string {
  return input.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
}
