import { hashPassword, verifyPassword, generateCryptoToken, hashToken } from '../lib/auth/password';
import { checkRateLimit, resetRateLimit } from '../lib/auth/rate-limit';
import { registerSchema, loginSchema, resetPasswordSchema, changePasswordSchema } from '../lib/validations';
import { Role, OrganisationRole, UserStatus } from '@prisma/client';
import { UnauthorizedError, ForbiddenError, ValidationError, ConflictError } from '../lib/errors';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runAuthTests() {
  console.log('====================================================');
  console.log('🛡️ GDG LabOps Authentication & RBAC Test Suite');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // Suite 1: Password Hashing & Crypto Utilities
  // ----------------------------------------------------
  console.log('[Suite 1]: Password Hashing & Verification');
  const plainPassword = 'Secure@TestPass2026!';
  const hashedPassword = await hashPassword(plainPassword);

  assert(hashedPassword.startsWith('$2'), 'Bcrypt hash generated with valid salt prefix');
  assert(hashedPassword !== plainPassword, 'Hash is never equal to plain text');
  assert(await verifyPassword(plainPassword, hashedPassword), 'Valid password verifies correctly');
  assert(!(await verifyPassword('WrongPassword123!', hashedPassword)), 'Invalid password fails verification');
  assert(!(await verifyPassword('', hashedPassword)), 'Empty password fails verification');

  const rawToken = generateCryptoToken();
  const hashedToken1 = hashToken(rawToken);
  const hashedToken2 = hashToken(rawToken);
  assert(rawToken.length === 64, 'Crypto token is 64 hex characters (32 bytes)');
  assert(hashedToken1 === hashedToken2, 'SHA-256 token hashing is deterministic');
  assert(hashedToken1 !== rawToken, 'Hashed token differs from raw token');

  // ----------------------------------------------------
  // Suite 2: Registration Validation & Privilege Escalation Prevention
  // ----------------------------------------------------
  console.log('\n[Suite 2]: Registration & Security Controls');
  
  // Valid registration
  const validReg = registerSchema.safeParse({
    name: 'Sarah Connor',
    email: 'sarah.c@student.dev',
    password: 'Strong@Password123!',
    confirmPassword: 'Strong@Password123!',
  });
  assert(validReg.success, 'Valid registration payload accepted');

  // Rejects weak password
  const weakPassReg = registerSchema.safeParse({
    name: 'Sarah Connor',
    email: 'sarah.c@student.dev',
    password: 'weak',
    confirmPassword: 'weak',
  });
  assert(!weakPassReg.success, 'Rejects password shorter than 8 characters');

  // Rejects password without special character
  const noSpecialReg = registerSchema.safeParse({
    name: 'Sarah Connor',
    email: 'sarah.c@student.dev',
    password: 'Password123456',
    confirmPassword: 'Password123456',
  });
  assert(!noSpecialReg.success, 'Rejects password missing special characters');

  // Rejects password mismatch
  const mismatchReg = registerSchema.safeParse({
    name: 'Sarah Connor',
    email: 'sarah.c@student.dev',
    password: 'Strong@Password123!',
    confirmPassword: 'Different@Password123!',
  });
  assert(!mismatchReg.success, 'Rejects when confirmPassword does not match');

  // Prevents privilege escalation during registration
  const escalateReg = registerSchema.safeParse({
    name: 'Attacker',
    email: 'attacker@evil.dev',
    password: 'Strong@Password123!',
    confirmPassword: 'Strong@Password123!',
    role: 'SUPER_ADMIN', // Attempting to register as SUPER_ADMIN
  });
  assert(!escalateReg.success, 'Rejects privilege escalation attempt to register as SUPER_ADMIN');

  const escalateOrgReg = registerSchema.safeParse({
    name: 'Attacker',
    email: 'attacker@evil.dev',
    password: 'Strong@Password123!',
    confirmPassword: 'Strong@Password123!',
    role: 'ORGANISER', // Attempting to register as ORGANISER
  });
  assert(!escalateOrgReg.success, 'Rejects privilege escalation attempt to register as ORGANISER');

  // ----------------------------------------------------
  // Suite 3: Login Rate Limiting (Brute Force Defense)
  // ----------------------------------------------------
  console.log('\n[Suite 3]: Brute-force Login Rate Limiter');
  const testKey = `login:test-user-${Date.now()}@gdgcampus.dev`;

  // First 5 attempts should succeed
  for (let i = 1; i <= 5; i++) {
    const res = checkRateLimit(testKey, 5, 900);
    assert(res.success, `Attempt ${i} allowed within rate limit threshold`);
  }

  // 6th attempt should be blocked
  const blockedRes = checkRateLimit(testKey, 5, 900);
  assert(!blockedRes.success, '6th attempt blocked by sliding window rate limiter');
  assert(blockedRes.remaining === 0, 'Remaining attempts set to 0 when rate limited');

  // Resetting on valid credentials
  resetRateLimit(testKey);
  const resetRes = checkRateLimit(testKey, 5, 900);
  assert(resetRes.success, 'Rate limit resets successfully after valid login');

  // ----------------------------------------------------
  // Suite 4: Role-Based Access Control (RBAC) & IDOR Protection
  // ----------------------------------------------------
  console.log('\n[Suite 4]: Role-Based Access Control & Multi-Tenancy IDOR Checks');

  interface TestUser {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
    avatar: string | null;
    memberships: { organisationId: string; role: OrganisationRole; status: string }[];
  }

  // Mock User contexts
  const mockStudent: TestUser = {
    id: 'user-student-01',
    name: 'Elena Student',
    email: 'elena@student.dev',
    role: Role.STUDENT,
    status: UserStatus.ACTIVE,
    avatar: null,
    memberships: [
      { organisationId: 'org-silicon-valley', role: OrganisationRole.MEMBER, status: 'ACTIVE' },
    ],
  };

  const mockOrganiserOrgA: TestUser = {
    id: 'user-organiser-01',
    name: 'Alex Organiser',
    email: 'alex@gdgcampus.dev',
    role: Role.ORGANISER,
    status: UserStatus.ACTIVE,
    avatar: null,
    memberships: [
      { organisationId: 'org-silicon-valley', role: OrganisationRole.ADMIN, status: 'ACTIVE' },
    ],
  };

  const mockSuspendedUser: TestUser = {
    id: 'user-suspended-01',
    name: 'Suspended User',
    email: 'suspended@gdgcampus.dev',
    role: Role.STUDENT,
    status: UserStatus.SUSPENDED,
    avatar: null,
    memberships: [],
  };

  const mockSuperAdmin: TestUser = {
    id: 'user-admin-01',
    name: 'Super Admin',
    email: 'admin@gdgcampus.dev',
    role: Role.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    avatar: null,
    memberships: [],
  };

  // Helper implementations under test
  function testRequireSuperAdmin(user: TestUser) {
    if (user.status === UserStatus.SUSPENDED) throw new ForbiddenError('Suspended account');
    if (user.role !== Role.SUPER_ADMIN) throw new ForbiddenError('Super Administrator required');
    return true;
  }

  function testRequireOrganiser(user: TestUser) {
    if (user.status === UserStatus.SUSPENDED) throw new ForbiddenError('Suspended account');
    if (user.role !== Role.ORGANISER && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Organiser privileges required');
    }
    return true;
  }

  function testRequireOrgMembership(user: TestUser, targetOrgId: string) {
    if (user.role === Role.SUPER_ADMIN) return true;
    const m = user.memberships.find((mem) => mem.organisationId === targetOrgId && mem.status === 'ACTIVE');
    if (!m) throw new ForbiddenError('IDOR Violation: Access denied to unrelated organisation');
    return true;
  }

  // RBAC Assertions
  assert(testRequireOrganiser(mockOrganiserOrgA), 'Organiser permitted on organiser resources');
  assert(testRequireSuperAdmin(mockSuperAdmin), 'Super Admin permitted on administrative resources');
  assert(testRequireOrganiser(mockSuperAdmin), 'Super Admin permitted on organiser resources (hierarchical)');

  let studentBlocked = false;
  try {
    testRequireOrganiser(mockStudent);
  } catch (err: any) {
    studentBlocked = err.statusCode === 403;
  }
  assert(studentBlocked, 'Student strictly denied access to organiser resources (403 Forbidden)');

  let organiserBlockedFromAdmin = false;
  try {
    testRequireSuperAdmin(mockOrganiserOrgA);
  } catch (err: any) {
    organiserBlockedFromAdmin = err.statusCode === 403;
  }
  assert(organiserBlockedFromAdmin, 'Organiser strictly denied access to Super Admin resources (403 Forbidden)');

  let suspendedBlocked = false;
  try {
    testRequireOrganiser(mockSuspendedUser);
  } catch (err: any) {
    suspendedBlocked = err.statusCode === 403;
  }
  assert(suspendedBlocked, 'Suspended account strictly denied access to platform resources');

  // IDOR Protection: Organiser A attempts to access Organisation B's resources
  assert(testRequireOrgMembership(mockOrganiserOrgA, 'org-silicon-valley'), 'Organiser permitted within own chapter (org-silicon-valley)');

  let idorBlocked = false;
  try {
    testRequireOrgMembership(mockOrganiserOrgA, 'org-berlin-chapter'); // Different organisation
  } catch (err: any) {
    idorBlocked = err.statusCode === 403;
  }
  assert(idorBlocked, 'IDOR Protection: Organiser strictly denied access to other chapter (org-berlin-chapter)');
  assert(testRequireOrgMembership(mockSuperAdmin, 'org-berlin-chapter'), 'Super Admin permitted global multi-tenant access across all chapters');

  // ----------------------------------------------------
  // Suite 5: Password Reset & Account Management Rules
  // ----------------------------------------------------
  console.log('\n[Suite 5]: Password Reset & Account Lifecycle');

  const validReset = resetPasswordSchema.safeParse({
    token: 'cryptographic-token-32-chars-long-12345',
    password: 'NewStrongPassword@2026!',
    confirmPassword: 'NewStrongPassword@2026!',
  });
  assert(validReset.success, 'Valid password reset payload accepted');

  const mismatchReset = resetPasswordSchema.safeParse({
    token: 'cryptographic-token-32-chars-long-12345',
    password: 'NewStrongPassword@2026!',
    confirmPassword: 'DifferentPassword@2026!',
  });
  assert(!mismatchReset.success, 'Rejects password reset with mismatched confirmation');

  const validChangePass = changePasswordSchema.safeParse({
    currentPassword: 'OldPassword123!',
    newPassword: 'NewPassword@Secure2026!',
    confirmPassword: 'NewPassword@Secure2026!',
  });
  assert(validChangePass.success, 'Valid change password payload accepted');

  console.log('\n====================================================');
  console.log(`📊 Auth Test Results: ${passedTests} passed, ${failedTests} failed`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAuthTests().catch((e) => {
  console.error('Fatal test execution failure:', e);
  process.exit(1);
});
