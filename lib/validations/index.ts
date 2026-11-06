import { z } from 'zod';

// ========================================================
// Common Primitive Validators
// ========================================================
export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

// ========================================================
// Organisation Validations
// ========================================================
export const createOrganisationSchema = z.object({
  name: z.string().min(2, 'Organisation name must be at least 2 characters').max(100),
  slug: slugSchema,
  description: z.string().max(1000).optional(),
  logo: z.string().url('Logo must be a valid URL').optional().or(z.literal('')),
});

export const updateOrganisationSchema = createOrganisationSchema.partial();

// ========================================================
// ========================================================
// Workshop Validations
// ========================================================
export const workshopCategorySchema = z.enum([
  'Web Development',
  'Cloud Computing',
  'Cybersecurity',
  'Artificial Intelligence / Machine Learning',
  'DevOps',
  'Open Source',
  'Data Science',
  'Other',
]);

export const createWorkshopSchema = z
  .object({
    organisationId: uuidSchema,
    organiserId: uuidSchema.optional(), // Inherited from authenticated session
    title: z.string().min(3, 'Title must be at least 3 characters').max(150),
    slug: slugSchema,
    shortDescription: z.string().max(250).optional(),
    description: z.string().min(10, 'Detailed description must be at least 10 characters'),
    domain: z.string().min(2, 'Category is required'),
    difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
    bannerUrl: z.string().url('Banner must be a valid URL').optional().or(z.literal('')),
    tags: z.array(z.string()).default([]),

    // Schedule & Venue
    startDate: z.string().datetime({ message: 'startDate must be a valid ISO 8601 date string' }),
    endDate: z.string().datetime({ message: 'endDate must be a valid ISO 8601 date string' }),
    duration: z.coerce.number().int().positive('Duration must be positive in minutes'),
    timezone: z.string().default('UTC'),
    venueType: z.enum(['ONLINE', 'OFFLINE', 'HYBRID']).default('ONLINE'),
    venueAddress: z.string().optional(),

    // Speaker / Instructor
    instructorName: z.string().max(100).optional(),
    instructorBio: z.string().max(1000).optional(),

    // Registration Settings
    registrationOpensAt: z.string().datetime().optional().nullable(),
    registrationDeadline: z.string().datetime({ message: 'registrationDeadline must be a valid ISO date string' }),
    participantLimit: z.coerce.number().int().min(1).max(2000).default(50),
    requiresApproval: z.boolean().default(false),
    isPublic: z.boolean().default(true),
    codeJoinEnabled: z.boolean().default(true),
    registrationCode: z
      .string()
      .min(4, 'Registration code must be at least 4 characters')
      .max(25)
      .regex(/^[A-Z0-9_-]+$/, 'Registration code must be uppercase alphanumeric')
      .optional(),
    labTemplateIds: z.array(uuidSchema).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: 'Workshop start date must precede end date',
    path: ['endDate'],
  })
  .refine((data) => new Date(data.registrationDeadline) <= new Date(data.startDate), {
    message: 'Registration deadline cannot be after workshop start date',
    path: ['registrationDeadline'],
  })
  .refine(
    (data) => {
      if (data.registrationOpensAt) {
        return new Date(data.registrationOpensAt) <= new Date(data.registrationDeadline);
      }
      return true;
    },
    {
      message: 'Registration opening date must be on or before the registration deadline',
      path: ['registrationOpensAt'],
    }
  );

export const updateWorkshopSchema = z
  .object({
    title: z.string().min(3).max(150).optional(),
    shortDescription: z.string().max(250).optional(),
    description: z.string().min(10).optional(),
    domain: z.string().min(2).optional(),
    difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
    bannerUrl: z.string().url().optional().or(z.literal('')),
    tags: z.array(z.string()).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    duration: z.coerce.number().int().positive().optional(),
    timezone: z.string().optional(),
    venueType: z.enum(['ONLINE', 'OFFLINE', 'HYBRID']).optional(),
    venueAddress: z.string().optional(),
    instructorName: z.string().max(100).optional(),
    instructorBio: z.string().max(1000).optional(),
    registrationOpensAt: z.string().datetime().optional().nullable(),
    registrationDeadline: z.string().datetime().optional(),
    participantLimit: z.coerce.number().int().min(1).max(2000).optional(),
    requiresApproval: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    codeJoinEnabled: z.boolean().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'REGISTRATION_CLOSED', 'FULL', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate);
      }
      return true;
    },
    { message: 'startDate must precede endDate', path: ['endDate'] }
  );

export const manageParticipantSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'CANCEL']),
  notes: z.string().max(500).optional(),
});

// ========================================================
// Workshop Registration Validations
// ========================================================
export const registerWorkshopSchema = z.object({
  workshopId: uuidSchema.optional(),
  registrationCode: z.string().min(4).max(30).optional(),
  studentId: uuidSchema.optional(),
  notes: z.string().max(500).optional(),
}).refine((data) => data.workshopId || data.registrationCode, {
  message: 'Either workshopId or registrationCode must be provided',
  path: ['registrationCode'],
});

export const updateRegistrationStatusSchema = z.object({
  status: z.enum(['REGISTERED', 'PENDING_APPROVAL', 'WAITLISTED', 'REJECTED', 'CANCELLED', 'ATTENDED']),
  attendanceStatus: z.enum(['ABSENT', 'ATTENDED', 'EXCUSED']).optional(),
  notes: z.string().max(500).optional(),
});

// ========================================================
// Lab Template & Challenge Validations
// ========================================================

export const LAB_DOMAINS = [
  'Web Development',
  'Cybersecurity',
  'Cloud & Infrastructure',
  'DevOps & CI/CD',
  'Linux & System Administration',
  'Artificial Intelligence',
  'Machine Learning',
  'Data Science & Analytics',
  'Git & Open Source',
  'Programming Fundamentals',
  'Other',
] as const;

export const labToolSchema = z.object({
  name: z.string().min(1, 'Tool name is required'),
  version: z.string().optional(),
  description: z.string().optional(),
});

export const createLabTemplateSchema = z.object({
  organisationId: uuidSchema,
  createdBy: uuidSchema,
  name: z.string().min(3, 'Template name must be at least 3 characters').max(150),
  shortDescription: z.string().max(300, 'Short description cannot exceed 300 characters').optional().nullable(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  domain: z.string().min(2, 'Domain is required'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('INTERMEDIATE'),
  estimatedDuration: z.coerce.number().int().positive('Estimated duration must be positive'),
  coverImageUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  requiredTools: z.array(labToolSchema).optional().nullable(),
  version: z.coerce.number().int().min(1).default(1),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  environmentType: z.enum(['terminal', 'vscode', 'web-app']).default('terminal'),
  learningObjectives: z.array(z.string()).min(1, 'At least one learning objective is required'),
  prerequisites: z.array(z.string()).default([]),
});

export const updateLabTemplateSchema = createLabTemplateSchema.partial();

export const challengeHintSchema = z.object({
  id: z.string().min(1),
  orderIndex: z.coerce.number().int().min(1),
  content: z.string().min(1, 'Hint content is required'),
  penaltyPercent: z.coerce.number().int().min(0).max(100).default(10),
});

export const mcqOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1, 'Option text is required'),
  isCorrect: z.boolean().default(false),
});

export const mcqSolutionSchema = z.object({
  options: z.array(mcqOptionSchema).min(2, 'At least 2 options required'),
  allowMultiple: z.boolean().default(false),
});

export const shortAnswerSolutionSchema = z.object({
  acceptedAnswers: z.array(z.string().min(1)).min(1, 'At least one accepted answer is required'),
  caseSensitive: z.boolean().default(false),
  whitespaceNormalized: z.boolean().default(true),
  regexPattern: z.string().optional(),
});

export const codeKnowledgeSolutionSchema = z.object({
  expectedCode: z.string().min(1, 'Expected code/command is required'),
  matchMode: z.enum(['EXACT', 'CONTAINS', 'REGEX', 'NORMALIZED']).default('NORMALIZED'),
  language: z.string().default('bash'),
  ignoreWhitespace: z.boolean().default(true),
});

export const guidedTaskChecklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1, 'Task text is required'),
  isRequired: z.boolean().default(true),
});

export const guidedTaskSolutionSchema = z.object({
  checklist: z.array(guidedTaskChecklistItemSchema).min(1, 'At least one task required'),
  confirmationCode: z.string().optional(),
  requireAllChecklist: z.boolean().default(true),
});

export const researchReflectionSolutionSchema = z.object({
  minWordCount: z.coerce.number().int().min(5).default(50),
  promptGuidelines: z.string().optional(),
  autoAwardPoints: z.boolean().default(true),
});

export const createChallengeSchema = z.object({
  labTemplateId: uuidSchema,
  title: z.string().min(3, 'Challenge title is required').max(150),
  description: z.string().min(5, 'Description is required'),
  instructions: z.string().min(5, 'Instructions are required'),
  challengeType: z
    .enum(['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'CODE_KNOWLEDGE', 'GUIDED_TASK', 'RESEARCH_REFLECTION'])
    .default('MULTIPLE_CHOICE'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('INTERMEDIATE'),
  points: z.coerce.number().int().min(10).max(1000).default(100),
  timeLimit: z.coerce.number().int().positive().optional().nullable(),
  displayOrder: z.coerce.number().int().min(1).default(1),
  hints: z.array(challengeHintSchema).optional().nullable(),
  referenceMaterial: z.string().optional().nullable(),
  solutionData: z.record(z.any()).optional().nullable(),
  explanation: z.string().optional().nullable(),
  evaluationType: z
    .enum(['COMMAND_EXIT_CODE', 'STDOUT_REGEX', 'FILE_CONTENT', 'HTTP_PROBE'])
    .default('COMMAND_EXIT_CODE'),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE'),
});

export const updateChallengeSchema = createChallengeSchema.partial();

export const reorderChallengesSchema = z.object({
  orderedIds: z.array(uuidSchema).min(1, 'At least one challenge ID is required'),
});

// Workshop-Lab Attachment Validations
export const attachWorkshopLabSchema = z.object({
  workshopId: uuidSchema,
  labTemplateId: uuidSchema,
  displayOrder: z.coerce.number().int().min(1).default(1),
  isRequired: z.boolean().default(true),
  availableFrom: z.coerce.date().optional().nullable(),
  availableUntil: z.coerce.date().optional().nullable(),
  createSnapshot: z.boolean().default(true),
});

export const reorderWorkshopLabsSchema = z.object({
  orderedTemplateIds: z.array(uuidSchema).min(1, 'At least one template ID is required'),
});

// Structured Predefined Task Evaluation Schema (No raw arbitrary unverified shell scripts)
export const predefinedEvaluationConfigSchema = z.object({
  ruleType: z.enum(['FILE_EXISTS', 'FILE_PERMISSIONS', 'PROCESS_STATUS', 'PORT_LISTENING', 'HTTP_STATUS']),
  targetPath: z.string().optional(),
  expectedGroup: z.string().optional(),
  expectedOctalPermissions: z.string().regex(/^[0-7]{3,4}$/).optional(),
  processName: z.string().optional(),
  portNumber: z.coerce.number().int().min(1).max(65535).optional(),
  expectedStatusCode: z.coerce.number().int().min(200).max(599).optional(),
});

export const createChallengeTaskSchema = z.object({
  challengeId: uuidSchema,
  title: z.string().min(3).max(150),
  description: z.string().min(5),
  taskType: z.string().min(2),
  evaluationConfig: predefinedEvaluationConfigSchema,
  points: z.coerce.number().int().min(5).max(500).default(50),
  displayOrder: z.coerce.number().int().min(1).default(1),
});

// ========================================================
// Lab Session Lifecycle Validations
// ========================================================
export const createLabSessionSchema = z.object({
  studentId: uuidSchema,
  workshopId: uuidSchema,
  labTemplateId: uuidSchema,
  environmentProfile: z.string().optional(),
});

export const launchLabSessionSchema = z.object({
  workshopId: uuidSchema,
  labTemplateId: uuidSchema,
  environmentProfile: z.string().optional(),
});

export const updateLabSessionStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'PROVISIONING',
    'RUNNING',
    'STOPPING',
    'STOPPED',
    'COMPLETED',
    'FAILED',
    'TERMINATED',
    'EXPIRED',
  ]),
});

// Valid state machine transitions for lab sessions
export const validSessionTransitions: Record<string, string[]> = {
  PENDING: ['PROVISIONING', 'FAILED', 'TERMINATED'],
  PROVISIONING: ['RUNNING', 'FAILED', 'TERMINATED'],
  RUNNING: ['STOPPING', 'STOPPED', 'COMPLETED', 'FAILED', 'TERMINATED', 'EXPIRED'],
  STOPPING: ['STOPPED', 'FAILED', 'TERMINATED'],
  STOPPED: ['PROVISIONING', 'TERMINATED'],
  COMPLETED: [], // Completed sessions cannot be restarted by status update
  FAILED: ['TERMINATED'],
  TERMINATED: [],
  EXPIRED: ['TERMINATED'],
};

// ========================================================
// Challenge Submission Validations
// ========================================================
export const submitChallengeSchema = z.object({
  studentId: uuidSchema.optional(),
  challengeId: uuidSchema,
  workshopId: uuidSchema.optional().nullable(),
  labSessionId: uuidSchema.optional().nullable(),
  answer: z.any(),
  usedHintIds: z.array(z.string()).default([]),
});

// ========================================================
// Authentication & Account Validations
// ========================================================
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.literal('STUDENT').optional(), // Strict: cannot register as SUPER_ADMIN or ORGANISER
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  avatar: z.string().url('Avatar must be a valid URL').optional().or(z.literal('')),
});

// ========================================================
// Prompt 8: Real-Time Workshop Monitoring & Collaboration
// ========================================================

export const announcementPrioritySchema = z.enum(['NORMAL', 'IMPORTANT', 'URGENT']);
export const announcementStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, 'Announcement title must be at least 3 characters').max(150),
  message: z.string().min(5, 'Announcement message must be at least 5 characters').max(5000),
  priority: announcementPrioritySchema.default('NORMAL'),
  isPinned: z.boolean().default(false),
  targetGroup: z.string().max(50).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().extend({
  status: announcementStatusSchema.optional(),
});

export const helpRequestCategorySchema = z.enum([
  'ENVIRONMENT_NOT_LAUNCHING',
  'TERMINAL_NOT_WORKING',
  'COMMAND_ISSUE',
  'INSTRUCTIONS_UNCLEAR',
  'CONCEPTUAL_QUESTION',
  'OTHER',
]);

export const helpRequestStatusSchema = z.enum([
  'OPEN',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
]);

export const createHelpRequestSchema = z.object({
  labTemplateId: uuidSchema.optional().nullable(),
  challengeId: uuidSchema.optional().nullable(),
  category: helpRequestCategorySchema.default('OTHER'),
  description: z.string().min(5, 'Please provide at least 5 characters describing the issue').max(2000),
});

export const updateHelpRequestStatusSchema = z.object({
  status: helpRequestStatusSchema,
  assignedOrganiserId: uuidSchema.optional().nullable(),
  resolutionNotes: z.string().max(2000).optional().nullable(),
});

export const createHelpMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000),
});

export const presenceStatusSchema = z.enum(['ONLINE', 'IDLE', 'OFFLINE']);

export const presenceHeartbeatSchema = z.object({
  status: presenceStatusSchema.default('ONLINE'),
});

