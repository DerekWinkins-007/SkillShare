import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseAdapter, mapSupabaseError } from './supabase.adapter';
import { SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

describe('SupabaseAdapter test suite', () => {
  let mockSupabase: {
    auth: {
      signUp: ReturnType<typeof vi.fn>;
      signInWithPassword: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
      onAuthStateChange: ReturnType<typeof vi.fn>;
    };
    rpc: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
    functions: {
      invoke: ReturnType<typeof vi.fn>;
    };
    channel: ReturnType<typeof vi.fn>;
    removeChannel: ReturnType<typeof vi.fn>;
  };
  let adapter: SupabaseAdapter;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'uuid-1' } } } }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      rpc: vi.fn(),
      from: vi.fn(),
      functions: {
        invoke: vi.fn(),
      },
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn(),
    };
    adapter = new SupabaseAdapter(mockSupabase as unknown as SupabaseClient);
  });

  describe('Secret Leakage Check (Requirement 11)', () => {
    it('verifies CHANGE-ME is absent from the Supabase adapter and its imports', () => {
      const adapterPath = path.resolve(__dirname, './supabase.adapter.ts');
      const content = fs.readFileSync(adapterPath, 'utf8');
      expect(content).not.toContain('CHANGE-ME');
      expect(content).not.toContain('secret');
      expect(content).not.toContain('mock/');
    });
  });

  describe('Error Code Mapping', () => {
    it('maps exact database exception messages to AppError codes', () => {
      expect(mapSupabaseError({ message: 'CANCEL_WINDOW_CLOSED' }).code).toBe('CANCEL_WINDOW_CLOSED');
      expect(mapSupabaseError({ message: 'SLOT_CONFLICT' }).code).toBe('SLOT_CONFLICT');
      expect(mapSupabaseError({ message: 'PROFILE_INCOMPLETE' }).code).toBe('PROFILE_INCOMPLETE');
      expect(mapSupabaseError({ message: 'FORBIDDEN' }).code).toBe('FORBIDDEN');
    });

    it('maps network failures to NETWORK and unknown errors to UNKNOWN', () => {
      expect(mapSupabaseError({ message: 'Failed to fetch' }).code).toBe('NETWORK');
      expect(mapSupabaseError({ name: 'FetchError', message: 'connection dropped' }).code).toBe('NETWORK');
      expect(mapSupabaseError({ message: 'Some raw database syntax error' }).code).toBe('UNKNOWN');
    });
  });

  describe('Auth Methods', () => {
    it('signUpStudent calls auth.signUp with regno in data', async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { session: { user: { id: 'test' } } },
        error: null,
      });

      const res = await adapter.signUpStudent({
        regno: '25BCE1234',
        email: 'test@vit.ac.in',
        password: 'Password123',
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@vit.ac.in',
        password: 'Password123',
        options: {
          data: {
            regno: '25BCE1234',
          },
        },
      });
      expect(res.status).toBe('signed_in');
    });

    it('signUpAdmin calls Edge Function admin-signup and then signs in', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

      await adapter.signUpAdmin({
        display_name: 'Super Admin',
        email: 'admin@vit.ac.in',
        password: 'Password123',
        keyphrase: 'typed-keyphrase',
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('admin-signup', {
        body: {
          display_name: 'Super Admin',
          email: 'admin@vit.ac.in',
          password: 'Password123',
          keyphrase: 'typed-keyphrase',
        },
      });
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@vit.ac.in',
        password: 'Password123',
      });
    });

    it('signIn with valid regno and matching email resolves and signs in student', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'student@vit.ac.in', error: null });
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });
      mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: {} } });
      mockSupabase.rpc.mockResolvedValueOnce({ data: { role: 'student' }, error: null });

      await adapter.signIn({
        regno: '25bce1234',
        email: 'student@vit.ac.in',
        password: 'Password123',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('resolve_login_identifier', {
        p_regno: '25BCE1234',
      });
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'student@vit.ac.in',
        password: 'Password123',
      });
    });

    it('signIn throws INVALID_CREDENTIALS if email differs from resolved email', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'different@vit.ac.in', error: null });

      await expect(
        adapter.signIn({
          regno: '25BCE1234',
          email: 'student@vit.ac.in',
          password: 'Password123',
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_CREDENTIALS' }));
    });

    it('signIn throws INVALID_CREDENTIALS if account is admin and signs out', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'admin@vit.ac.in', error: null });
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });
      mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: {} } });
      mockSupabase.rpc.mockResolvedValueOnce({ data: { role: 'admin' }, error: null });

      await expect(
        adapter.signIn({
          regno: '25BCE1234',
          email: 'admin@vit.ac.in',
          password: 'Password123',
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_CREDENTIALS' }));

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('signInAdmin signs in admin successfully', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });
      mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: {} } });
      mockSupabase.rpc.mockResolvedValueOnce({ data: { role: 'admin' }, error: null });

      await adapter.signInAdmin({
        email: 'admin@vit.ac.in',
        password: 'Password123',
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@vit.ac.in',
        password: 'Password123',
      });
    });

    it('signInAdmin throws INVALID_CREDENTIALS if account is not admin and signs out', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });
      mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: {} } });
      mockSupabase.rpc.mockResolvedValueOnce({ data: { role: 'student' }, error: null });

      await expect(
        adapter.signInAdmin({
          email: 'student@vit.ac.in',
          password: 'Password123',
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_CREDENTIALS' }));

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('RPC Calls and Parameters', () => {
    it('calls get_me', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: { auth_id: '123' }, error: null });
      await adapter.getMe();
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_me');
    });

    it('calls update_my_profile with p_ parameters', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: {}, error: null });
      await adapter.updateMyProfile({
        fname: 'John',
        lname: 'Doe',
        dept: 'CSE',
        year: 2,
        phone1: '9876543210',
        phone2: null,
        email1: 'john@vit.ac.in',
        email2: null,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_my_profile', {
        p_fname: 'John',
        p_lname: 'Doe',
        p_dept: 'CSE',
        p_year: 2,
        p_phone1: '9876543210',
        p_phone2: null,
        p_email1: 'john@vit.ac.in',
        p_email2: null,
      });
    });

    it('calls create_request with p_provider_studentid and p_skillid and triggers process-email-outbox', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: 301, error: null });
      mockSupabase.functions.invoke.mockResolvedValueOnce({ data: { sent: 1, failed: 0 }, error: null });
      const res = await adapter.createRequest({ provider_studentid: 102, skillid: 201 });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_request', {
        p_provider_studentid: 102,
        p_skillid: 201,
      });
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('process-email-outbox', {
        body: { requestid: 301 },
      });
      expect(res).toBe(301);
    });

    it('calls respond_to_request with p_ parameters and triggers process-email-outbox', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });
      mockSupabase.functions.invoke.mockResolvedValueOnce({ data: { sent: 1, failed: 0 }, error: null });
      await adapter.respondToRequest({
        requestid: 301,
        accept: true,
        slot: {
          meeting_time: '2026-10-16T12:00:00.000Z',
          duration_minutes: 45,
          mode: 'online',
          location: null,
          meeting_link: 'https://meet.google.com/abc',
        },
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('respond_to_request', {
        p_requestid: 301,
        p_accept: true,
        p_meeting_time: '2026-10-16T12:00:00.000Z',
        p_duration_minutes: 45,
        p_mode: 'online',
        p_location: null,
        p_meeting_link: 'https://meet.google.com/abc',
      });
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('process-email-outbox', {
        body: { requestid: 301 },
      });
    });

    it('calls respond_to_slot with p_requestid and p_agree and triggers process-email-outbox', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });
      mockSupabase.functions.invoke.mockResolvedValueOnce({ data: { sent: 1, failed: 0 }, error: null });
      await adapter.respondToSlot({ requestid: 301, agree: true });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('respond_to_slot', {
        p_requestid: 301,
        p_agree: true,
      });
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('process-email-outbox', {
        body: { requestid: 301 },
      });
    });

    it('calls cancel_request with p_requestid and p_reason and triggers process-email-outbox', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });
      mockSupabase.functions.invoke.mockResolvedValueOnce({ data: { sent: 1, failed: 0 }, error: null });
      await adapter.cancelRequest({ requestid: 301, reason: 'Personal emergency' });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('cancel_request', {
        p_requestid: 301,
        p_reason: 'Personal emergency',
      });
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('process-email-outbox', {
        body: { requestid: 301 },
      });
    });

    it('calls get_contact_details with p_requestid', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: {}, error: null });
      await adapter.getContactDetails(301);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_contact_details', {
        p_requestid: 301,
      });
    });

    it('calls sync_completed_requests', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: { completed: 1, expired: 0 }, error: null });
      const res = await adapter.syncCompletedRequests();
      expect(mockSupabase.rpc).toHaveBeenCalledWith('sync_completed_requests');
      expect(res).toEqual({ completed: 1, expired: 0 });
    });

    it('calls submit_feedback with p_requestid, p_rating, p_comments', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });
      await adapter.submitFeedback({ requestid: 301, rating: 5, comments: 'Superb' });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('submit_feedback', {
        p_requestid: 301,
        p_rating: 5,
        p_comments: 'Superb',
      });
    });

    it('calls run_report with p_n and p_dept', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });
      await adapter.runReport(1, 'CSE');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('run_report', {
        p_n: 1,
        p_dept: 'cse',
      });
    });

    it('calls admin review RPCs with p_ parameters', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });
      await adapter.adminReviewCategoryRequest({ catrequestid: 1, approve: true, note: 'Approved' });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('admin_review_category_request', {
        p_catrequestid: 1,
        p_approve: true,
        p_note: 'Approved',
      });

      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });
      await adapter.adminReviewSkillProposal({ skillproposalid: 2, approve: false, note: 'Rejected' });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('admin_review_skill_proposal', {
        p_skillproposalid: 2,
        p_approve: false,
        p_note: 'Rejected',
      });
    });
  });
});
