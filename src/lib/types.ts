export type Role = 'student' | 'admin';
export type RequestStatus = 'pending' | 'accepted' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
export type ProposalStatus = 'pending' | 'approved' | 'rejected';
export type Mode = 'online' | 'offline';

export interface StudentRow {
  studentid: number;
  regno: string;
  fname: string | null;
  lname: string | null;
  dept: string | null;
  year: number | null;
  phone1: string | null;
  phone2: string | null;
  email1: string | null;
  email2: string | null;
}

export interface Me {
  auth_id: string;
  role: Role;
  login_email: string;
  display_name: string | null;
  student: StudentRow | null;
  profile_complete: boolean;
}

export interface Category {
  categoryid: number;
  categoryname: string;
}

export interface SkillCatalogueItem {
  skillid: number;
  skillname: string;
  categoryid: number;
  categoryname: string;
  provider_count: number;
}

export interface Provider {
  studentid: number;
  fname: string;
  lname: string;
  dept: string;
  year: number;
  avg_rating: number | null;
  feedback_count: number;
}

export interface PublicProfile {
  studentid: number;
  fname: string;
  lname: string;
  dept: string;
  year: number;
  skills: {
    skillid: number;
    skillname: string;
    categoryid: number;
    categoryname: string;
  }[];
  avg_rating: number | null;
  feedback_count: number;
  sessions_taught: number;
}

export interface FeedbackReceivedItem {
  feedbackid: number;
  rating: number;
  comments: string | null;
  giver_fname: string;
  skillname: string;
  requestid: number;
}

export interface RequestView {
  requestid: number;
  requestdate: string;
  status: RequestStatus;
  skillid: number;
  skillname: string;
  categoryid: number;
  categoryname: string;
  my_role: 'requester' | 'provider';
  counterpart_studentid: number;
  counterpart_fname: string;
  counterpart_lname: string;
  counterpart_dept: string;
  counterpart_year: number;
  meeting_time: string | null;
  duration_minutes: number | null;
  mode: Mode | null;
  location: string | null;
  meeting_link: string | null;
  cancel_deadline: string | null;
  cancelled_by: number | null;
  cancel_reason: string | null;
  feedback_given: boolean;
}

export interface ContactDetails {
  requestid: number;
  fname: string;
  lname: string;
  dept: string;
  year: number;
  phone1: string;
  phone2: string | null;
  email1: string;
  email2: string | null;
}

export interface SlotProposal {
  meeting_time: string;
  duration_minutes: 30 | 45 | 60 | 90;
  mode: Mode;
  location: string | null;
  meeting_link: string | null;
}

export interface CategoryRequestRow {
  catrequestid: number;
  studentid: number;
  proposed_name: string;
  reason: string | null;
  status: ProposalStatus;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

export interface SkillProposalRow {
  skillproposalid: number;
  studentid: number;
  proposed_name: string;
  categoryid: number;
  reason: string | null;
  status: ProposalStatus;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

export interface AdminCategoryRequestRow extends CategoryRequestRow {
  proposer_regno: string;
  proposer_name: string;
}

export interface AdminSkillProposalRow extends SkillProposalRow {
  categoryname: string;
  proposer_regno: string;
  proposer_name: string;
}

export interface NotificationRow {
  notificationid: number;
  studentid: number;
  kind: string;
  ref_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface MyDashboard {
  my_skill_count: number;
  pending_incoming: number;
  upcoming: {
    requestid: number;
    skillname: string;
    meeting_time: string;
    counterpart_name: string;
  }[];
  avg_rating: number | null;
  feedback_count: number;
  feedback_due: {
    requestid: number;
    skillname: string;
    provider_name: string;
  }[];
}

export interface AdminStats {
  total_students: number;
  total_categories: number;
  total_skills: number;
  requests_by_status: Record<RequestStatus, number>;
  pending_category_requests: number;
  pending_skill_proposals: number;
  avg_rating: number | null;
}

export interface AdminStudentRow {
  studentid: number;
  regno: string;
  fname: string | null;
  lname: string | null;
  dept: string | null;
  year: number | null;
  profile_complete: boolean;
}

export interface AdminRequestRow {
  requestid: number;
  requestdate: string;
  status: RequestStatus;
  skillname: string;
  requester_name: string;
  provider_name: string;
  meeting_time: string | null;
}

export type ReportRows = Record<string, string | number | null>[];

export type ErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'INVALID_REGNO'
  | 'REGNO_TAKEN'
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_KEYPHRASE'
  | 'PROFILE_INCOMPLETE'
  | 'NAME_TAKEN'
  | 'CATEGORY_NOT_FOUND'
  | 'SKILL_NOT_FOUND'
  | 'CATEGORY_IN_USE'
  | 'SKILL_IN_USE'
  | 'SKILL_NOT_OFFERED'
  | 'SELF_REQUEST'
  | 'DUPLICATE_ACTIVE_REQUEST'
  | 'REQUEST_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'SLOT_TOO_SOON'
  | 'LOCATION_REQUIRED'
  | 'SLOT_CONFLICT'
  | 'CANCEL_WINDOW_CLOSED'
  | 'FEEDBACK_NOT_ALLOWED'
  | 'FEEDBACK_EXISTS'
  | 'ALREADY_REVIEWED'
  | 'NETWORK'
  | 'UNKNOWN';

export class AppError extends Error {
  constructor(public code: ErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AppError';
  }
}

export const errorMessages: Record<ErrorCode, string> = {
  NOT_AUTHENTICATED: 'Authentication required. Please sign in.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  VALIDATION: 'Invalid input provided. Please verify the form fields.',
  INVALID_REGNO: 'Invalid registration number format.',
  REGNO_TAKEN: 'This registration number is already registered.',
  EMAIL_TAKEN: 'This email address is already registered.',
  INVALID_CREDENTIALS: 'The identifier or password entered is incorrect.',
  INVALID_KEYPHRASE: 'The admin keyphrase is invalid.',
  PROFILE_INCOMPLETE: 'Your profile must be completed before performing this action.',
  NAME_TAKEN: 'This name is already in use or currently pending approval.',
  CATEGORY_NOT_FOUND: 'The specified category was not found.',
  SKILL_NOT_FOUND: 'The specified skill was not found.',
  CATEGORY_IN_USE: 'This category cannot be deleted because skills belong to it.',
  SKILL_IN_USE: 'This skill cannot be deleted because active or past requests reference it.',
  SKILL_NOT_OFFERED: 'The selected student does not offer this skill.',
  SELF_REQUEST: 'You cannot request a skill session from yourself.',
  DUPLICATE_ACTIVE_REQUEST: 'An active request for this skill and provider already exists.',
  REQUEST_NOT_FOUND: 'The requested skill session was not found.',
  INVALID_TRANSITION: 'The requested status transition is not permitted.',
  SLOT_TOO_SOON: 'Proposed meeting time must be at least 2 hours in the future.',
  LOCATION_REQUIRED: 'Location is required for offline meetings.',
  SLOT_CONFLICT: 'The proposed slot conflicts with another confirmed session.',
  CANCEL_WINDOW_CLOSED: 'Sessions cannot be cancelled less than 60 minutes before the start time.',
  FEEDBACK_NOT_ALLOWED: 'Feedback can only be submitted by the requester for completed sessions.',
  FEEDBACK_EXISTS: 'Feedback has already been submitted for this session.',
  ALREADY_REVIEWED: 'This proposal has already been reviewed.',
  NETWORK: 'Network communication error. Please try again.',
  UNKNOWN: 'An unexpected error occurred.',
};
