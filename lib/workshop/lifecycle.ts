import { WorkshopStatus, RegistrationStatus } from '@prisma/client';

export interface WorkshopDatesAndLimits {
  status: WorkshopStatus;
  startDate: Date;
  endDate: Date;
  registrationOpensAt?: Date | null;
  registrationDeadline: Date;
  participantLimit: number;
  requiresApproval?: boolean;
}

/**
 * Computes the real-time effective status of a workshop based on deadlines, dates, and capacity
 */
export function computeEffectiveWorkshopStatus(
  workshop: WorkshopDatesAndLimits,
  confirmedRegistrationsCount: number,
  referenceTime: Date = new Date()
): WorkshopStatus {
  // Explicit administrative overrides
  if (workshop.status === WorkshopStatus.DRAFT) return WorkshopStatus.DRAFT;
  if (workshop.status === WorkshopStatus.CANCELLED) return WorkshopStatus.CANCELLED;

  const now = referenceTime.getTime();
  const start = new Date(workshop.startDate).getTime();
  const end = new Date(workshop.endDate).getTime();
  const deadline = new Date(workshop.registrationDeadline).getTime();

  // Lifecycle progression by time
  if (now > end) {
    return WorkshopStatus.COMPLETED;
  }
  if (now >= start && now <= end) {
    return WorkshopStatus.ONGOING;
  }

  // Registration capacity and deadline checks
  if (confirmedRegistrationsCount >= workshop.participantLimit) {
    return WorkshopStatus.FULL;
  }
  if (now > deadline) {
    return WorkshopStatus.REGISTRATION_CLOSED;
  }

  return WorkshopStatus.PUBLISHED;
}

export interface RegistrationEligibility {
  allowed: boolean;
  statusToAssign: RegistrationStatus;
  reason?: string;
}

/**
 * Validates whether a student can register and determines the initial status to assign
 */
export function evaluateRegistrationEligibility(
  workshop: WorkshopDatesAndLimits,
  confirmedCount: number,
  referenceTime: Date = new Date()
): RegistrationEligibility {
  if (workshop.status === WorkshopStatus.DRAFT) {
    return {
      allowed: false,
      statusToAssign: RegistrationStatus.REJECTED,
      reason: 'This workshop is in draft status and not accepting registrations.',
    };
  }

  if (workshop.status === WorkshopStatus.CANCELLED) {
    return {
      allowed: false,
      statusToAssign: RegistrationStatus.CANCELLED,
      reason: 'This workshop has been cancelled.',
    };
  }

  const now = referenceTime.getTime();
  const end = new Date(workshop.endDate).getTime();
  const deadline = new Date(workshop.registrationDeadline).getTime();

  if (now > end) {
    return {
      allowed: false,
      statusToAssign: RegistrationStatus.REJECTED,
      reason: 'This workshop has already concluded.',
    };
  }

  if (workshop.registrationOpensAt && now < new Date(workshop.registrationOpensAt).getTime()) {
    return {
      allowed: false,
      statusToAssign: RegistrationStatus.REJECTED,
      reason: `Registration has not opened yet. Opens on ${new Date(workshop.registrationOpensAt).toLocaleDateString()}.`,
    };
  }

  if (now > deadline) {
    return {
      allowed: false,
      statusToAssign: RegistrationStatus.REJECTED,
      reason: 'The registration deadline for this workshop has passed.',
    };
  }

  // Capacity handling: Waitlist if full
  if (confirmedCount >= workshop.participantLimit) {
    return {
      allowed: true,
      statusToAssign: RegistrationStatus.WAITLISTED,
      reason: 'Workshop has reached maximum capacity. You will be placed on the waitlist.',
    };
  }

  // Approval handling
  if (workshop.requiresApproval) {
    return {
      allowed: true,
      statusToAssign: RegistrationStatus.PENDING_APPROVAL,
      reason: 'Registration submitted. Requires organizer approval before admission.',
    };
  }

  return {
    allowed: true,
    statusToAssign: RegistrationStatus.REGISTERED,
  };
}
