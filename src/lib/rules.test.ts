import { describe, it, expect } from 'vitest';
import {
  normaliseName,
  isValidRegno,
  passwordRules,
  isProfileComplete,
  cancelDeadline,
  isCancelWindowOpen,
  intervalsOverlap,
  validateSlot,
  nextStatus,
  allowedActions,
  canGiveFeedback,
} from './rules';
import { RequestView } from './types';

describe('rules.ts', () => {
  describe('normaliseName', () => {
    it('trims leading/trailing whitespace and collapses inner whitespace', () => {
      expect(normaliseName('  Data   Structures   ')).toBe('Data Structures');
      expect(normaliseName('Web\tDevelopment\n')).toBe('Web Development');
    });
  });

  describe('isValidRegno', () => {
    it('validates strictly uppercase registration numbers', () => {
      expect(isValidRegno('25BCE1232')).toBe(true);
      expect(isValidRegno('21MIS0045')).toBe(true);
      expect(isValidRegno('25bce1232')).toBe(false); // lowercase
      expect(isValidRegno('25BCE123')).toBe(false); // too short
      expect(isValidRegno('25BC12345')).toBe(false); // invalid pattern
      expect(isValidRegno(' 25BCE1232 ')).toBe(false); // untrimmed
    });
  });

  describe('passwordRules', () => {
    it('requires 8 to 72 chars, at least one letter and one digit', () => {
      expect(passwordRules('pass1234')).toBe(true);
      expect(passwordRules('p1')).toBe(false); // < 8
      expect(passwordRules('password')).toBe(false); // no digit
      expect(passwordRules('12345678')).toBe(false); // no letter
      expect(passwordRules('a'.repeat(73) + '1')).toBe(false); // > 72
    });
  });

  describe('isProfileComplete', () => {
    it('returns true only when fname, lname, dept, year, phone1, email1 are present and valid', () => {
      const validStudent = {
        fname: 'John',
        lname: 'Doe',
        dept: 'CSE',
        year: 3,
        phone1: '9876543210',
        email1: 'john@vit.ac.in',
      };
      expect(isProfileComplete(validStudent)).toBe(true);
      expect(isProfileComplete({ ...validStudent, fname: '' })).toBe(false);
      expect(isProfileComplete({ ...validStudent, lname: null })).toBe(false);
      expect(isProfileComplete({ ...validStudent, dept: '   ' })).toBe(false);
      expect(isProfileComplete({ ...validStudent, year: 0 })).toBe(false);
      expect(isProfileComplete({ ...validStudent, year: 5 })).toBe(false);
      expect(isProfileComplete({ ...validStudent, phone1: null })).toBe(false);
      expect(isProfileComplete({ ...validStudent, email1: '' })).toBe(false);
      expect(isProfileComplete(null)).toBe(false);
    });
  });

  describe('cancelDeadline & isCancelWindowOpen boundary', () => {
    it('boundary at exactly meeting_time - 60 minutes: allowed at 60:00.000, refused at +1 ms', () => {
      const meetingTime = new Date('2026-10-16T12:00:00.000Z');
      const deadline = cancelDeadline(meetingTime);
      expect(deadline.toISOString()).toBe('2026-10-16T11:00:00.000Z');

      // Exactly at deadline (11:00:00.000)
      const exactNow = new Date('2026-10-16T11:00:00.000Z');
      expect(isCancelWindowOpen(meetingTime, exactNow)).toBe(true);

      // 1 ms before deadline (10:59:59.999)
      const beforeNow = new Date('2026-10-16T10:59:59.999Z');
      expect(isCancelWindowOpen(meetingTime, beforeNow)).toBe(true);

      // 1 ms after deadline (11:00:00.001) -> refused
      const afterNow = new Date('2026-10-16T11:00:00.001Z');
      expect(isCancelWindowOpen(meetingTime, afterNow)).toBe(false);
    });
  });

  describe('validateSlot boundaries and modes', () => {
    it('SLOT_TOO_SOON boundary at exactly 120 minutes', () => {
      const now = new Date('2026-10-16T10:00:00.000Z');

      // Exactly 120 minutes: allowed
      const exact120 = new Date('2026-10-16T12:00:00.000Z').toISOString();
      expect(() =>
        validateSlot(
          {
            meeting_time: exact120,
            duration_minutes: 30,
            mode: 'online',
          },
          now
        )
      ).not.toThrow();

      // 119 minutes 59 seconds: throws SLOT_TOO_SOON
      const soonTime = new Date('2026-10-16T11:59:59.999Z').toISOString();
      expect(() =>
        validateSlot(
          {
            meeting_time: soonTime,
            duration_minutes: 30,
            mode: 'online',
          },
          now
        )
      ).toThrowError(expect.objectContaining({ code: 'SLOT_TOO_SOON' }));
    });

    it('offline requires non-empty location; online allows optional meeting_link', () => {
      const now = new Date('2026-10-16T10:00:00.000Z');
      const validTime = new Date('2026-10-16T13:00:00.000Z').toISOString();

      // Offline without location -> LOCATION_REQUIRED
      expect(() =>
        validateSlot(
          {
            meeting_time: validTime,
            duration_minutes: 45,
            mode: 'offline',
            location: '',
          },
          now
        )
      ).toThrowError(expect.objectContaining({ code: 'LOCATION_REQUIRED' }));

      // Offline with location -> valid
      expect(() =>
        validateSlot(
          {
            meeting_time: validTime,
            duration_minutes: 45,
            mode: 'offline',
            location: 'Library Room 204',
          },
          now
        )
      ).not.toThrow();

      // Online with valid URL -> valid
      expect(() =>
        validateSlot(
          {
            meeting_time: validTime,
            duration_minutes: 60,
            mode: 'online',
            meeting_link: 'https://meet.google.com/abc-defg-hij',
          },
          now
        )
      ).not.toThrow();

      // Online with invalid URL -> VALIDATION
      expect(() =>
        validateSlot(
          {
            meeting_time: validTime,
            duration_minutes: 60,
            mode: 'online',
            meeting_link: 'not-a-valid-url',
          },
          now
        )
      ).toThrowError(expect.objectContaining({ code: 'VALIDATION' }));
    });
  });

  describe('intervalsOverlap', () => {
    it('checks half-open intervals [start, end)', () => {
      const s1 = new Date('2026-10-16T10:00:00Z');
      const e1 = new Date('2026-10-16T11:00:00Z');

      // Overlapping: [10:30, 11:30)
      const s2 = new Date('2026-10-16T10:30:00Z');
      const e2 = new Date('2026-10-16T11:30:00Z');
      expect(intervalsOverlap(s1, e1, s2, e2)).toBe(true);

      // Back-to-back: [11:00, 12:00) does not overlap with [10:00, 11:00)
      const s3 = new Date('2026-10-16T11:00:00Z');
      const e3 = new Date('2026-10-16T12:00:00Z');
      expect(intervalsOverlap(s1, e1, s3, e3)).toBe(false);

      // Back-to-back reverse: [09:00, 10:00) does not overlap
      const s4 = new Date('2026-10-16T09:00:00Z');
      const e4 = new Date('2026-10-16T10:00:00Z');
      expect(intervalsOverlap(s1, e1, s4, e4)).toBe(false);

      // Completely separate
      const s5 = new Date('2026-10-16T14:00:00Z');
      const e5 = new Date('2026-10-16T15:00:00Z');
      expect(intervalsOverlap(s1, e1, s5, e5)).toBe(false);
    });
  });

  describe('Transition table & nextStatus', () => {
    const meetingTime = '2026-10-16T14:00:00.000Z'; // deadline 13:00, end 14:30
    const duration = 30;
    const nowBeforeDeadline = new Date('2026-10-16T12:00:00.000Z');
    const nowAfterDeadline = new Date('2026-10-16T13:30:00.000Z');
    const nowAfterEnd = new Date('2026-10-16T14:35:00.000Z');

    it('Row 2: pending -> accepted by provider', () => {
      expect(
        nextStatus('pending', 'accept', 'provider', { now: nowBeforeDeadline })
      ).toBe('accepted');
    });

    it('Row 3: pending -> rejected by provider', () => {
      expect(
        nextStatus('pending', 'reject', 'provider', { now: nowBeforeDeadline })
      ).toBe('rejected');
    });

    it('Row 4: pending -> cancelled by requester (no time restriction)', () => {
      expect(
        nextStatus('pending', 'cancel', 'requester', { now: nowBeforeDeadline })
      ).toBe('cancelled');
    });

    it('Row 5: accepted -> agree by requester -> confirmed (when window open and no conflict)', () => {
      expect(
        nextStatus('accepted', 'agree', 'requester', {
          now: nowBeforeDeadline,
          meeting_time: meetingTime,
          duration_minutes: duration,
          hasSlotConflict: false,
        })
      ).toBe('confirmed');
    });

    it('Row 5 failure: accepted -> agree when window closed throws INVALID_TRANSITION', () => {
      expect(() =>
        nextStatus('accepted', 'agree', 'requester', {
          now: nowAfterDeadline,
          meeting_time: meetingTime,
          duration_minutes: duration,
        })
      ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));
    });

    it('Row 5 failure: accepted -> agree with slot conflict throws SLOT_CONFLICT', () => {
      expect(() =>
        nextStatus('accepted', 'agree', 'requester', {
          now: nowBeforeDeadline,
          meeting_time: meetingTime,
          duration_minutes: duration,
          hasSlotConflict: true,
        })
      ).toThrowError(expect.objectContaining({ code: 'SLOT_CONFLICT' }));
    });

    it('Row 6: accepted -> decline by requester -> rejected', () => {
      expect(
        nextStatus('accepted', 'decline', 'requester', { now: nowBeforeDeadline })
      ).toBe('rejected');
    });

    it('Row 7: accepted -> cancel by requester or provider (when window open)', () => {
      expect(
        nextStatus('accepted', 'cancel', 'requester', {
          now: nowBeforeDeadline,
          meeting_time: meetingTime,
        })
      ).toBe('cancelled');
      expect(
        nextStatus('accepted', 'cancel', 'provider', {
          now: nowBeforeDeadline,
          meeting_time: meetingTime,
        })
      ).toBe('cancelled');
    });

    it('Row 7 failure: accepted -> cancel when window closed throws CANCEL_WINDOW_CLOSED', () => {
      expect(() =>
        nextStatus('accepted', 'cancel', 'requester', {
          now: nowAfterDeadline,
          meeting_time: meetingTime,
        })
      ).toThrowError(expect.objectContaining({ code: 'CANCEL_WINDOW_CLOSED' }));
    });

    it('Row 8: confirmed -> cancel by requester or provider (when window open)', () => {
      expect(
        nextStatus('confirmed', 'cancel', 'requester', {
          now: nowBeforeDeadline,
          meeting_time: meetingTime,
        })
      ).toBe('cancelled');
      expect(
        nextStatus('confirmed', 'cancel', 'provider', {
          now: nowBeforeDeadline,
          meeting_time: meetingTime,
        })
      ).toBe('cancelled');
    });

    it('Row 8 failure: confirmed -> cancel when window closed throws CANCEL_WINDOW_CLOSED', () => {
      expect(() =>
        nextStatus('confirmed', 'cancel', 'provider', {
          now: nowAfterDeadline,
          meeting_time: meetingTime,
        })
      ).toThrowError(expect.objectContaining({ code: 'CANCEL_WINDOW_CLOSED' }));
    });

    it('Row 9: confirmed -> auto-complete by system when now >= meeting_end', () => {
      expect(
        nextStatus('confirmed', 'auto-complete', 'system', {
          now: nowAfterEnd,
          meeting_time: meetingTime,
          duration_minutes: duration,
        })
      ).toBe('completed');
    });

    it('Row 9 failure: confirmed -> auto-complete before meeting end throws INVALID_TRANSITION', () => {
      expect(() =>
        nextStatus('confirmed', 'auto-complete', 'system', {
          now: nowBeforeDeadline,
          meeting_time: meetingTime,
          duration_minutes: duration,
        })
      ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));
    });

    it('Row 10: accepted -> auto-expire by system when now > cancel_deadline', () => {
      expect(
        nextStatus('accepted', 'auto-expire', 'system', {
          now: nowAfterDeadline,
          meeting_time: meetingTime,
        })
      ).toBe('cancelled');
    });

    it('Row 10 failure: accepted -> auto-expire before cancel deadline throws INVALID_TRANSITION', () => {
      expect(() =>
        nextStatus('accepted', 'auto-expire', 'system', {
          now: nowBeforeDeadline,
          meeting_time: meetingTime,
        })
      ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));
    });

    it('Negative tests: illegal (from, action, actor) throws INVALID_TRANSITION', () => {
      // Provider cannot cancel pending
      expect(() =>
        nextStatus('pending', 'cancel', 'provider', { now: nowBeforeDeadline })
      ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));

      // Requester cannot accept pending
      expect(() =>
        nextStatus('pending', 'accept', 'requester', { now: nowBeforeDeadline })
      ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));

      // Provider cannot agree accepted slot
      expect(() =>
        nextStatus('accepted', 'agree', 'provider', {
          now: nowBeforeDeadline,
          meeting_time: meetingTime,
        })
      ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));

      // Terminal states cannot transition
      expect(() =>
        nextStatus('completed', 'cancel', 'requester', { now: nowBeforeDeadline })
      ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));
      expect(() =>
        nextStatus('rejected', 'accept', 'provider', { now: nowBeforeDeadline })
      ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));
      expect(() =>
        nextStatus('cancelled', 'agree', 'requester', { now: nowBeforeDeadline })
      ).toThrowError(expect.objectContaining({ code: 'INVALID_TRANSITION' }));
    });
  });

  describe('allowedActions & canGiveFeedback', () => {
    it('allowedActions returns actions based on role, status, and cancel window', () => {
      const baseReq: RequestView = {
        requestid: 301,
        requestdate: '2026-10-16T10:00:00Z',
        status: 'pending',
        skillid: 201,
        skillname: 'Python',
        categoryid: 1,
        categoryname: 'Programming',
        my_role: 'provider',
        counterpart_studentid: 101,
        counterpart_fname: 'Alice',
        counterpart_lname: 'Smith',
        counterpart_dept: 'CSE',
        counterpart_year: 2,
        meeting_time: null,
        duration_minutes: null,
        mode: null,
        location: null,
        meeting_link: null,
        cancel_deadline: null,
        cancelled_by: null,
        cancel_reason: null,
        feedback_given: false,
      };

      const now = new Date('2026-10-16T10:00:00Z');

      // Provider on pending: accept, reject
      expect(allowedActions(baseReq, now)).toEqual(['accept', 'reject']);

      // Requester on pending: cancel
      expect(allowedActions({ ...baseReq, my_role: 'requester' }, now)).toEqual(['cancel']);

      // Requester on accepted (window open): agree, decline, cancel
      const acceptedReq: RequestView = {
        ...baseReq,
        status: 'accepted',
        my_role: 'requester',
        meeting_time: '2026-10-16T14:00:00Z',
      };
      expect(allowedActions(acceptedReq, now)).toEqual(['agree', 'decline', 'cancel']);

      // Requester on accepted (window closed): decline only
      const lateNow = new Date('2026-10-16T13:30:00Z');
      expect(allowedActions(acceptedReq, lateNow)).toEqual(['decline']);

      // Completed has no actions in allowedActions
      expect(allowedActions({ ...baseReq, status: 'completed' }, now)).toEqual([]);
    });

    it('canGiveFeedback: only requester, only completed, only once', () => {
      const baseReq: RequestView = {
        requestid: 301,
        requestdate: '2026-10-16T10:00:00Z',
        status: 'completed',
        skillid: 201,
        skillname: 'Python',
        categoryid: 1,
        categoryname: 'Programming',
        my_role: 'requester',
        counterpart_studentid: 102,
        counterpart_fname: 'Bob',
        counterpart_lname: 'Jones',
        counterpart_dept: 'ECE',
        counterpart_year: 3,
        meeting_time: '2026-10-16T08:00:00Z',
        duration_minutes: 60,
        mode: 'online',
        location: null,
        meeting_link: 'https://meet.google.com/abc',
        cancel_deadline: '2026-10-16T07:00:00Z',
        cancelled_by: null,
        cancel_reason: null,
        feedback_given: false,
      };

      expect(canGiveFeedback(baseReq)).toBe(true);
      expect(canGiveFeedback({ ...baseReq, feedback_given: true })).toBe(false);
      expect(canGiveFeedback({ ...baseReq, status: 'confirmed' })).toBe(false);
      expect(canGiveFeedback({ ...baseReq, my_role: 'provider' })).toBe(false);
    });
  });
});
