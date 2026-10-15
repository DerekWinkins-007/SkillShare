import {
  AdminCategoryRequestRow,
  AdminRequestRow,
  AdminSkillProposalRow,
  AdminStats,
  AdminStudentRow,
  Category,
  CategoryRequestRow,
  ContactDetails,
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

export interface SkillShareAPI {
  signUpStudent(input: {
    regno: string;
    email: string;
    password: string;
  }): Promise<{ status: 'signed_in' | 'confirmation_required' }>;

  signUpAdmin(input: {
    display_name: string;
    email: string;
    password: string;
    keyphrase: string;
  }): Promise<void>;

  signIn(input: { identifier: string; password: string }): Promise<void>;

  signOut(): Promise<void>;

  getMe(): Promise<Me | null>;

  onAuthChange(cb: (me: Me | null) => void): () => void;

  updateMyProfile(input: {
    fname: string;
    lname: string;
    dept: string;
    year: number;
    phone1: string;
    phone2: string | null;
    email1: string;
    email2: string | null;
  }): Promise<StudentRow>;

  getPublicProfile(studentid: number): Promise<PublicProfile>;

  listFeedbackReceived(studentid: number): Promise<FeedbackReceivedItem[]>;

  listCategories(): Promise<Category[]>;

  listSkills(params?: { categoryid?: number; search?: string }): Promise<SkillCatalogueItem[]>;

  listSkillProviders(skillid: number): Promise<Provider[]>;

  listMySkills(): Promise<{ skillid: number; skillname: string; categoryid: number; categoryname: string }[]>;

  addMySkill(skillid: number): Promise<void>;

  removeMySkill(skillid: number): Promise<void>;

  submitCategoryRequest(input: { proposed_name: string; reason?: string | null }): Promise<number>;

  submitSkillProposal(input: {
    proposed_name: string;
    categoryid: number;
    reason?: string | null;
  }): Promise<number>;

  listMyCategoryRequests(): Promise<CategoryRequestRow[]>;

  listMySkillProposals(): Promise<SkillProposalRow[]>;

  adminCreateCategory(name: string): Promise<Category>;

  adminUpdateCategory(categoryid: number, name: string): Promise<Category>;

  adminDeleteCategory(categoryid: number): Promise<void>;

  adminCreateSkill(input: { name: string; categoryid: number }): Promise<{
    skillid: number;
    skillname: string;
    categoryid: number;
  }>;

  adminUpdateSkill(input: {
    skillid: number;
    name: string;
    categoryid: number;
  }): Promise<{ skillid: number; skillname: string; categoryid: number }>;

  adminDeleteSkill(skillid: number): Promise<void>;

  adminListCategoryRequests(status?: string | null): Promise<AdminCategoryRequestRow[]>;

  adminReviewCategoryRequest(input: {
    catrequestid: number;
    approve: boolean;
    note?: string | null;
  }): Promise<void>;

  adminListSkillProposals(status?: string | null): Promise<AdminSkillProposalRow[]>;

  adminReviewSkillProposal(input: {
    skillproposalid: number;
    approve: boolean;
    note?: string | null;
  }): Promise<void>;

  adminListStudents(): Promise<AdminStudentRow[]>;

  adminListRequests(status?: string | null): Promise<AdminRequestRow[]>;

  getAdminStats(): Promise<AdminStats>;

  createRequest(input: { provider_studentid: number; skillid: number }): Promise<number>;

  listMyRequests(role: 'requester' | 'provider', status?: string | null): Promise<RequestView[]>;

  getRequest(requestid: number): Promise<RequestView>;

  respondToRequest(input: {
    requestid: number;
    accept: boolean;
    slot?: SlotProposal;
  }): Promise<void>;

  respondToSlot(input: { requestid: number; agree: boolean }): Promise<void>;

  cancelRequest(input: { requestid: number; reason: string }): Promise<void>;

  getContactDetails(requestid: number): Promise<ContactDetails>;

  syncCompletedRequests(): Promise<{ completed: number; expired: number }>;

  listFeedbackDue(): Promise<RequestView[]>;

  submitFeedback(input: {
    requestid: number;
    rating: number;
    comments?: string | null;
  }): Promise<void>;

  getMyDashboard(): Promise<MyDashboard>;

  listNotifications(): Promise<NotificationRow[]>;

  markNotificationsRead(ids: number[]): Promise<void>;

  subscribeMyNotifications(studentid: number, cb: () => void): () => void;

  subscribeAdminQueues(cb: () => void): () => void;

  runReport(n: number, dept?: string | null): Promise<ReportRows>;

  processEmailOutbox(requestid?: number): Promise<void>;
}
