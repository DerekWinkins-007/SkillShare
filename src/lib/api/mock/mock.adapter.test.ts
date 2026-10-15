import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockAdapter, resetMockDb, getMockOutbox } from './mock.adapter';
import { resetClock, advanceClock, now } from '../../clock';
import { MOCK_ADMIN_KEYPHRASE } from './secret';

describe('mock.adapter.ts test suite', () => {
  beforeEach(() => {
    resetMockDb();
    resetClock();
  });

  afterEach(() => {
    resetMockDb();
    resetClock();
  });

  describe('Auth & Admin Keyphrase (Requirements 11 & 12)', () => {
    it('admin keyphrase: wrong, empty and whitespace-only fail; valid keyphrase succeeds', async () => {
      // Wrong keyphrase
      await expect(
        mockAdapter.signUpAdmin({
          display_name: 'Admin User',
          email: 'admin@vit.ac.in',
          password: 'Password123',
          keyphrase: 'WRONG-KEYPHRASE',
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_KEYPHRASE' }));

      // Empty keyphrase
      await expect(
        mockAdapter.signUpAdmin({
          display_name: 'Admin User',
          email: 'admin@vit.ac.in',
          password: 'Password123',
          keyphrase: '',
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_KEYPHRASE' }));

      // Whitespace only
      await expect(
        mockAdapter.signUpAdmin({
          display_name: 'Admin User',
          email: 'admin@vit.ac.in',
          password: 'Password123',
          keyphrase: '   ',
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_KEYPHRASE' }));

      // Still signed out
      expect(await mockAdapter.getMe()).toBeNull();

      // Right keyphrase succeeds
      await mockAdapter.signUpAdmin({
        display_name: 'Admin User',
        email: 'admin@vit.ac.in',
        password: 'Password123',
        keyphrase: MOCK_ADMIN_KEYPHRASE,
      });

      const me = await mockAdapter.getMe();
      expect(me).not.toBeNull();
      expect(me?.role).toBe('admin');
      expect(me?.display_name).toBe('Admin User');
    });

    it('student auth: registration number and email sign-in both work; wrong id or wrong password gives INVALID_CREDENTIALS', async () => {
      await mockAdapter.signUpStudent({
        regno: '25BCE1232',
        email: 'student1@vit.ac.in',
        password: 'Password123',
      });

      await mockAdapter.signOut();
      expect(await mockAdapter.getMe()).toBeNull();

      // Sign in with regno (case-insensitive in input) and matching email
      await mockAdapter.signIn({
        regno: '25bce1232',
        email: 'student1@vit.ac.in',
        password: 'Password123',
      });
      let me = await mockAdapter.getMe();
      expect(me?.student?.regno).toBe('25BCE1232');

      await mockAdapter.signOut();

      // Sign in with uppercase regno
      await mockAdapter.signIn({
        regno: '25BCE1232',
        email: 'student1@vit.ac.in',
        password: 'Password123',
      });
      me = await mockAdapter.getMe();
      expect(me?.login_email).toBe('student1@vit.ac.in');

      await mockAdapter.signOut();

      // Wrong password gives INVALID_CREDENTIALS
      await expect(
        mockAdapter.signIn({
          regno: '25BCE1232',
          email: 'student1@vit.ac.in',
          password: 'WrongPassword1',
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_CREDENTIALS' }));

      // Wrong regno gives INVALID_CREDENTIALS
      await expect(
        mockAdapter.signIn({
          regno: '25BCE9999',
          email: 'student1@vit.ac.in',
          password: 'Password123',
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_CREDENTIALS' }));

      // Wrong email gives INVALID_CREDENTIALS
      await expect(
        mockAdapter.signIn({
          regno: '25BCE1232',
          email: 'wrong@vit.ac.in',
          password: 'Password123',
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_CREDENTIALS' }));
    });

    it('signIn role enforcement: admin cannot sign in via student signIn; student cannot sign in via signInAdmin', async () => {
      // Create student and admin
      await mockAdapter.signUpStudent({
        regno: '25BCE5555',
        email: 'student5555@vit.ac.in',
        password: 'Password123',
      });
      await mockAdapter.signOut();

      await mockAdapter.signUpAdmin({
        display_name: 'Admin Five',
        email: 'admin5555@vit.ac.in',
        password: 'Password123',
        keyphrase: MOCK_ADMIN_KEYPHRASE,
      });
      await mockAdapter.signOut();

      // Student cannot use signInAdmin
      await expect(
        mockAdapter.signInAdmin({
          email: 'student5555@vit.ac.in',
          password: 'Password123',
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_CREDENTIALS' }));

      // Admin signs in via signInAdmin successfully
      await mockAdapter.signInAdmin({
        email: 'admin5555@vit.ac.in',
        password: 'Password123',
      });
      const meAdmin = await mockAdapter.getMe();
      expect(meAdmin?.role).toBe('admin');
      await mockAdapter.signOut();

      // Admin with wrong password on signInAdmin fails
      await expect(
        mockAdapter.signInAdmin({
          email: 'admin5555@vit.ac.in',
          password: 'WrongPassword1',
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_CREDENTIALS' }));
    });

    it('login email vs contact emails: editing email1/email2 does not alter login email or notification recipient', async () => {
      // 1. Sign up student
      await mockAdapter.signUpStudent({
        regno: '25BCE7777',
        email: 'original_login@vit.ac.in',
        password: 'Password123',
      });

      // 2. Update profile with completely different contact emails (email1, email2)
      await mockAdapter.updateMyProfile({
        fname: 'Separation',
        lname: 'Tester',
        dept: 'CSE',
        year: 3,
        phone1: '9876543210',
        phone2: null,
        email1: 'contact_only@personal.com',
        email2: 'secondary_contact@personal.com',
      });

      const me = await mockAdapter.getMe();
      expect(me?.login_email).toBe('original_login@vit.ac.in');
      expect(me?.student?.email1).toBe('contact_only@personal.com');
      expect(me?.student?.email2).toBe('secondary_contact@personal.com');

      // 3. Sign out and verify sign in STILL requires original login email
      await mockAdapter.signOut();

      // Trying to sign in with contact email must fail with INVALID_CREDENTIALS
      await expect(
        mockAdapter.signIn({
          regno: '25BCE7777',
          email: 'contact_only@personal.com',
          password: 'Password123',
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_CREDENTIALS' }));

      // Sign in with original login email succeeds
      await mockAdapter.signIn({
        regno: '25BCE7777',
        email: 'original_login@vit.ac.in',
        password: 'Password123',
      });
      expect(await mockAdapter.getMe()).not.toBeNull();

      // 4. Verify mock email outbox recipient goes to login email, NOT contact email1/email2
      // Sign up another student to create a request
      await mockAdapter.signOut();
      await mockAdapter.signUpStudent({
        regno: '25BCE8888',
        email: 'requester8888@vit.ac.in',
        password: 'Password123',
      });
      await mockAdapter.updateMyProfile({
        fname: 'Req',
        lname: 'User',
        dept: 'ECE',
        year: 2,
        phone1: '9123456780',
        phone2: null,
        email1: 'req_contact@vit.ac.in',
        email2: null,
      });

      // Create a category and skill via admin
      await mockAdapter.signOut();
      await mockAdapter.signUpAdmin({
        display_name: 'Admin Pre',
        email: 'admin_pre@vit.ac.in',
        password: 'Password123',
        keyphrase: MOCK_ADMIN_KEYPHRASE,
      });
      const cat = await mockAdapter.adminCreateCategory('Testing Cat');
      const sk = await mockAdapter.adminCreateSkill({
        name: 'Unit Testing',
        categoryid: cat.categoryid,
      });

      // Switch back to 7777, add the skill
      await mockAdapter.signOut();
      await mockAdapter.signIn({
        regno: '25BCE7777',
        email: 'original_login@vit.ac.in',
        password: 'Password123',
      });
      await mockAdapter.addMySkill(sk.skillid);

      // Requester requests session with 7777
      await mockAdapter.signOut();
      await mockAdapter.signIn({
        regno: '25BCE8888',
        email: 'requester8888@vit.ac.in',
        password: 'Password123',
      });
      const providerStudentId = me?.student?.studentid as number;
      const reqId = await mockAdapter.createRequest({
        provider_studentid: providerStudentId,
        skillid: sk.skillid,
      });

      // Process email outbox
      await mockAdapter.processEmailOutbox(reqId);
      const outbox = getMockOutbox();
      const lastEmail = outbox[outbox.length - 1];

      // Email was addressed to provider 7777
      expect(lastEmail.to).toEqual(['original_login@vit.ac.in']);
      expect(lastEmail.to).not.toContain('contact_only@personal.com');
      expect(lastEmail.to).not.toContain('secondary_contact@personal.com');
    });
  });

  describe('Admin Operations (Requirement 10)', () => {
    it('non-admin gets FORBIDDEN on admin* methods; category & skill CRUD and reviews work atomically', async () => {
      // Student tries admin method
      await mockAdapter.signUpStudent({
        regno: '25BCE1001',
        email: 'student@vit.ac.in',
        password: 'Password123',
      });

      await expect(mockAdapter.adminCreateCategory('Web Dev')).rejects.toThrowError(
        expect.objectContaining({ code: 'FORBIDDEN' })
      );
      await expect(mockAdapter.getAdminStats()).rejects.toThrowError(
        expect.objectContaining({ code: 'FORBIDDEN' })
      );

      // Sign up admin
      await mockAdapter.signOut();
      await mockAdapter.signUpAdmin({
        display_name: 'Admin',
        email: 'admin@vit.ac.in',
        password: 'Password123',
        keyphrase: MOCK_ADMIN_KEYPHRASE,
      });

      // Create Category
      const cat = await mockAdapter.adminCreateCategory('Programming');
      expect(cat.categoryid).toBe(1);
      expect(cat.categoryname).toBe('Programming');

      // Duplicate category name throws NAME_TAKEN
      await expect(mockAdapter.adminCreateCategory(' programming ')).rejects.toThrowError(
        expect.objectContaining({ code: 'NAME_TAKEN' })
      );

      // Create Skill
      const skill = await mockAdapter.adminCreateSkill({
        name: 'TypeScript',
        categoryid: cat.categoryid,
      });
      expect(skill.skillid).toBe(201);
      expect(skill.skillname).toBe('TypeScript');

      // Duplicate skill name throws NAME_TAKEN
      await expect(
        mockAdapter.adminCreateSkill({
          name: 'typescript',
          categoryid: cat.categoryid,
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'NAME_TAKEN' }));

      // Delete category with skills throws CATEGORY_IN_USE
      await expect(mockAdapter.adminDeleteCategory(cat.categoryid)).rejects.toThrowError(
        expect.objectContaining({ code: 'CATEGORY_IN_USE' })
      );
    });

    it('proposals review: duplicate name check at review time and ALREADY_REVIEWED', async () => {
      // Setup admin and category
      await mockAdapter.signUpAdmin({
        display_name: 'Admin',
        email: 'admin@vit.ac.in',
        password: 'Password123',
        keyphrase: MOCK_ADMIN_KEYPHRASE,
      });
      const cat = await mockAdapter.adminCreateCategory('Science');

      // Setup student
      await mockAdapter.signOut();
      await mockAdapter.signUpStudent({
        regno: '25BCE2001',
        email: 'student@vit.ac.in',
        password: 'Password123',
      });
      await mockAdapter.updateMyProfile({
        fname: 'Bob',
        lname: 'Jones',
        dept: 'CSE',
        year: 2,
        phone1: '9876543210',
        phone2: null,
        email1: 'student@vit.ac.in',
        email2: null,
      });

      // Submit proposal for skill 'Physics'
      const proposalId = await mockAdapter.submitSkillProposal({
        proposed_name: 'Physics',
        categoryid: cat.categoryid,
      });

      // Admin directly creates 'Physics' before reviewing proposal
      await mockAdapter.signOut();
      await mockAdapter.signInAdmin({ email: 'admin@vit.ac.in', password: 'Password123' });
      await mockAdapter.adminCreateSkill({ name: 'Physics', categoryid: cat.categoryid });

      // Now approving the proposal fails with NAME_TAKEN
      await expect(
        mockAdapter.adminReviewSkillProposal({
          skillproposalid: proposalId,
          approve: true,
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'NAME_TAKEN' }));

      // Rejecting instead succeeds
      await mockAdapter.adminReviewSkillProposal({
        skillproposalid: proposalId,
        approve: false,
        note: 'Already exists',
      });

      // Reviewing again fails with ALREADY_REVIEWED
      await expect(
        mockAdapter.adminReviewSkillProposal({
          skillproposalid: proposalId,
          approve: false,
        })
      ).rejects.toThrowError(expect.objectContaining({ code: 'ALREADY_REVIEWED' }));
    });
  });

  describe('Check order in create_request (Requirement 7)', () => {
    it('enforces check order: 1. PROFILE_INCOMPLETE, 2. SKILL_NOT_FOUND, 3. SELF_REQUEST, 4. SKILL_NOT_OFFERED, 5. DUPLICATE_ACTIVE_REQUEST', async () => {
      // 1. Create incomplete student
      await mockAdapter.signUpStudent({
        regno: '25BCE3001',
        email: 'learner@vit.ac.in',
        password: 'Password123',
      });

      // Should fail first with PROFILE_INCOMPLETE
      await expect(
        mockAdapter.createRequest({ provider_studentid: 999, skillid: 999 })
      ).rejects.toThrowError(expect.objectContaining({ code: 'PROFILE_INCOMPLETE' }));

      // Complete profile
      await mockAdapter.updateMyProfile({
        fname: 'Learner',
        lname: 'One',
        dept: 'CSE',
        year: 2,
        phone1: '9876543210',
        phone2: null,
        email1: 'learner@vit.ac.in',
        email2: null,
      });

      // 2. Skill does not exist -> SKILL_NOT_FOUND (even if provider is self)
      await expect(
        mockAdapter.createRequest({ provider_studentid: 101, skillid: 999 })
      ).rejects.toThrowError(expect.objectContaining({ code: 'SKILL_NOT_FOUND' }));

      // Create category & skill via admin
      await mockAdapter.signOut();
      await mockAdapter.signUpAdmin({
        display_name: 'Admin',
        email: 'admin@vit.ac.in',
        password: 'Password123',
        keyphrase: MOCK_ADMIN_KEYPHRASE,
      });
      const cat = await mockAdapter.adminCreateCategory('Coding');
      const skill = await mockAdapter.adminCreateSkill({ name: 'Java', categoryid: cat.categoryid });

      // Sign back in as learner (studentid 101)
      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE3001', email: 'learner@vit.ac.in', password: 'Password123' });

      // 3. Self request -> SELF_REQUEST
      await expect(
        mockAdapter.createRequest({ provider_studentid: 101, skillid: skill.skillid })
      ).rejects.toThrowError(expect.objectContaining({ code: 'SELF_REQUEST' }));

      // Create provider (studentid 102)
      await mockAdapter.signOut();
      await mockAdapter.signUpStudent({
        regno: '25BCE3002',
        email: 'teacher@vit.ac.in',
        password: 'Password123',
      });
      await mockAdapter.updateMyProfile({
        fname: 'Teacher',
        lname: 'Two',
        dept: 'ECE',
        year: 3,
        phone1: '9876543211',
        phone2: null,
        email1: 'teacher@vit.ac.in',
        email2: null,
      });

      // Provider does not offer Java yet -> SKILL_NOT_OFFERED
      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE3001', email: 'learner@vit.ac.in', password: 'Password123' });
      await expect(
        mockAdapter.createRequest({ provider_studentid: 102, skillid: skill.skillid })
      ).rejects.toThrowError(expect.objectContaining({ code: 'SKILL_NOT_OFFERED' }));

      // Provider adds skill
      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE3002', email: 'teacher@vit.ac.in', password: 'Password123' });
      await mockAdapter.addMySkill(skill.skillid);

      // Now learner can create request
      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE3001', email: 'learner@vit.ac.in', password: 'Password123' });
      const reqId = await mockAdapter.createRequest({ provider_studentid: 102, skillid: skill.skillid });
      expect(reqId).toBe(301);

      // 5. Duplicate active request -> DUPLICATE_ACTIVE_REQUEST
      await expect(
        mockAdapter.createRequest({ provider_studentid: 102, skillid: skill.skillid })
      ).rejects.toThrowError(expect.objectContaining({ code: 'DUPLICATE_ACTIVE_REQUEST' }));
    });
  });

  describe('Full Request Lifecycle, Slots, Overlaps, and Privacy (Requirements 1, 4, 5, 6, 9)', () => {
    it('handles slot proposing, agree, overlap prevention, contact privacy, cancellation, and emails', async () => {
      // Setup admin & skill
      await mockAdapter.signUpAdmin({
        display_name: 'Admin',
        email: 'admin@vit.ac.in',
        password: 'Password123',
        keyphrase: MOCK_ADMIN_KEYPHRASE,
      });
      const cat = await mockAdapter.adminCreateCategory('Math');
      const skill = await mockAdapter.adminCreateSkill({ name: 'Calculus', categoryid: cat.categoryid });

      // Setup Learner (101) & Provider (102)
      await mockAdapter.signOut();
      await mockAdapter.signUpStudent({ regno: '25BCE4001', email: 'l@vit.ac.in', password: 'Password123' });
      await mockAdapter.updateMyProfile({
        fname: 'Alice',
        lname: 'A',
        dept: 'CSE',
        year: 1,
        phone1: '9876543210',
        email1: 'l@vit.ac.in',
        phone2: null,
        email2: null,
      });

      await mockAdapter.signOut();
      await mockAdapter.signUpStudent({ regno: '25BCE4002', email: 'p@vit.ac.in', password: 'Password123' });
      await mockAdapter.updateMyProfile({
        fname: 'Bob',
        lname: 'B',
        dept: 'MEC',
        year: 4,
        phone1: '9876543211',
        phone2: '9876543299',
        email1: 'p@vit.ac.in',
        email2: 'p2@vit.ac.in',
      });
      await mockAdapter.addMySkill(skill.skillid);

      // Learner creates request
      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE4001', email: 'l@vit.ac.in', password: 'Password123' });
      const reqId = await mockAdapter.createRequest({ provider_studentid: 102, skillid: skill.skillid });

      // Privacy check: Contact details unavailable for pending
      await expect(mockAdapter.getContactDetails(reqId)).rejects.toThrowError(
        expect.objectContaining({ code: 'FORBIDDEN' })
      );

      // Provider proposes slot
      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE4002', email: 'p@vit.ac.in', password: 'Password123' });

      const slotTime = new Date(now().getTime() + 180 * 60 * 1000).toISOString(); // 3 hours in future
      await mockAdapter.respondToRequest({
        requestid: reqId,
        accept: true,
        slot: {
          meeting_time: slotTime,
          duration_minutes: 60,
          mode: 'online',
          meeting_link: 'https://meet.google.com/test-room',
          location: 'Should be ignored for online',
        },
      });

      let reqView = await mockAdapter.getRequest(reqId);
      expect(reqView.status).toBe('accepted');
      expect(reqView.location).toBeNull(); // online stores location = null
      expect(reqView.meeting_link).toBe('https://meet.google.com/test-room');

      // Contact still unavailable for accepted
      await expect(mockAdapter.getContactDetails(reqId)).rejects.toThrowError(
        expect.objectContaining({ code: 'FORBIDDEN' })
      );

      // Learner agrees to slot
      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE4001', email: 'l@vit.ac.in', password: 'Password123' });
      await mockAdapter.respondToSlot({ requestid: reqId, agree: true });

      reqView = await mockAdapter.getRequest(reqId);
      expect(reqView.status).toBe('confirmed');

      // Privacy check: Contact details NOW available for confirmed
      const contact = await mockAdapter.getContactDetails(reqId);
      expect(contact.fname).toBe('Bob');
      expect(contact.phone1).toBe('9876543211');
      expect(contact.phone2).toBe('9876543299');
      expect(contact.email1).toBe('p@vit.ac.in');

      // Non-party check: Create third student (103)
      await mockAdapter.signOut();
      await mockAdapter.signUpStudent({ regno: '25BCE4003', email: 'third@vit.ac.in', password: 'Password123' });
      await expect(mockAdapter.getContactDetails(reqId)).rejects.toThrowError(
        expect.objectContaining({ code: 'FORBIDDEN' })
      );
      await expect(mockAdapter.getRequest(reqId)).rejects.toThrowError(
        expect.objectContaining({ code: 'REQUEST_NOT_FOUND' })
      );
    });
  });

  describe('Feedback Rules (Requirement 8)', () => {
    it('feedback: only requester, only completed, only once; creates rows in both tables', async () => {
      // Setup
      await mockAdapter.signUpAdmin({
        display_name: 'Admin',
        email: 'admin@vit.ac.in',
        password: 'Password123',
        keyphrase: MOCK_ADMIN_KEYPHRASE,
      });
      const cat = await mockAdapter.adminCreateCategory('Languages');
      const skill = await mockAdapter.adminCreateSkill({ name: 'French', categoryid: cat.categoryid });

      await mockAdapter.signOut();
      await mockAdapter.signUpStudent({ regno: '25BCE5001', email: 'l5@vit.ac.in', password: 'Password123' });
      await mockAdapter.updateMyProfile({
        fname: 'Learner',
        lname: 'L',
        dept: 'CSE',
        year: 2,
        phone1: '9876543210',
        email1: 'l5@vit.ac.in',
        phone2: null,
        email2: null,
      });

      await mockAdapter.signOut();
      await mockAdapter.signUpStudent({ regno: '25BCE5002', email: 'p5@vit.ac.in', password: 'Password123' });
      await mockAdapter.updateMyProfile({
        fname: 'Teacher',
        lname: 'T',
        dept: 'ENG',
        year: 4,
        phone1: '9876543211',
        email1: 'p5@vit.ac.in',
        phone2: null,
        email2: null,
      });
      await mockAdapter.addMySkill(skill.skillid);

      // Create request and confirm it
      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE5001', email: 'l5@vit.ac.in', password: 'Password123' });
      const reqId = await mockAdapter.createRequest({ provider_studentid: 102, skillid: skill.skillid });

      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE5002', email: 'p5@vit.ac.in', password: 'Password123' });
      const slotTime = new Date(now().getTime() + 180 * 60 * 1000).toISOString();
      await mockAdapter.respondToRequest({
        requestid: reqId,
        accept: true,
        slot: { meeting_time: slotTime, duration_minutes: 30, mode: 'online', location: null, meeting_link: null },
      });

      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE5001', email: 'l5@vit.ac.in', password: 'Password123' });
      await mockAdapter.respondToSlot({ requestid: reqId, agree: true });

      // Feedback on confirmed (not completed yet) -> FEEDBACK_NOT_ALLOWED
      await expect(
        mockAdapter.submitFeedback({ requestid: reqId, rating: 5, comments: 'Great' })
      ).rejects.toThrowError(expect.objectContaining({ code: 'FEEDBACK_NOT_ALLOWED' }));

      // Advance clock past meeting end (3 hours lead + 30 mins duration + 1 min)
      advanceClock(215);
      await mockAdapter.syncCompletedRequests();

      const reqView = await mockAdapter.getRequest(reqId);
      expect(reqView.status).toBe('completed');

      // Provider tries to submit feedback -> FEEDBACK_NOT_ALLOWED
      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE5002', email: 'p5@vit.ac.in', password: 'Password123' });
      await expect(
        mockAdapter.submitFeedback({ requestid: reqId, rating: 5, comments: 'Good student' })
      ).rejects.toThrowError(expect.objectContaining({ code: 'FEEDBACK_NOT_ALLOWED' }));

      // Requester submits feedback -> succeeds
      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE5001', email: 'l5@vit.ac.in', password: 'Password123' });
      await mockAdapter.submitFeedback({ requestid: reqId, rating: 5, comments: 'Excellent tutor!' });

      // Submitting again throws FEEDBACK_EXISTS
      await expect(
        mockAdapter.submitFeedback({ requestid: reqId, rating: 4, comments: 'Again' })
      ).rejects.toThrowError(expect.objectContaining({ code: 'FEEDBACK_EXISTS' }));

      // Provider public profile reflects new rating
      const prof = await mockAdapter.getPublicProfile(102);
      expect(prof.avg_rating).toBe(5);
      expect(prof.feedback_count).toBe(1);
      expect(prof.sessions_taught).toBe(1);
    });
  });

  describe('syncCompletedRequests (Requirement 13)', () => {
    it('completes confirmed past meeting_end, expires accepted past cancel_deadline, and is idempotent', async () => {
      // Setup admin & skill
      await mockAdapter.signUpAdmin({
        display_name: 'Admin',
        email: 'admin@vit.ac.in',
        password: 'Password123',
        keyphrase: MOCK_ADMIN_KEYPHRASE,
      });
      const cat = await mockAdapter.adminCreateCategory('Music');
      const skill = await mockAdapter.adminCreateSkill({ name: 'Piano', categoryid: cat.categoryid });

      // Setup Learner (101) & Provider (102)
      await mockAdapter.signOut();
      await mockAdapter.signUpStudent({ regno: '25BCE6001', email: 'l6@vit.ac.in', password: 'Password123' });
      await mockAdapter.updateMyProfile({
        fname: 'L',
        lname: '6',
        dept: 'CSE',
        year: 1,
        phone1: '9876543210',
        email1: 'l6@vit.ac.in',
        phone2: null,
        email2: null,
      });

      await mockAdapter.signOut();
      await mockAdapter.signUpStudent({ regno: '25BCE6002', email: 'p6@vit.ac.in', password: 'Password123' });
      await mockAdapter.updateMyProfile({
        fname: 'P',
        lname: '6',
        dept: 'ECE',
        year: 2,
        phone1: '9876543211',
        email1: 'p6@vit.ac.in',
        phone2: null,
        email2: null,
      });
      await mockAdapter.addMySkill(skill.skillid);

      // 1. Create a request that will be confirmed
      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE6001', email: 'l6@vit.ac.in', password: 'Password123' });
      const reqConfirmedId = await mockAdapter.createRequest({ provider_studentid: 102, skillid: skill.skillid });

      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE6002', email: 'p6@vit.ac.in', password: 'Password123' });
      const meetingTime1 = new Date(now().getTime() + 150 * 60 * 1000).toISOString(); // 2.5 hours in future
      await mockAdapter.respondToRequest({
        requestid: reqConfirmedId,
        accept: true,
        slot: { meeting_time: meetingTime1, duration_minutes: 30, mode: 'online', location: null, meeting_link: null },
      });

      await mockAdapter.signOut();
      await mockAdapter.signIn({ regno: '25BCE6001', email: 'l6@vit.ac.in', password: 'Password123' });
      await mockAdapter.respondToSlot({ requestid: reqConfirmedId, agree: true });

      // Advance clock by 190 minutes: meeting ended at 150 + 30 = 180 min
      advanceClock(190);
      const res = await mockAdapter.syncCompletedRequests();
      expect(res.completed).toBe(1);

      const reqView = await mockAdapter.getRequest(reqConfirmedId);
      expect(reqView.status).toBe('completed');

      // Idempotent: running again changes nothing
      const res2 = await mockAdapter.syncCompletedRequests();
      expect(res2.completed).toBe(0);
      expect(res2.expired).toBe(0);
    });
  });
});
