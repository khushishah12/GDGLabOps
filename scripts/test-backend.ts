/**
 * GDG LabOps – Backend & Business Logic Test Suite
 * Validates Zod schemas, business logic constraints, and service logic.
 */

import {
  createWorkshopSchema,
  registerWorkshopSchema,
  createLabTemplateSchema,
  createChallengeSchema,
  createChallengeTaskSchema,
  updateLabSessionStatusSchema,
  validSessionTransitions,
} from '../lib/validations';
import {
  AppError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ResourceExhaustedError,
} from '../lib/errors';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 GDG LabOps Backend & Validation Test Suite');
  console.log('====================================================\n');

  // Test 1: Workshop Creation Validation (Start Date before End Date)
  console.log('[Suite 1]: Workshop Validation Rules');
  const validWorkshopData = {
    organisationId: 'a0000000-0000-0000-0000-000000000001',
    organiserId: 'b0000000-0000-0000-0000-000000000001',
    title: 'Cloud Native Kubernetes',
    slug: 'cloud-native-kubernetes',
    description: 'Learn distributed container orchestration and ingress.',
    domain: 'Cloud Computing',
    startDate: '2026-12-01T14:00:00Z',
    endDate: '2026-12-01T16:00:00Z',
    duration: 120,
    registrationDeadline: '2026-12-01T12:00:00Z',
    participantLimit: 50,
    registrationCode: 'GDG-K8S-TEST',
  };

  const parsedValid = createWorkshopSchema.safeParse(validWorkshopData);
  assert(parsedValid.success, 'Valid workshop passes schema validation');

  // Test 2: Invalid Date Ordering (End Date before Start Date)
  const invalidDateWorkshop = {
    ...validWorkshopData,
    startDate: '2026-12-01T16:00:00Z',
    endDate: '2026-12-01T14:00:00Z', // Invalid: end before start
  };
  const parsedInvalidDate = createWorkshopSchema.safeParse(invalidDateWorkshop);
  assert(!parsedInvalidDate.success, 'Rejects workshop where endDate precedes startDate');

  // Test 3: Registration Deadline after Start Date
  const invalidDeadlineWorkshop = {
    ...validWorkshopData,
    registrationDeadline: '2026-12-01T15:00:00Z', // Invalid: deadline during/after workshop start
  };
  const parsedInvalidDeadline = createWorkshopSchema.safeParse(invalidDeadlineWorkshop);
  assert(!parsedInvalidDeadline.success, 'Rejects workshop where registrationDeadline is after startDate');

  // Test 4: Workshop Registration Validation
  console.log('\n[Suite 2]: Workshop Registration Rules');
  const validReg = {
    workshopId: 'c0000000-0000-0000-0000-000000000001',
    studentId: 'd0000000-0000-0000-0000-000000000001',
  };
  assert(registerWorkshopSchema.safeParse(validReg).success, 'Valid registration payload accepted');

  const validCodeReg = {
    registrationCode: 'GDG-LNX-2026',
    studentId: 'd0000000-0000-0000-0000-000000000001',
  };
  assert(registerWorkshopSchema.safeParse(validCodeReg).success, 'Registration via Event Code accepted');

  const emptyReg = {
    studentId: 'd0000000-0000-0000-0000-000000000001',
  };
  assert(!registerWorkshopSchema.safeParse(emptyReg).success, 'Rejects registration without workshopId or registrationCode');

  // Test 5: Lab Template & Predefined Task Evaluation (Security Rule: No raw scripts)
  console.log('\n[Suite 3]: Lab Template & Challenge Security Assertions');
  const validTemplate = {
    organisationId: 'a0000000-0000-0000-0000-000000000001',
    createdBy: 'b0000000-0000-0000-0000-000000000001',
    name: 'Linux System Hardening',
    description: 'Master core POSIX permissions and process signals.',
    domain: 'DevOps',
    difficulty: 'INTERMEDIATE',
    estimatedDuration: 90,
    environmentType: 'terminal',
    learningObjectives: ['Audit file permissions', 'Inspect processes'],
    prerequisites: ['Basic CLI'],
  };
  assert(createLabTemplateSchema.safeParse(validTemplate).success, 'Valid LabTemplate schema accepted');

  const validTask = {
    challengeId: 'e0000000-0000-0000-0000-000000000001',
    title: 'Verify File Permissions',
    description: 'Assert that /etc/labops/config.json has 640 permissions',
    taskType: 'FILE_CHECK',
    evaluationConfig: {
      ruleType: 'FILE_PERMISSIONS',
      targetPath: '/etc/labops/config.json',
      expectedGroup: 'gdg-lab',
      expectedOctalPermissions: '640',
    },
    points: 50,
    displayOrder: 1,
  };
  assert(createChallengeTaskSchema.safeParse(validTask).success, 'Predefined structured evaluation task accepted');

  // Test 6: Lab Session Lifecycle State Machine Transitions
  console.log('\n[Suite 4]: Lab Session State Machine Transitions');
  assert(validSessionTransitions['PENDING'].includes('PROVISIONING'), 'PENDING can transition to PROVISIONING');
  assert(validSessionTransitions['PROVISIONING'].includes('RUNNING'), 'PROVISIONING can transition to RUNNING');
  assert(validSessionTransitions['RUNNING'].includes('COMPLETED'), 'RUNNING can transition to COMPLETED');
  assert(validSessionTransitions['COMPLETED'].length === 0, 'COMPLETED session is terminal and cannot transition');
  assert(validSessionTransitions['TERMINATED'].length === 0, 'TERMINATED session cannot transition');

  // Test 7: Error Classes Hierarchy
  console.log('\n[Suite 5]: HTTP Domain Error Classification');
  const notFound = new NotFoundError('Workshop not found');
  assert(notFound.statusCode === 404, 'NotFoundError returns status 404');

  const conflict = new ConflictError('Duplicate registration');
  assert(conflict.statusCode === 409, 'ConflictError returns status 409');

  const forbidden = new ForbiddenError('Only draft workshops can be deleted');
  assert(forbidden.statusCode === 403, 'ForbiddenError returns status 403');

  const exhausted = new ResourceExhaustedError('Participant limit reached');
  assert(exhausted.statusCode === 400, 'ResourceExhaustedError returns status 400');

  // Summary
  console.log('\n====================================================');
  console.log(`📊 Test Results: ${passedTests} passed, ${failedTests} failed`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
