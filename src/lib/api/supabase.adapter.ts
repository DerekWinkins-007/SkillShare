import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '../supabaseClient';
import {
  AdminCategoryRequestRow,
  AdminRequestRow,
  AdminSkillProposalRow,
  AdminStats,
  AdminStudentRow,
  AppError,
  Category,
  CategoryRequestRow,
  ContactDetails,
  ErrorCode,
  FeedbackReceivedItem,
  Me,
  MyDashboard,
  NotificationRow,
  Provider,
  PublicProfile,
  ReportRows,
  RequestView,
  SkillCatalogueItem,
  SkillProposalRow,
  SlotProposal,
  StudentRow,
} from '../types';
import { isLoginIdentifierRegno } from '../rules';
import { SkillShareAPI } from './api.interface';

const KNOWN_CODES: Set<string> = new Set<ErrorCode>([
  'NOT_AUTHENTICATED',
  'FORBIDDEN',
  'VALIDATION',
  'INVALID_REGNO',
  'REGNO_TAKEN',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'INVALID_KEYPHRASE',
  'PROFILE_INCOMPLETE',
  'NAME_TAKEN',
  'CATEGORY_NOT_FOUND',
  'SKILL_NOT_FOUND',
  'CATEGORY_IN_USE',
  'SKILL_IN_USE',
  'SKILL_NOT_OFFERED',
  'SELF_REQUEST',
  'DUPLICATE_ACTIVE_REQUEST',
  'REQUEST_NOT_FOUND',
  'INVALID_TRANSITION',
  'SLOT_TOO_SOON',
  'LOCATION_REQUIRED',
  'SLOT_CONFLICT',
  'CANCEL_WINDOW_CLOSED',
  'FEEDBACK_NOT_ALLOWED',
  'FEEDBACK_EXISTS',
  'ALREADY_REVIEWED',
  'NETWORK',
  'UNKNOWN',
]);

export function mapSupabaseError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error && typeof error === 'object') {
    const err = error as { message?: string; name?: string; code?: string; status?: number };
    const msg = err.message ?? '';

    // Check if network error
    if (err.name === 'FetchError' || msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
      return new AppError('NETWORK', msg);
    }

    // Exact match against ErrorCode
    if (KNOWN_CODES.has(msg)) {
      return new AppError(msg as ErrorCode);
    }

    // Auth specific error message parsing
    if (msg.toLowerCase().includes('invalid login credentials')) {
      return new AppError('INVALID_CREDENTIALS');
    }
  }

  return new AppError('UNKNOWN', String(error));
}

export class SupabaseAdapter implements SkillShareAPI {
  constructor(private client: SupabaseClient | null = defaultClient) {}

  private getClient(): SupabaseClient {
    if (!this.client) {
      throw new AppError('NETWORK', 'Supabase client is not initialized');
    }
    return this.client;
  }

  async signUpStudent(input: {
    regno: string;
    email: string;
    password: string;
  }): Promise<{ status: 'signed_in' | 'confirmation_required' }> {
    try {
      const client = this.getClient();
      const regno = input.regno.trim().toUpperCase();
      const email = input.email.trim().toLowerCase();

      const { data, error } = await client.auth.signUp({
        email,
        password: input.password,
        options: {
          data: {
            regno,
          },
        },
      });

      if (error) {
        const msg = error.message;
        if (msg.includes('REGNO_TAKEN')) throw new AppError('REGNO_TAKEN');
        if (msg.includes('EMAIL_TAKEN') || msg.toLowerCase().includes('already registered')) {
          throw new AppError('EMAIL_TAKEN');
        }
        if (msg.includes('INVALID_REGNO')) throw new AppError('INVALID_REGNO');
        throw mapSupabaseError(error);
      }

      if (!data.session) {
        return { status: 'confirmation_required' };
      }
      return { status: 'signed_in' };
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async signUpAdmin(input: {
    display_name: string;
    email: string;
    password: string;
    keyphrase: string;
  }): Promise<void> {
    try {
      const client = this.getClient();
      const { data, error } = await client.functions.invoke('admin-signup', {
        body: {
          display_name: input.display_name.trim(),
          email: input.email.trim().toLowerCase(),
          password: input.password,
          keyphrase: input.keyphrase,
        },
      });

      if (error) {
        throw mapSupabaseError(error);
      }

      if (data && data.code && KNOWN_CODES.has(data.code)) {
        throw new AppError(data.code as ErrorCode);
      }

      // On 201 success, sign in immediately
      const { error: signInError } = await client.auth.signInWithPassword({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });

      if (signInError) {
        throw mapSupabaseError(signInError);
      }
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async signIn(input: { identifier: string; password: string }): Promise<void> {
    try {
      const client = this.getClient();
      const raw = input.identifier.trim();
      let email = raw.toLowerCase();

      if (isLoginIdentifierRegno(raw)) {
        const regno = raw.toUpperCase();
        const { data: resolvedEmail, error: rpcError } = await client.rpc('resolve_login_identifier', {
          p_regno: regno,
        });

        if (rpcError || !resolvedEmail) {
          throw new AppError('INVALID_CREDENTIALS');
        }
        email = String(resolvedEmail).toLowerCase();
      }

      const { error } = await client.auth.signInWithPassword({
        email,
        password: input.password,
      });

      if (error) {
        throw new AppError('INVALID_CREDENTIALS');
      }
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async signOut(): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.auth.signOut();
      if (error) throw mapSupabaseError(error);
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async getMe(): Promise<Me | null> {
    try {
      const client = this.getClient();
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData?.session) return null;

      const { data, error } = await client.rpc('get_me');
      if (error) {
        if (error.message === 'NOT_AUTHENTICATED') return null;
        throw mapSupabaseError(error);
      }
      return data as Me | null;
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  onAuthChange(cb: (me: Me | null) => void): () => void {
    const client = this.getClient();
    const { data: authListener } = client.auth.onAuthStateChange(async () => {
      try {
        const me = await this.getMe();
        cb(me);
      } catch {
        cb(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }

  async updateMyProfile(input: {
    fname: string;
    lname: string;
    dept: string;
    year: number;
    phone1: string;
    phone2: string | null;
    email1: string;
    email2: string | null;
  }): Promise<StudentRow> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('update_my_profile', {
        p_fname: input.fname.trim(),
        p_lname: input.lname.trim(),
        p_dept: input.dept.trim(),
        p_year: Number(input.year),
        p_phone1: input.phone1.trim(),
        p_phone2: input.phone2 ? input.phone2.trim() : null,
        p_email1: input.email1.trim().toLowerCase(),
        p_email2: input.email2 ? input.email2.trim().toLowerCase() : null,
      });
      if (error) throw mapSupabaseError(error);
      return data as StudentRow;
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async getPublicProfile(studentid: number): Promise<PublicProfile> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('get_public_profile', {
        p_studentid: studentid,
      });
      if (error) throw mapSupabaseError(error);
      return data as PublicProfile;
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async listFeedbackReceived(studentid: number): Promise<FeedbackReceivedItem[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('list_feedback_received', {
        p_studentid: studentid,
      });
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as FeedbackReceivedItem[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async listCategories(): Promise<Category[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('category')
        .select('*')
        .order('categoryname', { ascending: true });
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as Category[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async listSkills(params?: { categoryid?: number; search?: string }): Promise<SkillCatalogueItem[]> {
    try {
      const client = this.getClient();
      let query = client.from('v_skill_catalogue').select('*');

      if (params?.categoryid !== undefined && params.categoryid !== null) {
        query = query.eq('categoryid', params.categoryid);
      }
      if (params?.search && params.search.trim() !== '') {
        query = query.ilike('skillname', `%${params.search.trim()}%`);
      }

      query = query.order('skillname', { ascending: true });
      const { data, error } = await query;
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as SkillCatalogueItem[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async listSkillProviders(skillid: number): Promise<Provider[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('list_skill_providers', {
        p_skillid: skillid,
      });
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as Provider[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async listMySkills(): Promise<{ skillid: number; skillname: string; categoryid: number; categoryname: string }[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('list_my_skills');
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as { skillid: number; skillname: string; categoryid: number; categoryname: string }[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async addMySkill(skillid: number): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc('add_my_skill', {
        p_skillid: skillid,
      });
      if (error) throw mapSupabaseError(error);
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async removeMySkill(skillid: number): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc('remove_my_skill', {
        p_skillid: skillid,
      });
      if (error) throw mapSupabaseError(error);
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async submitCategoryRequest(input: { proposed_name: string; reason?: string | null }): Promise<number> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('submit_category_request', {
        p_proposed_name: input.proposed_name.trim(),
        p_reason: input.reason ? input.reason.trim() : null,
      });
      if (error) throw mapSupabaseError(error);
      return Number(data);
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async submitSkillProposal(input: {
    proposed_name: string;
    categoryid: number;
    reason?: string | null;
  }): Promise<number> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('submit_skill_proposal', {
        p_proposed_name: input.proposed_name.trim(),
        p_categoryid: input.categoryid,
        p_reason: input.reason ? input.reason.trim() : null,
      });
      if (error) throw mapSupabaseError(error);
      return Number(data);
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async listMyCategoryRequests(): Promise<CategoryRequestRow[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('category_request')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as CategoryRequestRow[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async listMySkillProposals(): Promise<SkillProposalRow[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('skill_proposal')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as SkillProposalRow[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async adminCreateCategory(name: string): Promise<Category> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('admin_create_category', {
        p_name: name.trim(),
      });
      if (error) throw mapSupabaseError(error);
      return data as Category;
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async adminUpdateCategory(categoryid: number, name: string): Promise<Category> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('admin_update_category', {
        p_categoryid: categoryid,
        p_name: name.trim(),
      });
      if (error) throw mapSupabaseError(error);
      return data as Category;
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async adminDeleteCategory(categoryid: number): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc('admin_delete_category', {
        p_categoryid: categoryid,
      });
      if (error) throw mapSupabaseError(error);
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async adminCreateSkill(input: {
    name: string;
    categoryid: number;
  }): Promise<{ skillid: number; skillname: string; categoryid: number }> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('admin_create_skill', {
        p_name: input.name.trim(),
        p_categoryid: input.categoryid,
      });
      if (error) throw mapSupabaseError(error);
      return data as { skillid: number; skillname: string; categoryid: number };
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async adminUpdateSkill(input: {
    skillid: number;
    name: string;
    categoryid: number;
  }): Promise<{ skillid: number; skillname: string; categoryid: number }> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('admin_update_skill', {
        p_skillid: input.skillid,
        p_name: input.name.trim(),
        p_categoryid: input.categoryid,
      });
      if (error) throw mapSupabaseError(error);
      return data as { skillid: number; skillname: string; categoryid: number };
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async adminDeleteSkill(skillid: number): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc('admin_delete_skill', {
        p_skillid: skillid,
      });
      if (error) throw mapSupabaseError(error);
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async adminListCategoryRequests(status?: string | null): Promise<AdminCategoryRequestRow[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('admin_list_category_requests', {
        p_status: status && status !== 'all' ? status : null,
      });
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as AdminCategoryRequestRow[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async adminReviewCategoryRequest(input: {
    catrequestid: number;
    approve: boolean;
    note?: string | null;
  }): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc('admin_review_category_request', {
        p_catrequestid: input.catrequestid,
        p_approve: input.approve,
        p_note: input.note ? input.note.trim() : null,
      });
      if (error) throw mapSupabaseError(error);
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async adminListSkillProposals(status?: string | null): Promise<AdminSkillProposalRow[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('admin_list_skill_proposals', {
        p_status: status && status !== 'all' ? status : null,
      });
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as AdminSkillProposalRow[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async adminReviewSkillProposal(input: {
    skillproposalid: number;
    approve: boolean;
    note?: string | null;
  }): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc('admin_review_skill_proposal', {
        p_skillproposalid: input.skillproposalid,
        p_approve: input.approve,
        p_note: input.note ? input.note.trim() : null,
      });
      if (error) throw mapSupabaseError(error);
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async adminListStudents(): Promise<AdminStudentRow[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('admin_list_students');
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as AdminStudentRow[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async adminListRequests(status?: string | null): Promise<AdminRequestRow[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('admin_list_requests', {
        p_status: status && status !== 'all' ? status : null,
      });
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as AdminRequestRow[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async getAdminStats(): Promise<AdminStats> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('get_admin_stats');
      if (error) throw mapSupabaseError(error);
      return data as AdminStats;
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async createRequest(input: { provider_studentid: number; skillid: number }): Promise<number> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('create_request', {
        p_provider_studentid: input.provider_studentid,
        p_skillid: input.skillid,
      });
      if (error) throw mapSupabaseError(error);
      const requestid = Number(data);
      this.processEmailOutbox(requestid).catch(() => {});
      return requestid;
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async listMyRequests(role: 'requester' | 'provider', status?: string | null): Promise<RequestView[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('list_my_requests', {
        p_role: role,
        p_status: status && status !== 'all' ? status : null,
      });
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as RequestView[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async getRequest(requestid: number): Promise<RequestView> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('get_request', {
        p_requestid: requestid,
      });
      if (error) throw mapSupabaseError(error);
      return data as RequestView;
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async respondToRequest(input: {
    requestid: number;
    accept: boolean;
    slot?: SlotProposal;
  }): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc('respond_to_request', {
        p_requestid: input.requestid,
        p_accept: input.accept,
        p_meeting_time: input.slot ? new Date(input.slot.meeting_time).toISOString() : null,
        p_duration_minutes: input.slot ? input.slot.duration_minutes : null,
        p_mode: input.slot ? input.slot.mode : null,
        p_location: input.slot && input.slot.mode === 'offline' ? (input.slot.location?.trim() ?? null) : null,
        p_meeting_link: input.slot && input.slot.mode === 'online' ? (input.slot.meeting_link?.trim() ?? null) : null,
      });
      if (error) throw mapSupabaseError(error);
      this.processEmailOutbox(input.requestid).catch(() => {});
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async respondToSlot(input: { requestid: number; agree: boolean }): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc('respond_to_slot', {
        p_requestid: input.requestid,
        p_agree: input.agree,
      });
      if (error) throw mapSupabaseError(error);
      this.processEmailOutbox(input.requestid).catch(() => {});
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async cancelRequest(input: { requestid: number; reason: string }): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc('cancel_request', {
        p_requestid: input.requestid,
        p_reason: input.reason.trim(),
      });
      if (error) throw mapSupabaseError(error);
      this.processEmailOutbox(input.requestid).catch(() => {});
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async getContactDetails(requestid: number): Promise<ContactDetails> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('get_contact_details', {
        p_requestid: requestid,
      });
      if (error) throw mapSupabaseError(error);
      return data as ContactDetails;
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async syncCompletedRequests(): Promise<{ completed: number; expired: number }> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('sync_completed_requests');
      if (error) throw mapSupabaseError(error);
      return data as { completed: number; expired: number };
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async listFeedbackDue(): Promise<RequestView[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('list_feedback_due');
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as RequestView[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async submitFeedback(input: {
    requestid: number;
    rating: number;
    comments?: string | null;
  }): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc('submit_feedback', {
        p_requestid: input.requestid,
        p_rating: input.rating,
        p_comments: input.comments ? input.comments.trim() : null,
      });
      if (error) throw mapSupabaseError(error);
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async getMyDashboard(): Promise<MyDashboard> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('get_my_dashboard');
      if (error) throw mapSupabaseError(error);
      return data as MyDashboard;
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async listNotifications(): Promise<NotificationRow[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('notification')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as NotificationRow[];
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async markNotificationsRead(ids: number[]): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.rpc('mark_notifications_read', {
        p_ids: ids,
      });
      if (error) throw mapSupabaseError(error);
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  subscribeMyNotifications(studentid: number, cb: () => void): () => void {
    const client = this.getClient();
    const channel = client
      .channel(`public:notification:${studentid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification',
          filter: `studentid=eq.${studentid}`,
        },
        () => {
          cb();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }

  subscribeAdminQueues(cb: () => void): () => void {
    const client = this.getClient();
    const channel = client
      .channel('admin:queues')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'category_request' },
        () => cb()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'skill_proposal' },
        () => cb()
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }

  async runReport(n: number, dept?: string | null): Promise<ReportRows> {
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc('run_report', {
        p_n: n,
        p_dept: dept && dept.trim() !== '' ? dept.trim().toLowerCase() : null,
      });
      if (error) throw mapSupabaseError(error);
      return (data ?? []) as ReportRows;
    } catch (err) {
      throw mapSupabaseError(err);
    }
  }

  async processEmailOutbox(requestid?: number): Promise<void> {
    try {
      const client = this.getClient();
      await client.functions.invoke('process-email-outbox', {
        body: {
          requestid,
        },
      });
    } catch {
      // Ignored per specification: fire-and-forget
    }
  }
}

export const supabaseAdapter = new SupabaseAdapter();
