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
  FeedbackReceivedItem,
  Me,
  Mode,
  MyDashboard,
  NotificationRow,
  ProposalStatus,
  Provider,
  PublicProfile,
  ReportRows,
  RequestStatus,
  RequestView,
  Role,
  SkillCatalogueItem,
  SkillProposalRow,
  SlotProposal,
  StudentRow,
} from '../../types';
import { SkillShareAPI } from '../api.interface';
import {
  cancelDeadline,
  Duration,
  intervalsOverlap,
  isCancelWindowOpen,
  isProfileComplete,
  isValidPhone,
  isValidRegno,
  meetingEnd,
  nextStatus,
  normaliseName,
  passwordRules,
  validateSlot,
} from '../../rules';
import { now, nowISO } from '../../clock';
import { constantTimeCompare, MOCK_ADMIN_KEYPHRASE } from './secret';
import { renderEmail, EmailPayload } from '../../../../shared/emailTemplates';

// Types for Mock Database Tables
interface MockStudent {
  studentid: number;
  phone1: string | null;
  phone2: string | null;
  email1: string | null;
  email2: string | null;
  fname: string | null;
  lname: string | null;
  year: number | null;
  dept: string | null;
}

interface MockSignup {
  studentid: number;
  username: string; // regno
  salt: string | null;
  password: string | null;
}

interface MockAppUser {
  auth_id: string;
  role: Role;
  studentid: number | null;
  display_name: string | null;
  created_at: string;
  email: string;
  password_hash: string;
  password_salt: string;
}

interface MockCategory {
  categoryid: number;
  categoryname: string;
}

interface MockSkill {
  skillid: number;
  skillname: string;
  categoryid: number;
}

interface MockStudentHasSkill {
  studentid: number;
  skillid: number;
}

interface MockSkillRequest {
  requestid: number;
  requestdate: string;
  status: RequestStatus;
  skillid: number;
}

interface MockRequestMeeting {
  requestid: number;
  meeting_time: string;
  duration_minutes: Duration;
  mode: Mode;
  location: string | null;
  meeting_link: string | null;
  proposed_at: string;
}

interface MockRequestCancellation {
  requestid: number;
  cancelled_by: number | null;
  reason: string;
  cancelled_at: string;
}

interface MockStudentSendsSkillRequest {
  studentid: number;
  requestid: number;
}

interface MockStudentReceivesSkillRequest {
  studentid: number;
  requestid: number;
}

interface MockFeedback {
  studentid: number;
  feedbackid: number;
  comments: string | null;
  rating: number;
  requestid: number;
}

interface MockCategoryRequest {
  catrequestid: number;
  studentid: number;
  proposed_name: string;
  reason: string | null;
  status: ProposalStatus;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

interface MockSkillProposal {
  skillproposalid: number;
  studentid: number;
  proposed_name: string;
  categoryid: number;
  reason: string | null;
  status: ProposalStatus;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

interface MockNotification {
  notificationid: number;
  studentid: number;
  kind: string;
  ref_id: number | null;
  is_read: boolean;
  created_at: string;
}

interface MockEmailOutbox {
  emailid: number;
  requestid: number | null;
  kind: string;
  to_studentid: number;
  payload: EmailPayload;
  status: 'queued' | 'sent' | 'failed';
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface SentEmail {
  emailid: number;
  to: string[];
  subject: string;
  html: string;
  text: string;
}

interface MockDbState {
  sequences: {
    category: number;
    student: number;
    skill: number;
    skill_request: number;
    student_gives_feedback: number;
    student_receives_feedback: number;
    category_request: number;
    skill_proposal: number;
    notification: number;
    email_outbox: number;
  };
  category: MockCategory[];
  student: MockStudent[];
  skill: MockSkill[];
  studenthas_skill: MockStudentHasSkill[];
  skill_request: MockSkillRequest[];
  student_sends_skill_request: MockStudentSendsSkillRequest[];
  student_receives_skill_request: MockStudentReceivesSkillRequest[];
  student_gives_feedback: MockFeedback[];
  student_receives_feedback: MockFeedback[];
  signup: MockSignup[];
  app_user: MockAppUser[];
  request_meeting: MockRequestMeeting[];
  request_cancellation: MockRequestCancellation[];
  category_request: MockCategoryRequest[];
  skill_proposal: MockSkillProposal[];
  notification: MockNotification[];
  email_outbox: MockEmailOutbox[];
}

const STORAGE_KEY_DB = 'skillshare_mock_db_v1';
const STORAGE_KEY_SESSION = 'skillshare_mock_session_v1';

function createInitialDb(): MockDbState {
  return {
    sequences: {
      category: 1,
      student: 101,
      skill: 201,
      skill_request: 301,
      student_gives_feedback: 401,
      student_receives_feedback: 501,
      category_request: 1,
      skill_proposal: 1,
      notification: 1,
      email_outbox: 1,
    },
    category: [],
    student: [],
    skill: [],
    studenthas_skill: [],
    skill_request: [],
    student_sends_skill_request: [],
    student_receives_skill_request: [],
    student_gives_feedback: [],
    student_receives_feedback: [],
    signup: [],
    app_user: [],
    request_meeting: [],
    request_cancellation: [],
    category_request: [],
    skill_proposal: [],
    notification: [],
    email_outbox: [],
  };
}

let inMemoryDb: MockDbState = createInitialDb();
let mockOutbox: SentEmail[] = [];

function loadDb(): MockDbState {
  if (typeof localStorage === 'undefined') {
    return createInitialDb();
  }
  const raw = localStorage.getItem(STORAGE_KEY_DB);
  if (!raw) {
    const initial = createInitialDb();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(initial));
    }
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const initial = createInitialDb();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(initial));
    }
    return initial;
  }
}

function saveDb(state?: MockDbState): void {
  if (state) {
    inMemoryDb = state;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(inMemoryDb));
  }
}

// Initialise from localStorage
inMemoryDb = loadDb();

export function resetMockDb(): void {
  inMemoryDb = createInitialDb();
  saveDb(inMemoryDb);
  mockOutbox = [];
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }
  notifyAuthChange(null);
}

export function getMockOutbox(): SentEmail[] {
  return mockOutbox;
}

// Password hashing
async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password + ':' + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Event Emitters for Realtime Subscriptions
type AuthListener = (me: Me | null) => void;
type NotificationListener = () => void;
type AdminQueueListener = () => void;

const authListeners: Set<AuthListener> = new Set();
const notificationListeners: Map<number, Set<NotificationListener>> = new Map();
const adminQueueListeners: Set<AdminQueueListener> = new Set();

function notifyAuthChange(me: Me | null): void {
  authListeners.forEach((cb) => {
    try {
      cb(me);
    } catch (e) {
      console.error(e);
    }
  });
}

function notifyStudentNotification(studentid: number): void {
  const set = notificationListeners.get(studentid);
  if (set) {
    set.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    });
  }
}

function notifyAdminQueue(): void {
  adminQueueListeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error(e);
    }
  });
}

// Session Helpers
function getCurrentAuthId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_SESSION);
}

function setCurrentAuthId(authId: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (authId) {
    localStorage.setItem(STORAGE_KEY_SESSION, authId);
  } else {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }
}

export class MockAdapter implements SkillShareAPI {
  private getDb(): MockDbState {
    return inMemoryDb;
  }

  private async getAuthenticatedUser(): Promise<{ appUser: MockAppUser; student: MockStudent | null }> {
    const authId = getCurrentAuthId();
    if (!authId) {
      throw new AppError('NOT_AUTHENTICATED');
    }
    const db = this.getDb();
    const appUser = db.app_user.find((u) => u.auth_id === authId);
    if (!appUser) {
      throw new AppError('NOT_AUTHENTICATED');
    }
    let student: MockStudent | null = null;
    if (appUser.role === 'student' && appUser.studentid !== null) {
      student = db.student.find((s) => s.studentid === appUser.studentid) ?? null;
    }
    return { appUser, student };
  }

  private async requireStudent(): Promise<{ appUser: MockAppUser; student: MockStudent }> {
    const { appUser, student } = await this.getAuthenticatedUser();
    if (appUser.role !== 'student' || !student) {
      throw new AppError('FORBIDDEN');
    }
    return { appUser, student };
  }

  private async requireAdmin(): Promise<MockAppUser> {
    const { appUser } = await this.getAuthenticatedUser();
    if (appUser.role !== 'admin') {
      throw new AppError('FORBIDDEN');
    }
    return appUser;
  }

  // --- Auth & Profile ---

  async signUpStudent(input: {
    regno: string;
    email: string;
    password: string;
  }): Promise<{ status: 'signed_in' | 'confirmation_required' }> {
    const trimmedRegno = input.regno.trim().toUpperCase();
    const trimmedEmail = input.email.trim().toLowerCase();

    if (!isValidRegno(trimmedRegno)) {
      throw new AppError('INVALID_REGNO');
    }
    if (!trimmedEmail || trimmedEmail.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new AppError('VALIDATION', 'Invalid email address');
    }
    if (!passwordRules(input.password)) {
      throw new AppError('VALIDATION', 'Password does not meet requirements');
    }

    const db = this.getDb();
    if (db.signup.some((s) => s.username === trimmedRegno)) {
      throw new AppError('REGNO_TAKEN');
    }
    if (db.app_user.some((u) => u.email === trimmedEmail)) {
      throw new AppError('EMAIL_TAKEN');
    }

    const studentid = db.sequences.student++;
    const auth_id = crypto.randomUUID();
    const salt = crypto.randomUUID();
    const hash = await hashPassword(input.password, salt);

    const newStudent: MockStudent = {
      studentid,
      phone1: null,
      phone2: null,
      email1: trimmedEmail,
      email2: null,
      fname: null,
      lname: null,
      year: null,
      dept: null,
    };

    const newSignup: MockSignup = {
      studentid,
      username: trimmedRegno,
      salt: null,
      password: null,
    };

    const newAppUser: MockAppUser = {
      auth_id,
      role: 'student',
      studentid,
      display_name: null,
      created_at: nowISO(),
      email: trimmedEmail,
      password_hash: hash,
      password_salt: salt,
    };

    db.student.push(newStudent);
    db.signup.push(newSignup);
    db.app_user.push(newAppUser);
    saveDb(db);

    setCurrentAuthId(auth_id);
    const me = await this.getMe();
    notifyAuthChange(me);

    return { status: 'signed_in' };
  }

  async signUpAdmin(input: {
    display_name: string;
    email: string;
    password: string;
    keyphrase: string;
  }): Promise<void> {
    if (!constantTimeCompare(input.keyphrase, MOCK_ADMIN_KEYPHRASE)) {
      throw new AppError('INVALID_KEYPHRASE');
    }

    const trimmedName = input.display_name.trim();
    const trimmedEmail = input.email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length > 60) {
      throw new AppError('VALIDATION', 'Display name must be 1 to 60 characters');
    }
    if (!trimmedEmail || trimmedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new AppError('VALIDATION', 'Invalid email address');
    }
    if (!passwordRules(input.password)) {
      throw new AppError('VALIDATION', 'Password does not meet requirements');
    }

    const db = this.getDb();
    if (db.app_user.some((u) => u.email === trimmedEmail)) {
      throw new AppError('EMAIL_TAKEN');
    }

    const auth_id = crypto.randomUUID();
    const salt = crypto.randomUUID();
    const hash = await hashPassword(input.password, salt);

    const newAppUser: MockAppUser = {
      auth_id,
      role: 'admin',
      studentid: null,
      display_name: trimmedName,
      created_at: nowISO(),
      email: trimmedEmail,
      password_hash: hash,
      password_salt: salt,
    };

    db.app_user.push(newAppUser);
    saveDb(db);

    setCurrentAuthId(auth_id);
    const me = await this.getMe();
    notifyAuthChange(me);
  }

  async signIn(input: { regno: string; email: string; password: string }): Promise<void> {
    const regno = input.regno.trim().toUpperCase();
    const email = input.email.trim().toLowerCase();

    if (!isValidRegno(regno)) {
      throw new AppError('INVALID_CREDENTIALS');
    }

    const db = this.getDb();
    const signupRow = db.signup.find((s) => s.username === regno);
    if (!signupRow) {
      throw new AppError('INVALID_CREDENTIALS');
    }

    const targetUser = db.app_user.find((u) => u.studentid === signupRow.studentid);
    if (!targetUser || targetUser.role !== 'student') {
      throw new AppError('INVALID_CREDENTIALS');
    }

    if (targetUser.email.toLowerCase() !== email) {
      throw new AppError('INVALID_CREDENTIALS');
    }

    const computedHash = await hashPassword(input.password, targetUser.password_salt);
    if (!constantTimeCompare(computedHash, targetUser.password_hash)) {
      throw new AppError('INVALID_CREDENTIALS');
    }

    setCurrentAuthId(targetUser.auth_id);
    const me = await this.getMe();
    notifyAuthChange(me);
  }

  async signInAdmin(input: { email: string; password: string }): Promise<void> {
    const email = input.email.trim().toLowerCase();
    const db = this.getDb();
    const targetUser = db.app_user.find((u) => u.email === email);

    if (!targetUser || targetUser.role !== 'admin') {
      throw new AppError('INVALID_CREDENTIALS');
    }

    const computedHash = await hashPassword(input.password, targetUser.password_salt);
    if (!constantTimeCompare(computedHash, targetUser.password_hash)) {
      throw new AppError('INVALID_CREDENTIALS');
    }

    setCurrentAuthId(targetUser.auth_id);
    const me = await this.getMe();
    notifyAuthChange(me);
  }

  async signOut(): Promise<void> {
    setCurrentAuthId(null);
    notifyAuthChange(null);
  }

  async getMe(): Promise<Me | null> {
    const authId = getCurrentAuthId();
    if (!authId) return null;
    const db = this.getDb();
    const appUser = db.app_user.find((u) => u.auth_id === authId);
    if (!appUser) return null;

    let studentRow: StudentRow | null = null;
    let profileComplete = false;

    if (appUser.role === 'student' && appUser.studentid !== null) {
      const s = db.student.find((st) => st.studentid === appUser.studentid);
      const signup = db.signup.find((sg) => sg.studentid === appUser.studentid);
      if (s && signup) {
        studentRow = {
          studentid: s.studentid,
          regno: signup.username,
          fname: s.fname,
          lname: s.lname,
          dept: s.dept,
          year: s.year,
          phone1: s.phone1,
          phone2: s.phone2,
          email1: s.email1,
          email2: s.email2,
        };
        profileComplete = isProfileComplete(s);
      }
    }

    return {
      auth_id: appUser.auth_id,
      role: appUser.role,
      login_email: appUser.email,
      display_name: appUser.display_name,
      student: studentRow,
      profile_complete: profileComplete,
    };
  }

  onAuthChange(cb: (me: Me | null) => void): () => void {
    authListeners.add(cb);
    return () => {
      authListeners.delete(cb);
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
    const { student } = await this.requireStudent();
    const fname = input.fname.trim();
    const lname = input.lname.trim();
    const dept = input.dept.trim();
    const year = Number(input.year);
    const phone1 = input.phone1.trim();
    const phone2 = input.phone2 && input.phone2.trim() !== '' ? input.phone2.trim() : null;
    const email1 = input.email1.trim().toLowerCase();
    const email2 = input.email2 && input.email2.trim() !== '' ? input.email2.trim().toLowerCase() : null;

    if (!fname || fname.length > 20) throw new AppError('VALIDATION', 'fname 1-20 chars');
    if (!lname || lname.length > 20) throw new AppError('VALIDATION', 'lname 1-20 chars');
    if (!dept || dept.length > 30) throw new AppError('VALIDATION', 'dept 1-30 chars');
    if (![1, 2, 3, 4].includes(year)) throw new AppError('VALIDATION', 'year must be 1 to 4');
    if (!isValidPhone(phone1)) throw new AppError('VALIDATION', 'phone1 invalid');
    if (phone2 && !isValidPhone(phone2)) throw new AppError('VALIDATION', 'phone2 invalid');
    if (!email1 || email1.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email1)) {
      throw new AppError('VALIDATION', 'email1 invalid');
    }
    if (email2 && (email2.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email2))) {
      throw new AppError('VALIDATION', 'email2 invalid');
    }

    const db = this.getDb();
    const target = db.student.find((s) => s.studentid === student.studentid);
    if (!target) throw new AppError('UNKNOWN', 'Student record missing');

    target.fname = fname;
    target.lname = lname;
    target.dept = dept;
    target.year = year;
    target.phone1 = phone1;
    target.phone2 = phone2;
    target.email1 = email1;
    target.email2 = email2;
    saveDb(db);

    const me = await this.getMe();
    notifyAuthChange(me);

    const signup = db.signup.find((sg) => sg.studentid === student.studentid);
    return {
      studentid: target.studentid,
      regno: signup?.username ?? '',
      fname: target.fname,
      lname: target.lname,
      dept: target.dept,
      year: target.year,
      phone1: target.phone1,
      phone2: target.phone2,
      email1: target.email1,
      email2: target.email2,
    };
  }

  async getPublicProfile(studentid: number): Promise<PublicProfile> {
    await this.getAuthenticatedUser(); // Must be logged in
    const db = this.getDb();
    const s = db.student.find((st) => st.studentid === studentid);
    if (!s) throw new AppError('UNKNOWN', 'Student not found');

    const skillIds = db.studenthas_skill.filter((sh) => sh.studentid === studentid).map((sh) => sh.skillid);
    const skills = db.skill
      .filter((sk) => skillIds.includes(sk.skillid))
      .map((sk) => {
        const c = db.category.find((cat) => cat.categoryid === sk.categoryid);
        return {
          skillid: sk.skillid,
          skillname: sk.skillname,
          categoryid: sk.categoryid,
          categoryname: c?.categoryname ?? '',
        };
      });

    const receivedFeedbacks = db.student_receives_feedback.filter((f) => f.studentid === studentid);
    const feedback_count = receivedFeedbacks.length;
    let avg_rating: number | null = null;
    if (feedback_count > 0) {
      const sum = receivedFeedbacks.reduce((acc, f) => acc + f.rating, 0);
      avg_rating = Math.round((sum / feedback_count) * 10) / 10;
    }

    // Sessions taught = count of completed requests where this student was provider
    const providerRequestIds = db.student_receives_skill_request
      .filter((r) => r.studentid === studentid)
      .map((r) => r.requestid);
    const sessions_taught = db.skill_request.filter(
      (r) => providerRequestIds.includes(r.requestid) && r.status === 'completed'
    ).length;

    return {
      studentid: s.studentid,
      fname: s.fname ?? '',
      lname: s.lname ?? '',
      dept: s.dept ?? '',
      year: s.year ?? 1,
      skills,
      avg_rating,
      feedback_count,
      sessions_taught,
    };
  }

  async listFeedbackReceived(studentid: number): Promise<FeedbackReceivedItem[]> {
    await this.getAuthenticatedUser();
    const db = this.getDb();
    const items: FeedbackReceivedItem[] = [];

    const feedbacks = db.student_receives_feedback.filter((f) => f.studentid === studentid);
    for (const f of feedbacks) {
      const req = db.skill_request.find((r) => r.requestid === f.requestid);
      const skill = req ? db.skill.find((sk) => sk.skillid === req.skillid) : null;
      const sendRow = db.student_sends_skill_request.find((sr) => sr.requestid === f.requestid);
      const giver = sendRow ? db.student.find((st) => st.studentid === sendRow.studentid) : null;

      items.push({
        feedbackid: f.feedbackid,
        rating: f.rating,
        comments: f.comments,
        giver_fname: giver?.fname ?? 'Anonymous',
        skillname: skill?.skillname ?? 'Skill',
        requestid: f.requestid,
      });
    }

    return items;
  }

  // --- Categories & Skills ---

  async listCategories(): Promise<Category[]> {
    const db = this.getDb();
    return [...db.category].sort((a, b) => a.categoryname.localeCompare(b.categoryname));
  }

  async listSkills(params?: { categoryid?: number; search?: string }): Promise<SkillCatalogueItem[]> {
    const db = this.getDb();
    let skills = [...db.skill];

    if (params?.categoryid !== undefined && params.categoryid !== null) {
      skills = skills.filter((sk) => sk.categoryid === params.categoryid);
    }
    if (params?.search && params.search.trim() !== '') {
      const q = params.search.trim().toLowerCase();
      skills = skills.filter((sk) => sk.skillname.toLowerCase().includes(q));
    }

    const items: SkillCatalogueItem[] = skills.map((sk) => {
      const c = db.category.find((cat) => cat.categoryid === sk.categoryid);
      const provider_count = db.studenthas_skill.filter((sh) => sh.skillid === sk.skillid).length;
      return {
        skillid: sk.skillid,
        skillname: sk.skillname,
        categoryid: sk.categoryid,
        categoryname: c?.categoryname ?? '',
        provider_count,
      };
    });

    items.sort((a, b) => a.skillname.localeCompare(b.skillname));
    return items;
  }

  async listSkillProviders(skillid: number): Promise<Provider[]> {
    const { student } = await this.requireStudent();
    const db = this.getDb();

    const providerStudentIds = db.studenthas_skill
      .filter((sh) => sh.skillid === skillid && sh.studentid !== student.studentid)
      .map((sh) => sh.studentid);

    const providers: Provider[] = [];
    for (const pid of providerStudentIds) {
      const st = db.student.find((s) => s.studentid === pid);
      if (st && isProfileComplete(st)) {
        const receivedFeedbacks = db.student_receives_feedback.filter((f) => f.studentid === pid);
        const feedback_count = receivedFeedbacks.length;
        let avg_rating: number | null = null;
        if (feedback_count > 0) {
          const sum = receivedFeedbacks.reduce((acc, f) => acc + f.rating, 0);
          avg_rating = Math.round((sum / feedback_count) * 10) / 10;
        }
        providers.push({
          studentid: st.studentid,
          fname: st.fname ?? '',
          lname: st.lname ?? '',
          dept: st.dept ?? '',
          year: st.year ?? 1,
          avg_rating,
          feedback_count,
        });
      }
    }

    return providers;
  }

  async listMySkills(): Promise<{ skillid: number; skillname: string; categoryid: number; categoryname: string }[]> {
    const { student } = await this.requireStudent();
    const db = this.getDb();

    const mySkillIds = db.studenthas_skill
      .filter((sh) => sh.studentid === student.studentid)
      .map((sh) => sh.skillid);

    return db.skill
      .filter((sk) => mySkillIds.includes(sk.skillid))
      .map((sk) => {
        const c = db.category.find((cat) => cat.categoryid === sk.categoryid);
        return {
          skillid: sk.skillid,
          skillname: sk.skillname,
          categoryid: sk.categoryid,
          categoryname: c?.categoryname ?? '',
        };
      })
      .sort((a, b) => a.skillname.localeCompare(b.skillname));
  }

  async addMySkill(skillid: number): Promise<void> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    const sk = db.skill.find((s) => s.skillid === skillid);
    if (!sk) throw new AppError('SKILL_NOT_FOUND');

    const exists = db.studenthas_skill.some(
      (sh) => sh.studentid === student.studentid && sh.skillid === skillid
    );
    if (!exists) {
      db.studenthas_skill.push({ studentid: student.studentid, skillid });
      saveDb(db);
    }
  }

  async removeMySkill(skillid: number): Promise<void> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    db.studenthas_skill = db.studenthas_skill.filter(
      (sh) => !(sh.studentid === student.studentid && sh.skillid === skillid)
    );
    saveDb(db);
  }

  // --- Student Proposals ---

  async submitCategoryRequest(input: { proposed_name: string; reason?: string | null }): Promise<number> {
    const { student } = await this.requireStudent();
    if (!isProfileComplete(student)) throw new AppError('PROFILE_INCOMPLETE');

    const normName = normaliseName(input.proposed_name);
    if (!normName || normName.length > 30) throw new AppError('VALIDATION', 'Name 1-30 chars');
    const reason = input.reason ? input.reason.trim() : null;
    if (reason && reason.length > 200) throw new AppError('VALIDATION', 'Reason max 200 chars');

    const db = this.getDb();
    const lowerName = normName.toLowerCase();
    const exists =
      db.category.some((c) => c.categoryname.toLowerCase() === lowerName) ||
      db.category_request.some(
        (cr) => cr.status === 'pending' && cr.proposed_name.toLowerCase() === lowerName
      );
    if (exists) throw new AppError('NAME_TAKEN');

    const catrequestid = db.sequences.category_request++;
    const row: MockCategoryRequest = {
      catrequestid,
      studentid: student.studentid,
      proposed_name: normName,
      reason,
      status: 'pending',
      created_at: nowISO(),
      reviewed_by: null,
      reviewed_at: null,
      review_note: null,
    };
    db.category_request.push(row);
    saveDb(db);
    notifyAdminQueue();

    return catrequestid;
  }

  async submitSkillProposal(input: {
    proposed_name: string;
    categoryid: number;
    reason?: string | null;
  }): Promise<number> {
    const { student } = await this.requireStudent();
    if (!isProfileComplete(student)) throw new AppError('PROFILE_INCOMPLETE');

    const db = this.getDb();
    const categoryExists = db.category.some((c) => c.categoryid === input.categoryid);
    if (!categoryExists) throw new AppError('CATEGORY_NOT_FOUND');

    const normName = normaliseName(input.proposed_name);
    if (!normName || normName.length > 30) throw new AppError('VALIDATION', 'Name 1-30 chars');
    const reason = input.reason ? input.reason.trim() : null;
    if (reason && reason.length > 200) throw new AppError('VALIDATION', 'Reason max 200 chars');

    const lowerName = normName.toLowerCase();
    const exists =
      db.skill.some((sk) => sk.skillname.toLowerCase() === lowerName) ||
      db.skill_proposal.some(
        (sp) => sp.status === 'pending' && sp.proposed_name.toLowerCase() === lowerName
      );
    if (exists) throw new AppError('NAME_TAKEN');

    const skillproposalid = db.sequences.skill_proposal++;
    const row: MockSkillProposal = {
      skillproposalid,
      studentid: student.studentid,
      proposed_name: normName,
      categoryid: input.categoryid,
      reason,
      status: 'pending',
      created_at: nowISO(),
      reviewed_by: null,
      reviewed_at: null,
      review_note: null,
    };
    db.skill_proposal.push(row);
    saveDb(db);
    notifyAdminQueue();

    return skillproposalid;
  }

  async listMyCategoryRequests(): Promise<CategoryRequestRow[]> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    return db.category_request
      .filter((cr) => cr.studentid === student.studentid)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async listMySkillProposals(): Promise<SkillProposalRow[]> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    return db.skill_proposal
      .filter((sp) => sp.studentid === student.studentid)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  // --- Admin Capabilities ---

  async adminCreateCategory(name: string): Promise<Category> {
    await this.requireAdmin();
    const norm = normaliseName(name);
    if (!norm || norm.length > 30) throw new AppError('VALIDATION', 'Category name 1-30 chars');

    const db = this.getDb();
    if (db.category.some((c) => c.categoryname.toLowerCase() === norm.toLowerCase())) {
      throw new AppError('NAME_TAKEN');
    }

    const categoryid = db.sequences.category++;
    const cat: MockCategory = { categoryid, categoryname: norm };
    db.category.push(cat);
    saveDb(db);
    return cat;
  }

  async adminUpdateCategory(categoryid: number, name: string): Promise<Category> {
    await this.requireAdmin();
    const norm = normaliseName(name);
    if (!norm || norm.length > 30) throw new AppError('VALIDATION', 'Category name 1-30 chars');

    const db = this.getDb();
    const cat = db.category.find((c) => c.categoryid === categoryid);
    if (!cat) throw new AppError('CATEGORY_NOT_FOUND');

    if (
      db.category.some(
        (c) => c.categoryid !== categoryid && c.categoryname.toLowerCase() === norm.toLowerCase()
      )
    ) {
      throw new AppError('NAME_TAKEN');
    }

    cat.categoryname = norm;
    saveDb(db);
    return cat;
  }

  async adminDeleteCategory(categoryid: number): Promise<void> {
    await this.requireAdmin();
    const db = this.getDb();
    if (db.skill.some((sk) => sk.categoryid === categoryid)) {
      throw new AppError('CATEGORY_IN_USE');
    }
    db.category = db.category.filter((c) => c.categoryid !== categoryid);
    saveDb(db);
  }

  async adminCreateSkill(input: {
    name: string;
    categoryid: number;
  }): Promise<{ skillid: number; skillname: string; categoryid: number }> {
    await this.requireAdmin();
    const db = this.getDb();
    if (!db.category.some((c) => c.categoryid === input.categoryid)) {
      throw new AppError('CATEGORY_NOT_FOUND');
    }

    const norm = normaliseName(input.name);
    if (!norm || norm.length > 30) throw new AppError('VALIDATION', 'Skill name 1-30 chars');

    if (db.skill.some((sk) => sk.skillname.toLowerCase() === norm.toLowerCase())) {
      throw new AppError('NAME_TAKEN');
    }

    const skillid = db.sequences.skill++;
    const skill: MockSkill = { skillid, skillname: norm, categoryid: input.categoryid };
    db.skill.push(skill);
    saveDb(db);
    return skill;
  }

  async adminUpdateSkill(input: {
    skillid: number;
    name: string;
    categoryid: number;
  }): Promise<{ skillid: number; skillname: string; categoryid: number }> {
    await this.requireAdmin();
    const db = this.getDb();
    const sk = db.skill.find((s) => s.skillid === input.skillid);
    if (!sk) throw new AppError('SKILL_NOT_FOUND');

    if (!db.category.some((c) => c.categoryid === input.categoryid)) {
      throw new AppError('CATEGORY_NOT_FOUND');
    }

    const norm = normaliseName(input.name);
    if (!norm || norm.length > 30) throw new AppError('VALIDATION', 'Skill name 1-30 chars');

    if (
      db.skill.some(
        (s) => s.skillid !== input.skillid && s.skillname.toLowerCase() === norm.toLowerCase()
      )
    ) {
      throw new AppError('NAME_TAKEN');
    }

    sk.skillname = norm;
    sk.categoryid = input.categoryid;
    saveDb(db);
    return sk;
  }

  async adminDeleteSkill(skillid: number): Promise<void> {
    await this.requireAdmin();
    const db = this.getDb();
    if (db.skill_request.some((sr) => sr.skillid === skillid)) {
      throw new AppError('SKILL_IN_USE');
    }
    db.skill = db.skill.filter((s) => s.skillid !== skillid);
    db.studenthas_skill = db.studenthas_skill.filter((sh) => sh.skillid !== skillid);
    saveDb(db);
  }

  async adminListCategoryRequests(status?: string | null): Promise<AdminCategoryRequestRow[]> {
    await this.requireAdmin();
    const db = this.getDb();
    let list = db.category_request;
    if (status && status !== 'all') {
      list = list.filter((cr) => cr.status === status);
    }
    return list
      .map((cr) => {
        const student = db.student.find((s) => s.studentid === cr.studentid);
        const signup = db.signup.find((sg) => sg.studentid === cr.studentid);
        const name = student ? `${student.fname ?? ''} ${student.lname ?? ''}`.trim() : '';
        return {
          ...cr,
          proposer_regno: signup?.username ?? '',
          proposer_name: name || 'Student',
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async adminReviewCategoryRequest(input: {
    catrequestid: number;
    approve: boolean;
    note?: string | null;
  }): Promise<void> {
    const admin = await this.requireAdmin();
    const db = this.getDb();
    const req = db.category_request.find((cr) => cr.catrequestid === input.catrequestid);
    if (!req) throw new AppError('UNKNOWN', 'Category request not found');
    if (req.status !== 'pending') throw new AppError('ALREADY_REVIEWED');

    const note = input.note ? input.note.trim() : null;
    if (note && note.length > 200) throw new AppError('VALIDATION', 'Note max 200 chars');

    if (input.approve) {
      if (db.category.some((c) => c.categoryname.toLowerCase() === req.proposed_name.toLowerCase())) {
        throw new AppError('NAME_TAKEN');
      }
      const categoryid = db.sequences.category++;
      db.category.push({ categoryid, categoryname: req.proposed_name });
      req.status = 'approved';
    } else {
      req.status = 'rejected';
    }

    req.reviewed_by = admin.auth_id;
    req.reviewed_at = nowISO();
    req.review_note = note;

    // Create notification for proposer
    const nid = db.sequences.notification++;
    db.notification.push({
      notificationid: nid,
      studentid: req.studentid,
      kind: 'category_request_reviewed',
      ref_id: req.catrequestid,
      is_read: false,
      created_at: nowISO(),
    });

    saveDb(db);
    notifyStudentNotification(req.studentid);
  }

  async adminListSkillProposals(status?: string | null): Promise<AdminSkillProposalRow[]> {
    await this.requireAdmin();
    const db = this.getDb();
    let list = db.skill_proposal;
    if (status && status !== 'all') {
      list = list.filter((sp) => sp.status === status);
    }
    return list
      .map((sp) => {
        const cat = db.category.find((c) => c.categoryid === sp.categoryid);
        const student = db.student.find((s) => s.studentid === sp.studentid);
        const signup = db.signup.find((sg) => sg.studentid === sp.studentid);
        const name = student ? `${student.fname ?? ''} ${student.lname ?? ''}`.trim() : '';
        return {
          ...sp,
          categoryname: cat?.categoryname ?? '',
          proposer_regno: signup?.username ?? '',
          proposer_name: name || 'Student',
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async adminReviewSkillProposal(input: {
    skillproposalid: number;
    approve: boolean;
    note?: string | null;
  }): Promise<void> {
    const admin = await this.requireAdmin();
    const db = this.getDb();
    const prop = db.skill_proposal.find((sp) => sp.skillproposalid === input.skillproposalid);
    if (!prop) throw new AppError('UNKNOWN', 'Skill proposal not found');
    if (prop.status !== 'pending') throw new AppError('ALREADY_REVIEWED');

    const note = input.note ? input.note.trim() : null;
    if (note && note.length > 200) throw new AppError('VALIDATION', 'Note max 200 chars');

    if (input.approve) {
      if (!db.category.some((c) => c.categoryid === prop.categoryid)) {
        throw new AppError('CATEGORY_NOT_FOUND');
      }
      if (db.skill.some((sk) => sk.skillname.toLowerCase() === prop.proposed_name.toLowerCase())) {
        throw new AppError('NAME_TAKEN');
      }
      const skillid = db.sequences.skill++;
      db.skill.push({ skillid, skillname: prop.proposed_name, categoryid: prop.categoryid });
      prop.status = 'approved';
    } else {
      prop.status = 'rejected';
    }

    prop.reviewed_by = admin.auth_id;
    prop.reviewed_at = nowISO();
    prop.review_note = note;

    // Create notification for proposer
    const nid = db.sequences.notification++;
    db.notification.push({
      notificationid: nid,
      studentid: prop.studentid,
      kind: 'skill_proposal_reviewed',
      ref_id: prop.skillproposalid,
      is_read: false,
      created_at: nowISO(),
    });

    saveDb(db);
    notifyStudentNotification(prop.studentid);
  }

  async adminListStudents(): Promise<AdminStudentRow[]> {
    await this.requireAdmin();
    const db = this.getDb();
    return db.student.map((s) => {
      const signup = db.signup.find((sg) => sg.studentid === s.studentid);
      return {
        studentid: s.studentid,
        regno: signup?.username ?? '',
        fname: s.fname,
        lname: s.lname,
        dept: s.dept,
        year: s.year,
        profile_complete: isProfileComplete(s),
      };
    });
  }

  async adminListRequests(status?: string | null): Promise<AdminRequestRow[]> {
    await this.requireAdmin();
    const db = this.getDb();
    let list = db.skill_request;
    if (status && status !== 'all') {
      list = list.filter((r) => r.status === status);
    }
    return list.map((r) => {
      const skill = db.skill.find((sk) => sk.skillid === r.skillid);
      const sSend = db.student_sends_skill_request.find((sr) => sr.requestid === r.requestid);
      const sRecv = db.student_receives_skill_request.find((sr) => sr.requestid === r.requestid);
      const reqStudent = sSend ? db.student.find((st) => st.studentid === sSend.studentid) : null;
      const provStudent = sRecv ? db.student.find((st) => st.studentid === sRecv.studentid) : null;
      const meet = db.request_meeting.find((m) => m.requestid === r.requestid);

      return {
        requestid: r.requestid,
        requestdate: r.requestdate,
        status: r.status,
        skillname: skill?.skillname ?? '',
        requester_name: reqStudent ? `${reqStudent.fname ?? ''} ${reqStudent.lname ?? ''}`.trim() : 'Unknown',
        provider_name: provStudent ? `${provStudent.fname ?? ''} ${provStudent.lname ?? ''}`.trim() : 'Unknown',
        meeting_time: meet?.meeting_time ?? null,
      };
    });
  }

  async getAdminStats(): Promise<AdminStats> {
    await this.requireAdmin();
    const db = this.getDb();
    const total_students = db.student.length;
    const total_categories = db.category.length;
    const total_skills = db.skill.length;

    const requests_by_status: Record<RequestStatus, number> = {
      pending: 0,
      accepted: 0,
      confirmed: 0,
      rejected: 0,
      cancelled: 0,
      completed: 0,
    };
    for (const r of db.skill_request) {
      if (requests_by_status[r.status] !== undefined) {
        requests_by_status[r.status]++;
      }
    }

    const pending_category_requests = db.category_request.filter((cr) => cr.status === 'pending').length;
    const pending_skill_proposals = db.skill_proposal.filter((sp) => sp.status === 'pending').length;

    let avg_rating: number | null = null;
    if (db.student_gives_feedback.length > 0) {
      const sum = db.student_gives_feedback.reduce((acc, f) => acc + f.rating, 0);
      avg_rating = Math.round((sum / db.student_gives_feedback.length) * 10) / 10;
    }

    return {
      total_students,
      total_categories,
      total_skills,
      requests_by_status,
      pending_category_requests,
      pending_skill_proposals,
      avg_rating,
    };
  }

  // --- Skill Requests Workflow ---

  async createRequest(input: { provider_studentid: number; skillid: number }): Promise<number> {
    const { student } = await this.requireStudent();

    // Check order in Section 5.5:
    // 1. Caller is a student with a complete profile (PROFILE_INCOMPLETE)
    if (!isProfileComplete(student)) {
      throw new AppError('PROFILE_INCOMPLETE');
    }

    const db = this.getDb();

    // 2. Skill exists (SKILL_NOT_FOUND)
    const skill = db.skill.find((sk) => sk.skillid === input.skillid);
    if (!skill) {
      throw new AppError('SKILL_NOT_FOUND');
    }

    // 3. provider_studentid is not the caller (SELF_REQUEST)
    if (input.provider_studentid === student.studentid) {
      throw new AppError('SELF_REQUEST');
    }

    // 4. The provider has this skill in studenthas_skill (SKILL_NOT_OFFERED)
    const providerHasSkill = db.studenthas_skill.some(
      (sh) => sh.studentid === input.provider_studentid && sh.skillid === input.skillid
    );
    if (!providerHasSkill) {
      throw new AppError('SKILL_NOT_OFFERED');
    }

    // 5. No active request (status in pending, accepted, confirmed) exists with the same requester, provider and skill (DUPLICATE_ACTIVE_REQUEST)
    const activeExists = db.skill_request.some((r) => {
      if (!['pending', 'accepted', 'confirmed'].includes(r.status)) return false;
      if (r.skillid !== input.skillid) return false;
      const sSend = db.student_sends_skill_request.find((sr) => sr.requestid === r.requestid);
      const sRecv = db.student_receives_skill_request.find((sr) => sr.requestid === r.requestid);
      return sSend?.studentid === student.studentid && sRecv?.studentid === input.provider_studentid;
    });
    if (activeExists) {
      throw new AppError('DUPLICATE_ACTIVE_REQUEST');
    }

    // Atomically insert skill_request, student_sends_skill_request, student_receives_skill_request
    const requestid = db.sequences.skill_request++;
    const nowTime = nowISO();

    db.skill_request.push({
      requestid,
      requestdate: nowTime,
      status: 'pending',
      skillid: input.skillid,
    });
    db.student_sends_skill_request.push({
      studentid: student.studentid,
      requestid,
    });
    db.student_receives_skill_request.push({
      studentid: input.provider_studentid,
      requestid,
    });

    // Queue notification and email for the provider
    const nid = db.sequences.notification++;
    db.notification.push({
      notificationid: nid,
      studentid: input.provider_studentid,
      kind: 'request_received',
      ref_id: requestid,
      is_read: false,
      created_at: nowTime,
    });

    const eid = db.sequences.email_outbox++;
    const requesterName = `${student.fname ?? ''} ${student.lname ?? ''}`.trim() || 'A student';
    db.email_outbox.push({
      emailid: eid,
      requestid,
      kind: 'request_received',
      to_studentid: input.provider_studentid,
      payload: {
        kind: 'request_received',
        requestid,
        requester_name: requesterName,
        skillname: skill.skillname,
      },
      status: 'queued',
      attempts: 0,
      last_error: null,
      created_at: nowTime,
      sent_at: null,
    });

    saveDb(db);
    notifyStudentNotification(input.provider_studentid);

    // Fire and forget
    this.processEmailOutbox(requestid).catch(() => {});

    return requestid;
  }

  async listMyRequests(role: 'requester' | 'provider', status?: string | null): Promise<RequestView[]> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    const reqIds: number[] =
      role === 'requester'
        ? db.student_sends_skill_request
            .filter((sr) => sr.studentid === student.studentid)
            .map((sr) => sr.requestid)
        : db.student_receives_skill_request
            .filter((sr) => sr.studentid === student.studentid)
            .map((sr) => sr.requestid);

    let requests = db.skill_request.filter((r) => reqIds.includes(r.requestid));
    if (status && status !== 'all') {
      requests = requests.filter((r) => r.status === status);
    }

    const views: RequestView[] = [];
    for (const r of requests) {
      views.push(this.buildRequestView(r, student.studentid));
    }

    views.sort((a, b) => b.requestdate.localeCompare(a.requestdate));
    return views;
  }

  async getRequest(requestid: number): Promise<RequestView> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    const req = db.skill_request.find((r) => r.requestid === requestid);
    if (!req) throw new AppError('REQUEST_NOT_FOUND');

    const sSend = db.student_sends_skill_request.find((sr) => sr.requestid === requestid);
    const sRecv = db.student_receives_skill_request.find((sr) => sr.requestid === requestid);

    if (sSend?.studentid !== student.studentid && sRecv?.studentid !== student.studentid) {
      throw new AppError('REQUEST_NOT_FOUND');
    }

    return this.buildRequestView(req, student.studentid);
  }

  private buildRequestView(req: MockSkillRequest, currentStudentId: number): RequestView {
    const db = this.getDb();
    const sSend = db.student_sends_skill_request.find((sr) => sr.requestid === req.requestid);
    const sRecv = db.student_receives_skill_request.find((sr) => sr.requestid === req.requestid);
    const my_role: 'requester' | 'provider' =
      sSend?.studentid === currentStudentId ? 'requester' : 'provider';
    const counterpart_studentid =
      my_role === 'requester' ? sRecv?.studentid ?? 0 : sSend?.studentid ?? 0;
    const counterpart = db.student.find((s) => s.studentid === counterpart_studentid);

    const skill = db.skill.find((sk) => sk.skillid === req.skillid);
    const cat = skill ? db.category.find((c) => c.categoryid === skill.categoryid) : null;
    const meet = db.request_meeting.find((m) => m.requestid === req.requestid);
    const cancel = db.request_cancellation.find((c) => c.requestid === req.requestid);
    const feedback_given = db.student_gives_feedback.some((f) => f.requestid === req.requestid);

    const cDeadline = meet?.meeting_time ? cancelDeadline(meet.meeting_time).toISOString() : null;

    return {
      requestid: req.requestid,
      requestdate: req.requestdate,
      status: req.status,
      skillid: req.skillid,
      skillname: skill?.skillname ?? '',
      categoryid: cat?.categoryid ?? 0,
      categoryname: cat?.categoryname ?? '',
      my_role,
      counterpart_studentid,
      counterpart_fname: counterpart?.fname ?? '',
      counterpart_lname: counterpart?.lname ?? '',
      counterpart_dept: counterpart?.dept ?? '',
      counterpart_year: counterpart?.year ?? 1,
      meeting_time: meet?.meeting_time ?? null,
      duration_minutes: meet?.duration_minutes ?? null,
      mode: meet?.mode ?? null,
      location: meet?.location ?? null,
      meeting_link: meet?.meeting_link ?? null,
      cancel_deadline: cDeadline,
      cancelled_by: cancel?.cancelled_by ?? null,
      cancel_reason: cancel?.reason ?? null,
      feedback_given,
    };
  }

  private checkStudentConflict(studentid: number, newStart: Date, newEnd: Date, excludeRequestId?: number): boolean {
    const db = this.getDb();
    const confirmedReqIds = db.skill_request
      .filter((r) => r.status === 'confirmed' && r.requestid !== excludeRequestId)
      .map((r) => r.requestid);

    for (const rid of confirmedReqIds) {
      const isParty =
        db.student_sends_skill_request.some((sr) => sr.requestid === rid && sr.studentid === studentid) ||
        db.student_receives_skill_request.some((sr) => sr.requestid === rid && sr.studentid === studentid);
      if (isParty) {
        const meeting = db.request_meeting.find((m) => m.requestid === rid);
        if (meeting) {
          const mStart = new Date(meeting.meeting_time);
          const mEnd = meetingEnd(mStart, meeting.duration_minutes);
          if (intervalsOverlap(newStart, newEnd, mStart, mEnd)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  async respondToRequest(input: {
    requestid: number;
    accept: boolean;
    slot?: SlotProposal;
  }): Promise<void> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    const req = db.skill_request.find((r) => r.requestid === input.requestid);
    if (!req) throw new AppError('REQUEST_NOT_FOUND');

    const sRecv = db.student_receives_skill_request.find((sr) => sr.requestid === input.requestid);
    if (sRecv?.studentid !== student.studentid || req.status !== 'pending') {
      throw new AppError('INVALID_TRANSITION');
    }

    const sSend = db.student_sends_skill_request.find((sr) => sr.requestid === input.requestid);
    const requesterStudentId = sSend?.studentid ?? 0;
    const skill = db.skill.find((sk) => sk.skillid === req.skillid);
    const nowTime = now();
    const nowStr = nowISO();

    if (!input.accept) {
      req.status = 'rejected';
      // Notify & email requester
      const nid = db.sequences.notification++;
      db.notification.push({
        notificationid: nid,
        studentid: requesterStudentId,
        kind: 'request_rejected',
        ref_id: req.requestid,
        is_read: false,
        created_at: nowStr,
      });

      const eid = db.sequences.email_outbox++;
      db.email_outbox.push({
        emailid: eid,
        requestid: req.requestid,
        kind: 'request_rejected',
        to_studentid: requesterStudentId,
        payload: {
          kind: 'request_rejected',
          requestid: req.requestid,
          provider_name: `${student.fname ?? ''} ${student.lname ?? ''}`.trim() || 'The provider',
          skillname: skill?.skillname ?? 'Skill',
        },
        status: 'queued',
        attempts: 0,
        last_error: null,
        created_at: nowStr,
        sent_at: null,
      });

      saveDb(db);
      notifyStudentNotification(requesterStudentId);
      this.processEmailOutbox(req.requestid).catch(() => {});
      return;
    }

    // Accept branch requires slot
    if (!input.slot) throw new AppError('VALIDATION', 'Slot is required when accepting');
    validateSlot(input.slot, nowTime);

    const meetingStart = new Date(input.slot.meeting_time);
    const meetingEndTime = meetingEnd(meetingStart, input.slot.duration_minutes);

    // Provider must have no confirmed overlap
    if (this.checkStudentConflict(student.studentid, meetingStart, meetingEndTime, req.requestid)) {
      throw new AppError('SLOT_CONFLICT');
    }

    const mode = input.slot.mode;
    const location = mode === 'offline' ? (input.slot.location ? input.slot.location.trim() : null) : null;
    const meeting_link = mode === 'online' ? (input.slot.meeting_link ? input.slot.meeting_link.trim() : null) : null;

    db.request_meeting.push({
      requestid: req.requestid,
      meeting_time: new Date(input.slot.meeting_time).toISOString(),
      duration_minutes: input.slot.duration_minutes,
      mode,
      location,
      meeting_link,
      proposed_at: nowStr,
    });

    req.status = 'accepted';

    // Notify requester
    const nid = db.sequences.notification++;
    db.notification.push({
      notificationid: nid,
      studentid: requesterStudentId,
      kind: 'request_accepted',
      ref_id: req.requestid,
      is_read: false,
      created_at: nowStr,
    });

    const eid = db.sequences.email_outbox++;
    db.email_outbox.push({
      emailid: eid,
      requestid: req.requestid,
      kind: 'request_accepted',
      to_studentid: requesterStudentId,
      payload: {
        kind: 'request_accepted',
        requestid: req.requestid,
        provider_name: `${student.fname ?? ''} ${student.lname ?? ''}`.trim() || 'The provider',
        skillname: skill?.skillname ?? 'Skill',
        meeting_time: new Date(input.slot.meeting_time).toISOString(),
        duration_minutes: input.slot.duration_minutes,
        mode,
        location,
        meeting_link,
      },
      status: 'queued',
      attempts: 0,
      last_error: null,
      created_at: nowStr,
      sent_at: null,
    });

    saveDb(db);
    notifyStudentNotification(requesterStudentId);
    this.processEmailOutbox(req.requestid).catch(() => {});
  }

  async respondToSlot(input: { requestid: number; agree: boolean }): Promise<void> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    const req = db.skill_request.find((r) => r.requestid === input.requestid);
    if (!req) throw new AppError('REQUEST_NOT_FOUND');

    const sSend = db.student_sends_skill_request.find((sr) => sr.requestid === input.requestid);
    if (sSend?.studentid !== student.studentid || req.status !== 'accepted') {
      throw new AppError('INVALID_TRANSITION');
    }

    const sRecv = db.student_receives_skill_request.find((sr) => sr.requestid === input.requestid);
    const providerStudentId = sRecv?.studentid ?? 0;
    const provider = db.student.find((s) => s.studentid === providerStudentId);
    const skill = db.skill.find((sk) => sk.skillid === req.skillid);
    const cat = skill ? db.category.find((c) => c.categoryid === skill.categoryid) : null;
    const meeting = db.request_meeting.find((m) => m.requestid === req.requestid);
    if (!meeting) throw new AppError('INVALID_TRANSITION', 'Missing meeting record');

    const nowTime = now();
    const nowStr = nowISO();

    if (!input.agree) {
      req.status = 'rejected';
      // Notify provider
      const nid = db.sequences.notification++;
      db.notification.push({
        notificationid: nid,
        studentid: providerStudentId,
        kind: 'request_rejected',
        ref_id: req.requestid,
        is_read: false,
        created_at: nowStr,
      });

      saveDb(db);
      notifyStudentNotification(providerStudentId);
      return;
    }

    // Agree branch
    if (!isCancelWindowOpen(meeting.meeting_time, nowTime)) {
      throw new AppError('INVALID_TRANSITION', 'Cancel window closed or expired');
    }

    const mStart = new Date(meeting.meeting_time);
    const mEnd = meetingEnd(mStart, meeting.duration_minutes);

    // Overlap check for BOTH parties
    if (
      this.checkStudentConflict(student.studentid, mStart, mEnd, req.requestid) ||
      this.checkStudentConflict(providerStudentId, mStart, mEnd, req.requestid)
    ) {
      throw new AppError('SLOT_CONFLICT');
    }

    req.status = 'confirmed';

    // Notify BOTH students
    const nReq = db.sequences.notification++;
    db.notification.push({
      notificationid: nReq,
      studentid: student.studentid,
      kind: 'request_confirmed',
      ref_id: req.requestid,
      is_read: false,
      created_at: nowStr,
    });
    const nProv = db.sequences.notification++;
    db.notification.push({
      notificationid: nProv,
      studentid: providerStudentId,
      kind: 'request_confirmed',
      ref_id: req.requestid,
      is_read: false,
      created_at: nowStr,
    });

    // Queue confirmation emails to BOTH
    const cDeadlineStr = cancelDeadline(meeting.meeting_time).toISOString();

    // 1. To requester (role: learner, counterpart: provider)
    const eReq = db.sequences.email_outbox++;
    db.email_outbox.push({
      emailid: eReq,
      requestid: req.requestid,
      kind: 'request_confirmed',
      to_studentid: student.studentid,
      payload: {
        kind: 'request_confirmed',
        requestid: req.requestid,
        skillname: skill?.skillname ?? '',
        categoryname: cat?.categoryname ?? '',
        recipient_role: 'learner',
        meeting_time: meeting.meeting_time,
        duration_minutes: meeting.duration_minutes,
        mode: meeting.mode,
        location: meeting.location,
        meeting_link: meeting.meeting_link,
        cancel_deadline: cDeadlineStr,
        counterpart: {
          fname: provider?.fname ?? '',
          lname: provider?.lname ?? '',
          dept: provider?.dept ?? '',
          year: provider?.year ?? 1,
          phone1: provider?.phone1 ?? '',
          phone2: provider?.phone2,
          email1: provider?.email1 ?? '',
          email2: provider?.email2,
        },
      },
      status: 'queued',
      attempts: 0,
      last_error: null,
      created_at: nowStr,
      sent_at: null,
    });

    // 2. To provider (role: teacher, counterpart: requester)
    const eProv = db.sequences.email_outbox++;
    db.email_outbox.push({
      emailid: eProv,
      requestid: req.requestid,
      kind: 'request_confirmed',
      to_studentid: providerStudentId,
      payload: {
        kind: 'request_confirmed',
        requestid: req.requestid,
        skillname: skill?.skillname ?? '',
        categoryname: cat?.categoryname ?? '',
        recipient_role: 'teacher',
        meeting_time: meeting.meeting_time,
        duration_minutes: meeting.duration_minutes,
        mode: meeting.mode,
        location: meeting.location,
        meeting_link: meeting.meeting_link,
        cancel_deadline: cDeadlineStr,
        counterpart: {
          fname: student.fname ?? '',
          lname: student.lname ?? '',
          dept: student.dept ?? '',
          year: student.year ?? 1,
          phone1: student.phone1 ?? '',
          phone2: student.phone2,
          email1: student.email1 ?? '',
          email2: student.email2,
        },
      },
      status: 'queued',
      attempts: 0,
      last_error: null,
      created_at: nowStr,
      sent_at: null,
    });

    saveDb(db);
    notifyStudentNotification(student.studentid);
    notifyStudentNotification(providerStudentId);
    this.processEmailOutbox(req.requestid).catch(() => {});
  }

  async cancelRequest(input: { requestid: number; reason: string }): Promise<void> {
    const { student } = await this.requireStudent();
    const reason = input.reason.trim();
    if (!reason || reason.length > 200) {
      throw new AppError('VALIDATION', 'Cancel reason must be 1 to 200 characters');
    }

    const db = this.getDb();
    const req = db.skill_request.find((r) => r.requestid === input.requestid);
    if (!req) throw new AppError('REQUEST_NOT_FOUND');

    const sSend = db.student_sends_skill_request.find((sr) => sr.requestid === input.requestid);
    const sRecv = db.student_receives_skill_request.find((sr) => sr.requestid === input.requestid);

    const isRequester = sSend?.studentid === student.studentid;
    const isProvider = sRecv?.studentid === student.studentid;
    if (!isRequester && !isProvider) {
      throw new AppError('FORBIDDEN');
    }

    const actor = isRequester ? 'requester' : 'provider';
    const otherStudentId = isRequester ? sRecv?.studentid ?? 0 : sSend?.studentid ?? 0;
    const meeting = db.request_meeting.find((m) => m.requestid === req.requestid);
    const nowTime = now();
    const nowStr = nowISO();

    const targetStatus = nextStatus(req.status, 'cancel', actor, {
      now: nowTime,
      meeting_time: meeting?.meeting_time,
      duration_minutes: meeting?.duration_minutes,
    });

    req.status = targetStatus;
    db.request_cancellation.push({
      requestid: req.requestid,
      cancelled_by: student.studentid,
      reason,
      cancelled_at: nowStr,
    });

    // Notify & email the other party
    const nid = db.sequences.notification++;
    db.notification.push({
      notificationid: nid,
      studentid: otherStudentId,
      kind: 'request_cancelled',
      ref_id: req.requestid,
      is_read: false,
      created_at: nowStr,
    });

    const skill = db.skill.find((sk) => sk.skillid === req.skillid);
    const eid = db.sequences.email_outbox++;
    db.email_outbox.push({
      emailid: eid,
      requestid: req.requestid,
      kind: 'request_cancelled',
      to_studentid: otherStudentId,
      payload: {
        kind: 'request_cancelled',
        requestid: req.requestid,
        cancelled_by_fname: student.fname ?? 'Student',
        skillname: skill?.skillname ?? 'Skill',
        meeting_time: meeting?.meeting_time ?? null,
        reason,
      },
      status: 'queued',
      attempts: 0,
      last_error: null,
      created_at: nowStr,
      sent_at: null,
    });

    saveDb(db);
    notifyStudentNotification(otherStudentId);
    this.processEmailOutbox(req.requestid).catch(() => {});
  }

  async getContactDetails(requestid: number): Promise<ContactDetails> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    const req = db.skill_request.find((r) => r.requestid === requestid);
    if (!req) throw new AppError('REQUEST_NOT_FOUND');

    const sSend = db.student_sends_skill_request.find((sr) => sr.requestid === requestid);
    const sRecv = db.student_receives_skill_request.find((sr) => sr.requestid === requestid);

    const isParty = sSend?.studentid === student.studentid || sRecv?.studentid === student.studentid;
    if (!isParty) throw new AppError('FORBIDDEN');

    if (req.status !== 'confirmed' && req.status !== 'completed') {
      throw new AppError('FORBIDDEN');
    }

    const counterpartId = sSend?.studentid === student.studentid ? sRecv?.studentid ?? 0 : sSend?.studentid ?? 0;
    const counterpart = db.student.find((s) => s.studentid === counterpartId);
    if (!counterpart) throw new AppError('UNKNOWN', 'Counterpart student not found');

    return {
      requestid,
      fname: counterpart.fname ?? '',
      lname: counterpart.lname ?? '',
      dept: counterpart.dept ?? '',
      year: counterpart.year ?? 1,
      phone1: counterpart.phone1 ?? '',
      phone2: counterpart.phone2,
      email1: counterpart.email1 ?? '',
      email2: counterpart.email2,
    };
  }

  async syncCompletedRequests(): Promise<{ completed: number; expired: number }> {
    const db = this.getDb();
    const nowTime = now();
    const nowStr = nowISO();
    let completed = 0;
    let expired = 0;

    // 1. Auto-complete confirmed requests where now >= meeting_end
    for (const r of db.skill_request) {
      if (r.status === 'confirmed') {
        const meet = db.request_meeting.find((m) => m.requestid === r.requestid);
        if (meet) {
          const mEnd = meetingEnd(meet.meeting_time, meet.duration_minutes);
          if (nowTime.getTime() >= mEnd.getTime()) {
            r.status = 'completed';
            completed++;

            // Create feedback_due notification for requester
            const sSend = db.student_sends_skill_request.find((sr) => sr.requestid === r.requestid);
            if (sSend) {
              const nid = db.sequences.notification++;
              db.notification.push({
                notificationid: nid,
                studentid: sSend.studentid,
                kind: 'feedback_due',
                ref_id: r.requestid,
                is_read: false,
                created_at: nowStr,
              });
              notifyStudentNotification(sSend.studentid);
            }
          }
        }
      }
    }

    // 2. Auto-expire accepted requests where now > cancel_deadline
    for (const r of db.skill_request) {
      if (r.status === 'accepted') {
        const meet = db.request_meeting.find((m) => m.requestid === r.requestid);
        if (meet) {
          const cDeadline = cancelDeadline(meet.meeting_time);
          if (nowTime.getTime() > cDeadline.getTime()) {
            r.status = 'cancelled';
            expired++;

            db.request_cancellation.push({
              requestid: r.requestid,
              cancelled_by: null, // System expiry
              reason: 'EXPIRED',
              cancelled_at: nowStr,
            });

            // request_expired notification for both parties
            const sSend = db.student_sends_skill_request.find((sr) => sr.requestid === r.requestid);
            const sRecv = db.student_receives_skill_request.find((sr) => sr.requestid === r.requestid);

            if (sSend) {
              const nid = db.sequences.notification++;
              db.notification.push({
                notificationid: nid,
                studentid: sSend.studentid,
                kind: 'request_expired',
                ref_id: r.requestid,
                is_read: false,
                created_at: nowStr,
              });
              notifyStudentNotification(sSend.studentid);
            }
            if (sRecv) {
              const nid = db.sequences.notification++;
              db.notification.push({
                notificationid: nid,
                studentid: sRecv.studentid,
                kind: 'request_expired',
                ref_id: r.requestid,
                is_read: false,
                created_at: nowStr,
              });
              notifyStudentNotification(sRecv.studentid);
            }
          }
        }
      }
    }

    if (completed > 0 || expired > 0) {
      saveDb(db);
    }

    return { completed, expired };
  }

  // --- Feedback ---

  async listFeedbackDue(): Promise<RequestView[]> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    const reqIds = db.student_sends_skill_request
      .filter((sr) => sr.studentid === student.studentid)
      .map((sr) => sr.requestid);

    const completedReqs = db.skill_request.filter(
      (r) => reqIds.includes(r.requestid) && r.status === 'completed'
    );

    const dueList: RequestView[] = [];
    for (const r of completedReqs) {
      const alreadyGiven = db.student_gives_feedback.some((f) => f.requestid === r.requestid);
      if (!alreadyGiven) {
        dueList.push(this.buildRequestView(r, student.studentid));
      }
    }

    dueList.sort((a, b) => b.requestdate.localeCompare(a.requestdate));
    return dueList;
  }

  async submitFeedback(input: {
    requestid: number;
    rating: number;
    comments?: string | null;
  }): Promise<void> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    const req = db.skill_request.find((r) => r.requestid === input.requestid);
    if (!req) throw new AppError('REQUEST_NOT_FOUND');

    const sSend = db.student_sends_skill_request.find((sr) => sr.requestid === input.requestid);
    if (sSend?.studentid !== student.studentid || req.status !== 'completed') {
      throw new AppError('FEEDBACK_NOT_ALLOWED');
    }

    const rating = Math.floor(input.rating);
    if (rating < 1 || rating > 5) {
      throw new AppError('VALIDATION', 'Rating must be 1 to 5');
    }
    const comments = input.comments && input.comments.trim() !== '' ? input.comments.trim() : null;
    if (comments && comments.length > 100) {
      throw new AppError('VALIDATION', 'Comments max 100 characters');
    }

    const feedbackExists =
      db.student_gives_feedback.some((f) => f.requestid === input.requestid) ||
      db.student_receives_feedback.some((f) => f.requestid === input.requestid);
    if (feedbackExists) {
      throw new AppError('FEEDBACK_EXISTS');
    }

    const sRecv = db.student_receives_skill_request.find((sr) => sr.requestid === input.requestid);
    const providerStudentId = sRecv?.studentid ?? 0;

    // Two separate tables with two separate sequences
    const giverFeedbackId = db.sequences.student_gives_feedback++;
    const receiverFeedbackId = db.sequences.student_receives_feedback++;

    db.student_gives_feedback.push({
      feedbackid: giverFeedbackId,
      studentid: student.studentid,
      rating,
      comments,
      requestid: input.requestid,
    });

    db.student_receives_feedback.push({
      feedbackid: receiverFeedbackId,
      studentid: providerStudentId,
      rating,
      comments,
      requestid: input.requestid,
    });

    // Notify provider
    const nid = db.sequences.notification++;
    db.notification.push({
      notificationid: nid,
      studentid: providerStudentId,
      kind: 'feedback_received',
      ref_id: input.requestid,
      is_read: false,
      created_at: nowISO(),
    });

    saveDb(db);
    notifyStudentNotification(providerStudentId);
  }

  // --- Dashboards & Reports ---

  async getMyDashboard(): Promise<MyDashboard> {
    const { student } = await this.requireStudent();
    const db = this.getDb();

    const my_skill_count = db.studenthas_skill.filter((sh) => sh.studentid === student.studentid).length;

    // pending_incoming: pending requests where caller is provider
    const incomingReqIds = db.student_receives_skill_request
      .filter((sr) => sr.studentid === student.studentid)
      .map((sr) => sr.requestid);
    const pending_incoming = db.skill_request.filter(
      (r) => incomingReqIds.includes(r.requestid) && r.status === 'pending'
    ).length;

    // upcoming: confirmed requests as either role with meeting_time >= now
    const nowTime = now().getTime();
    const allMyReqIds = [
      ...incomingReqIds,
      ...db.student_sends_skill_request
        .filter((sr) => sr.studentid === student.studentid)
        .map((sr) => sr.requestid),
    ];

    const confirmedReqs = db.skill_request.filter(
      (r) => allMyReqIds.includes(r.requestid) && r.status === 'confirmed'
    );

    const upcomingList: {
      requestid: number;
      skillname: string;
      meeting_time: string;
      counterpart_name: string;
    }[] = [];

    for (const r of confirmedReqs) {
      const meet = db.request_meeting.find((m) => m.requestid === r.requestid);
      if (meet && new Date(meet.meeting_time).getTime() >= nowTime) {
        const view = this.buildRequestView(r, student.studentid);
        upcomingList.push({
          requestid: r.requestid,
          skillname: view.skillname,
          meeting_time: meet.meeting_time,
          counterpart_name: `${view.counterpart_fname} ${view.counterpart_lname}`.trim() || 'Counterpart',
        });
      }
    }

    upcomingList.sort((a, b) => a.meeting_time.localeCompare(b.meeting_time));

    // avg_rating & feedback_count as provider
    const receivedFeedbacks = db.student_receives_feedback.filter((f) => f.studentid === student.studentid);
    const feedback_count = receivedFeedbacks.length;
    let avg_rating: number | null = null;
    if (feedback_count > 0) {
      const sum = receivedFeedbacks.reduce((acc, f) => acc + f.rating, 0);
      avg_rating = Math.round((sum / feedback_count) * 10) / 10;
    }

    // feedback_due list
    const feedbackDueReqs = await this.listFeedbackDue();
    const feedback_due = feedbackDueReqs.map((r) => ({
      requestid: r.requestid,
      skillname: r.skillname,
      provider_name: `${r.counterpart_fname} ${r.counterpart_lname}`.trim() || 'Provider',
    }));

    return {
      my_skill_count,
      pending_incoming,
      upcoming: upcomingList,
      avg_rating,
      feedback_count,
      feedback_due,
    };
  }

  async runReport(n: number, dept?: string | null): Promise<ReportRows> {
    await this.getAuthenticatedUser(); // students and admins
    const db = this.getDb();

    switch (n) {
      case 1: {
        // SELECT studentid, fname, lname, dept FROM student WHERE dept = <p_dept>;
        let students = db.student;
        if (dept && dept.trim() !== '') {
          const d = dept.trim().toLowerCase();
          students = students.filter((s) => s.dept && s.dept.trim().toLowerCase() === d);
        }
        return students.map((s) => ({
          studentid: s.studentid,
          fname: s.fname,
          lname: s.lname,
          dept: s.dept,
        }));
      }

      case 2: {
        // SELECT s.skillname, c.categoryname FROM skill s JOIN category c ON s.categoryid = c.categoryid;
        return db.skill.map((sk) => {
          const cat = db.category.find((c) => c.categoryid === sk.categoryid);
          return {
            skillname: sk.skillname,
            categoryname: cat?.categoryname ?? null,
          };
        });
      }

      case 3: {
        // SELECT COUNT(*) AS total_feedback, AVG(rating) AS avg_rating FROM student_gives_feedback;
        const total_feedback = db.student_gives_feedback.length;
        let avg_rating: number | null = null;
        if (total_feedback > 0) {
          const sum = db.student_gives_feedback.reduce((acc, f) => acc + f.rating, 0);
          avg_rating = Math.round((sum / total_feedback) * 10) / 10;
        }
        return [{ total_feedback, avg_rating }];
      }

      case 4: {
        // SELECT status, COUNT(*) AS request_count FROM skill_request GROUP BY status;
        const counts: Record<string, number> = {};
        for (const r of db.skill_request) {
          counts[r.status] = (counts[r.status] ?? 0) + 1;
        }
        return Object.entries(counts).map(([status, request_count]) => ({
          status,
          request_count,
        }));
      }

      case 5: {
        // SELECT studentid, feedbackid, rating, comments FROM student_receives_feedback ORDER BY rating DESC;
        return [...db.student_receives_feedback]
          .sort((a, b) => b.rating - a.rating)
          .map((f) => ({
            studentid: f.studentid,
            feedbackid: f.feedbackid,
            rating: f.rating,
            comments: f.comments,
          }));
      }

      default:
        throw new AppError('VALIDATION', 'Report number must be 1 to 5');
    }
  }

  // --- Notifications ---

  async listNotifications(): Promise<NotificationRow[]> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    return db.notification
      .filter((n) => n.studentid === student.studentid)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 50);
  }

  async markNotificationsRead(ids: number[]): Promise<void> {
    const { student } = await this.requireStudent();
    const db = this.getDb();
    let updated = false;
    for (const n of db.notification) {
      if (n.studentid === student.studentid && ids.includes(n.notificationid)) {
        if (!n.is_read) {
          n.is_read = true;
          updated = true;
        }
      }
    }
    if (updated) {
      saveDb(db);
    }
  }

  subscribeMyNotifications(studentid: number, cb: () => void): () => void {
    if (!notificationListeners.has(studentid)) {
      notificationListeners.set(studentid, new Set());
    }
    const set = notificationListeners.get(studentid)!;
    set.add(cb);
    return () => {
      set.delete(cb);
      if (set.size === 0) {
        notificationListeners.delete(studentid);
      }
    };
  }

  subscribeAdminQueues(cb: () => void): () => void {
    adminQueueListeners.add(cb);
    return () => {
      adminQueueListeners.delete(cb);
    };
  }

  // --- Email Outbox ---

  async processEmailOutbox(requestid?: number): Promise<void> {
    const db = this.getDb();
    const queued = db.email_outbox.filter(
      (e) => e.status === 'queued' && (requestid === undefined || e.requestid === requestid)
    );

    for (const item of queued) {
      try {
        const rendered = renderEmail(item.payload);
        const recipientUser = db.app_user.find((u) => u.studentid === item.to_studentid);
        const toEmails: string[] = [];
        if (recipientUser?.email) {
          toEmails.push(recipientUser.email);
        }

        const sent: SentEmail = {
          emailid: item.emailid,
          to: toEmails,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        };
        mockOutbox.push(sent);
        console.info('[MOCK EMAIL SENT]', sent);

        item.status = 'sent';
        item.attempts += 1;
        item.sent_at = nowISO();
      } catch (err: unknown) {
        item.status = 'failed';
        item.attempts += 1;
        item.last_error = String(err);
      }
    }
    saveDb(db);
  }
}

export const mockAdapter = new MockAdapter();
