export type UserRole = 'STUDENT' | 'ORGANISER' | 'SUPER_ADMIN';

export type WorkshopStatus = 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export type TechnicalDomain =
  | 'Cybersecurity'
  | 'Cloud Computing'
  | 'Web Development'
  | 'DevOps'
  | 'Artificial Intelligence'
  | 'Machine Learning'
  | 'Open Source';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type EvaluationType =
  | 'COMMAND_EXIT_CODE'
  | 'STDOUT_REGEX'
  | 'FILE_CONTENT'
  | 'HTTP_PROBE';

export type SessionStatus =
  | 'INITIALIZING'
  | 'RUNNING'
  | 'IDLE'
  | 'STOPPED'
  | 'TERMINATED'
  | 'ERROR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  institution?: string;
  points?: number;
  completedLabs?: number;
}

export interface LabTemplate {
  id: string;
  title: string;
  slug: string;
  description: string;
  domain: TechnicalDomain;
  difficulty: DifficultyLevel;
  estimatedDuration: number; // in minutes
  dockerImage: string;
  defaultPort: number;
  memoryLimitMb: number;
  cpuLimitCores: number;
  storageLimitMb: number;
  learningObjectives: string[];
  prerequisites: string[];
  environmentType: 'terminal' | 'vscode' | 'web-app';
  challengesCount: number;
  status: 'PUBLISHED' | 'DRAFT';
  updatedAt: string;
}

export interface ChallengeHint {
  id: string;
  orderIndex: number;
  content: string;
  penaltyPercent: number;
}

export interface Challenge {
  id: string;
  workshopId?: string;
  templateId?: string;
  orderIndex: number;
  title: string;
  description: string;
  instructions: string;
  difficulty: DifficultyLevel;
  points: number;
  evaluationType: EvaluationType;
  validationRule: {
    command?: string;
    expectedExitCode?: number;
    expectedStdoutPattern?: string;
    targetPath?: string;
    probeUrl?: string;
  };
  hints: ChallengeHint[];
}

export interface Workshop {
  id: string;
  title: string;
  slug: string;
  description: string;
  domain: TechnicalDomain;
  eventCode: string;
  status: WorkshopStatus;
  maxAttendees: number;
  registeredCount: number;
  scheduledAt: string;
  startsAt?: string;
  endsAt?: string;
  durationMinutes: number;
  registrationDeadline: string;
  prerequisites: string[];
  bannerUrl?: string;
  templateId: string;
  template?: LabTemplate;
  organiserId: string;
  organiserName: string;
  challenges: Challenge[];
  createdAt: string;
}

export interface LiveParticipant {
  id: string;
  studentId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  currentChallengeIndex: number;
  totalChallenges: number;
  score: number;
  progressPercent: number;
  lastActive: string;
  containerStatus: SessionStatus;
  needsHelp: boolean;
  helpMessage?: string;
}

export interface WorkshopAnalytics {
  totalRegistrations: number;
  attendanceRatePercent: number;
  avgCompletionTimeMinutes: number;
  totalChallengesSolved: number;
  attendanceTrend: { date: string; registered: number; attended: number }[];
  completionByChallenge: { challengeTitle: string; passRate: number; avgAttempts: number }[];
  scoreDistribution: { range: string; count: number }[];
  domainBreakdown: { domain: string; workshops: number; participants: number }[];
}
