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
export const createLabTemplateSchema = z.object({
  organisationId: uuidSchema,
  createdBy: uuidSchema,
  name: z.string().min(3, 'Template name must be at least 3 characters').max(150),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  domain: z.string().min(2, 'Domain is required'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('INTERMEDIATE'),
  estimatedDuration: z.coerce.number().int().positive('Estimated duration must be positive'),
  environmentType: z.enum(['terminal', 'vscode', 'web-app']).default('terminal'),
  learningObjectives: z.array(z.string()).min(1, 'At least one learning objective is required'),
  prerequisites: z.array(z.string()).default([]),
});

export const updateLabTemplateSchema = createLabTemplateSchema.partial();

export const createChallengeSchema = z.object({
  labTemplateId: uuidSchema,
  title: z.string().min(3, 'Challenge title is required').max(150),
  description: z.string().min(10),
  instructions: z.string().min(10),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('INTERMEDIATE'),
  points: z.coerce.number().int().min(10).max(1000).default(100),
  timeLimit: z.coerce.number().int().positive().optional(),
  displayOrder: z.coerce.number().int().min(1).default(1),
  evaluationType: z
    .enum(['COMMAND_EXIT_CODE', 'STDOUT_REGEX', 'FILE_CONTENT', 'HTTP_PROBE'])
    .default('COMMAND_EXIT_CODE'),
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
});

export const updateLabSessionStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROVISIONING', 'RUNNING', 'COMPLETED', 'FAILED', 'TERMINATED', 'EXPIRED']),
});

// Valid state machine transitions for lab sessions
export const validSessionTransitions: Record<string, string[]> = {
  PENDING: ['PROVISIONING', 'FAILED', 'TERMINATED'],
  PROVISIONING: ['RUNNING', 'FAILED', 'TERMINATED'],
  RUNNING: ['COMPLETED', 'FAILED', 'TERMINATED', 'EXPIRED'],
  COMPLETED: [], // Completed sessions cannot be restarted by status update
  FAILED: ['TERMINATED'],
  TERMINATED: [],
  EXPIRED: ['TERMINATED'],
};

// ========================================================
// Challenge Submission Validations
// ========================================================
export const submitChallengeSchema = z.object({
  studentId: uuidSchema,
  challengeId: uuidSchema,
  labSessionId: uuidSchema,
  submissionData: z.record(z.any()),
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
