import { AppError, Mode, RequestStatus, RequestView } from './types';

/**
 * Constants defined in section 5.5
 */
export const CANCEL_CUTOFF_MINUTES = 60;
export const MIN_LEAD_MINUTES = 120;
export const DURATIONS = [30, 45, 60, 90] as const;
export type Duration = (typeof DURATIONS)[number];

/**
 * Normalises a category or skill name:
 * Trims leading/trailing whitespace and collapses inner consecutive whitespace.
 */
export function normaliseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Validates registration number: ^[0-9]{2}[A-Z]{3}[0-9]{4}$
 * (Must be strictly uppercase).
 */
export function isValidRegno(regno: string): boolean {
  return /^[0-9]{2}[A-Z]{3}[0-9]{4}$/.test(regno);
}

/**
 * Checks if input is a valid registration number or case-insensitive for login resolving.
 */
export function isLoginIdentifierRegno(identifier: string): boolean {
  return /^[0-9]{2}[A-Za-z]{3}[0-9]{4}$/.test(identifier.trim());
}

/**
 * Password rules: min 8, max 72, at least one letter and one digit.
 */
export function passwordRules(password: string): boolean {
  if (password.length < 8 || password.length > 72) {
    return false;
  }
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  return hasLetter && hasDigit;
}

/**
 * Validates phone format: ^(\+91)?[0-9]{10}$ (max 15 chars)
 */
export function isValidPhone(phone: string): boolean {
  if (phone.length > 15) return false;
  return /^(\+91)?[0-9]{10}$/.test(phone);
}

/**
 * Profile completeness check:
 * fname, lname, dept, year, phone1, email1 all non-null and non-empty.
 */
export function isProfileComplete(student: {
  fname?: string | null;
  lname?: string | null;
  dept?: string | null;
  year?: number | null;
  phone1?: string | null;
  email1?: string | null;
} | null): boolean {
  if (!student) return false;
  return Boolean(
    student.fname && student.fname.trim().length > 0 &&
    student.lname && student.lname.trim().length > 0 &&
    student.dept && student.dept.trim().length > 0 &&
    student.year !== null && student.year !== undefined && student.year >= 1 && student.year <= 4 &&
    student.phone1 && student.phone1.trim().length > 0 &&
    student.email1 && student.email1.trim().length > 0
  );
}

/**
 * Computes cancellation deadline: meeting_time - 60 minutes
 */
export function cancelDeadline(meetingTime: string | Date): Date {
  const d = typeof meetingTime === 'string' ? new Date(meetingTime) : new Date(meetingTime.getTime());
  return new Date(d.getTime() - CANCEL_CUTOFF_MINUTES * 60 * 1000);
}

/**
 * Checks if cancel window is open:
 * now <= cancel_deadline (inclusive: exactly 60:00 before start is allowed).
 */
export function isCancelWindowOpen(meetingTime: string | Date, now: Date): boolean {
  const deadline = cancelDeadline(meetingTime);
  return now.getTime() <= deadline.getTime();
}

/**
 * Computes meeting end time: meeting_time + duration_minutes
 */
export function meetingEnd(meetingTime: string | Date, durationMinutes: number): Date {
  const d = typeof meetingTime === 'string' ? new Date(meetingTime) : new Date(meetingTime.getTime());
  return new Date(d.getTime() + durationMinutes * 60 * 1000);
}

/**
 * Checks if two half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap.
 * Overlap occurs if and only if aStart < bEnd && bStart < aEnd.
 * Back-to-back meetings (aEnd === bStart) do NOT overlap.
 */
export function intervalsOverlap(
  aStart: Date | string,
  aEnd: Date | string,
  bStart: Date | string,
  bEnd: Date | string
): boolean {
  const as = typeof aStart === 'string' ? new Date(aStart).getTime() : aStart.getTime();
  const ae = typeof aEnd === 'string' ? new Date(aEnd).getTime() : aEnd.getTime();
  const bs = typeof bStart === 'string' ? new Date(bStart).getTime() : bStart.getTime();
  const be = typeof bEnd === 'string' ? new Date(bEnd).getTime() : bEnd.getTime();

  return as < be && bs < ae;
}

/**
 * Validates a proposed meeting slot against business rules.
 */
export function validateSlot(
  slot: {
    meeting_time: string;
    duration_minutes: number;
    mode: Mode;
    location?: string | null;
    meeting_link?: string | null;
  },
  now: Date
): void {
  const meetingTime = new Date(slot.meeting_time);
  if (isNaN(meetingTime.getTime())) {
    throw new AppError('VALIDATION', 'Invalid meeting time format');
  }

  // meeting_time >= now + 120 minutes (exact boundary: >=)
  const minLeadTime = new Date(now.getTime() + MIN_LEAD_MINUTES * 60 * 1000);
  if (meetingTime.getTime() < minLeadTime.getTime()) {
    throw new AppError('SLOT_TOO_SOON');
  }

  // Duration in DURATIONS
  if (!DURATIONS.includes(slot.duration_minutes as Duration)) {
    throw new AppError('VALIDATION', 'Invalid duration');
  }

  // Offline requires location
  if (slot.mode === 'offline') {
    if (!slot.location || slot.location.trim().length === 0) {
      throw new AppError('LOCATION_REQUIRED');
    }
    if (slot.location.trim().length > 150) {
      throw new AppError('VALIDATION', 'Location exceeds 150 characters');
    }
  }

  // Online validation
  if (slot.mode === 'online' && slot.meeting_link && slot.meeting_link.trim().length > 0) {
    if (slot.meeting_link.trim().length > 200) {
      throw new AppError('VALIDATION', 'Meeting link exceeds 200 characters');
    }
    try {
      const url = new URL(slot.meeting_link.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new AppError('VALIDATION', 'Meeting link must use http or https protocol');
      }
    } catch {
      throw new AppError('VALIDATION', 'Invalid meeting link URL');
    }
  }
}

export interface TransitionContext {
  now: Date;
  meeting_time?: string | null;
  duration_minutes?: number | null;
  hasSlotConflict?: boolean;
}

/**
 * Computes next status according to transition table in Section 5.5.
 * Throws AppError on invalid transition or failed condition.
 */
export function nextStatus(
  current: RequestStatus,
  action: 'create' | 'accept' | 'reject' | 'cancel' | 'agree' | 'decline' | 'auto-complete' | 'auto-expire',
  actor: 'requester' | 'provider' | 'system',
  ctx: TransitionContext
): RequestStatus {
  // Row 2: pending -> accepted (action: accept, actor: provider)
  if (current === 'pending' && action === 'accept' && actor === 'provider') {
    return 'accepted';
  }

  // Row 3: pending -> rejected (action: reject, actor: provider)
  if (current === 'pending' && action === 'reject' && actor === 'provider') {
    return 'rejected';
  }

  // Row 4: pending -> cancelled (action: cancel, actor: requester) - no time restriction
  if (current === 'pending' && action === 'cancel' && actor === 'requester') {
    return 'cancelled';
  }

  // Row 5: accepted -> agree to slot -> confirmed (action: agree, actor: requester)
  if (current === 'accepted' && action === 'agree' && actor === 'requester') {
    if (!ctx.meeting_time) {
      throw new AppError('INVALID_TRANSITION', 'Missing meeting time for slot agreement');
    }
    if (!isCancelWindowOpen(ctx.meeting_time, ctx.now)) {
      // "Agree: requires cancel_window_open(now) (else the request is treated as expired and INVALID_TRANSITION is thrown)"
      throw new AppError('INVALID_TRANSITION', 'Cancel window closed or request expired');
    }
    if (ctx.hasSlotConflict) {
      throw new AppError('SLOT_CONFLICT');
    }
    return 'confirmed';
  }

  // Row 6: accepted -> decline slot -> rejected (action: decline, actor: requester)
  if (current === 'accepted' && action === 'decline' && actor === 'requester') {
    return 'rejected';
  }

  // Row 7: accepted -> cancel (action: cancel, actor: requester or provider)
  if (current === 'accepted' && action === 'cancel' && (actor === 'requester' || actor === 'provider')) {
    if (!ctx.meeting_time) {
      throw new AppError('INVALID_TRANSITION', 'Missing meeting time');
    }
    if (!isCancelWindowOpen(ctx.meeting_time, ctx.now)) {
      throw new AppError('CANCEL_WINDOW_CLOSED');
    }
    return 'cancelled';
  }

  // Row 8: confirmed -> cancel (action: cancel, actor: requester or provider)
  if (current === 'confirmed' && action === 'cancel' && (actor === 'requester' || actor === 'provider')) {
    if (!ctx.meeting_time) {
      throw new AppError('INVALID_TRANSITION', 'Missing meeting time');
    }
    if (!isCancelWindowOpen(ctx.meeting_time, ctx.now)) {
      throw new AppError('CANCEL_WINDOW_CLOSED');
    }
    return 'cancelled';
  }

  // Row 9: confirmed -> auto-complete (action: auto-complete, actor: system)
  if (current === 'confirmed' && action === 'auto-complete' && actor === 'system') {
    if (!ctx.meeting_time || !ctx.duration_minutes) {
      throw new AppError('INVALID_TRANSITION', 'Missing meeting time or duration');
    }
    const end = meetingEnd(ctx.meeting_time, ctx.duration_minutes);
    if (ctx.now.getTime() < end.getTime()) {
      throw new AppError('INVALID_TRANSITION', 'Meeting has not ended yet');
    }
    return 'completed';
  }

  // Row 10: accepted -> auto-expire (action: auto-expire, actor: system)
  if (current === 'accepted' && action === 'auto-expire' && actor === 'system') {
    if (!ctx.meeting_time) {
      throw new AppError('INVALID_TRANSITION', 'Missing meeting time');
    }
    const deadline = cancelDeadline(ctx.meeting_time);
    if (ctx.now.getTime() <= deadline.getTime()) {
      throw new AppError('INVALID_TRANSITION', 'Cancel deadline has not passed');
    }
    return 'cancelled';
  }

  // Any other transition is illegal
  throw new AppError('INVALID_TRANSITION');
}

/**
 * Returns the list of actions the current user can take on a request.
 */
export function allowedActions(
  request: RequestView,
  now: Date
): ('accept' | 'reject' | 'agree' | 'decline' | 'cancel')[] {
  const actions: ('accept' | 'reject' | 'agree' | 'decline' | 'cancel')[] = [];

  if (request.status === 'pending') {
    if (request.my_role === 'provider') {
      actions.push('accept', 'reject');
    } else if (request.my_role === 'requester') {
      actions.push('cancel');
    }
  } else if (request.status === 'accepted') {
    if (request.my_role === 'requester') {
      // Requester can agree or decline slot if cancel window is open
      if (request.meeting_time && isCancelWindowOpen(request.meeting_time, now)) {
        actions.push('agree', 'decline', 'cancel');
      } else {
        // If deadline passed, cannot agree
        actions.push('decline');
      }
    } else if (request.my_role === 'provider') {
      if (request.meeting_time && isCancelWindowOpen(request.meeting_time, now)) {
        actions.push('cancel');
      }
    }
  } else if (request.status === 'confirmed') {
    if (request.meeting_time && isCancelWindowOpen(request.meeting_time, now)) {
      actions.push('cancel');
    }
  }

  return actions;
}

/**
 * Checks if caller can submit feedback for a request:
 * Caller must be requester, status completed, and feedback not yet given.
 */
export function canGiveFeedback(request: RequestView): boolean {
  return request.my_role === 'requester' && request.status === 'completed' && !request.feedback_given;
}
