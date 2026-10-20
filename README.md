# SkillShare

SkillShare is a student skill-sharing portal built for Database Systems (BACSE202). It provides the core application logic, data layer, state management, validation, routing, and authentication using plain, semantic HTML markup ready for a subsequent design phase.

---

## 1. Project Setup and Commands

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Type Checking & Linting
```bash
npm run typecheck
npm run lint
```

### Production Build
```bash
npm run build
```

---

## 2. Environment Variables & Switching Modes

Environment variables are validated with Zod at start-up (`src/lib/env.ts`).

| Variable | Type | Allowed Values / Format | Description |
|---|---|---|---|
| `VITE_DATA_MODE` | String | `mock` \| `supabase` | Required. Selects the active adapter layer. |
| `VITE_SUPABASE_URL` | String | URL (`https://...`) | Required only when `VITE_DATA_MODE=supabase`. |
| `VITE_SUPABASE_ANON_KEY` | String | JWT/API Key | Required only when `VITE_DATA_MODE=supabase`. |

### How to Switch Modes
1. Edit the `.env` file in the project root:
   - For **Mock Mode**:
     ```env
     VITE_DATA_MODE=mock
     ```
   - For **Supabase Mode**:
     ```env
     VITE_DATA_MODE=supabase
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```
2. Restart the Vite development server (`npm run dev`).

---

## 3. Folder Map

```
SkillShare/
├── index.html                   # Semantic HTML entry point
├── package.json                 # Dependencies and npm scripts
├── tsconfig.json                # TypeScript compiler configuration (strict)
├── vite.config.ts               # Vite configuration with @ and shared aliases
├── vitest.config.ts             # Vitest test runner configuration
├── .eslintrc.cjs                # ESLint configuration with restricted imports rules
├── .env.example                 # Environment variable template
├── .env                         # Local environment variables
├── shared/
│   ├── emailTemplates.ts        # Pure, zero-dependency email templates
│   └── emailTemplates.test.ts   # Unit tests for email templates
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Router, query client, routes, and layout setup
│   ├── vite-env.d.ts            # Vite client types
│   ├── components/
│   │   ├── Guards.tsx           # Route guards (SignedOutOnly, RequireStudent, RequireAdmin)
│   │   └── Layout.tsx           # Semantic nav, notifications modal, feedback dialog
│   ├── hooks/
│   │   ├── useFeedbackPrompt.ts # Prompt for due feedback
│   │   ├── useProfileSetup.ts   # 3-step student profile onboarding
│   │   ├── useRealtimeSubscriptions.ts # Subscriptions for notifications & admin queues
│   │   └── useSyncScheduler.ts  # Auto-completion and auto-expiry scheduler
│   ├── lib/
│   │   ├── clock.ts             # Global clock and mock time-travel helper
│   │   ├── env.ts               # Zod-validated environment config
│   │   ├── notifications.ts     # Client description renderer for notification rows
│   │   ├── queryKeys.ts         # Centralised TanStack Query key factory
│   │   ├── reports.ts           # Static SQL definitions for system reports
│   │   ├── rules.ts             # Pure business rules, boundaries, and transition table
│   │   ├── rules.test.ts        # Vitest suite for pure rules
│   │   ├── supabaseClient.ts    # Supabase JS client instantiation
│   │   ├── types.ts             # Database shapes, AppError, ErrorCode, and interfaces
│   │   ├── api/
│   │   │   ├── api.interface.ts # SkillShareAPI interface definition
│   │   │   ├── index.ts         # Adapter selector (mock vs. supabase)
│   │   │   ├── supabase.adapter.ts      # Supabase implementation of SkillShareAPI
│   │   │   ├── supabase.adapter.test.ts # Mock tests for RPC calls, params, error mapping
│   │   │   └── mock/
│   │   │       ├── secret.ts            # Mock admin keyphrase & constant-time compare
│   │   │       ├── mock.adapter.ts      # LocalStorage in-memory database adapter
│   │   │       └── mock.adapter.test.ts # Full test suite for mock data lifecycle
│   │   └── auth/
│   │       ├── context.ts       # React AuthContext definition
│   │       ├── AuthContext.tsx  # AuthProvider component
│   │       ├── useAuth.ts       # useAuth hook
│   │       └── index.ts         # Module re-exports
│   ├── pages/
│   │   ├── Login.tsx            # Student login form (regno, email, password)
│   │   ├── AdminLogin.tsx       # Administrator login form (email, password)
│   │   ├── StudentSignup.tsx    # Student registration
│   │   ├── AdminSignup.tsx      # Admin registration with keyphrase gate (links to /admin/login)
│   │   ├── ProfileSetup.tsx     # Mandatory 3-step profile setup
│   │   ├── ProfileEdit.tsx      # Profile editing
│   │   ├── PublicProfile.tsx    # Public profile and reviews (no contact leaks)
│   │   ├── StudentDashboard.tsx # Student dashboard metrics and upcoming sessions
│   │   ├── Catalogue.tsx        # Skill catalogue, filters, and teaching skill manager
│   │   ├── SkillDetail.tsx      # Skill provider list and request session action
│   │   ├── RequestsList.tsx     # Received and Sent requests with status tabs
│   │   ├── RequestDetail.tsx    # Request actions, slot proposal, cancellation, contact reveal
│   │   ├── StudentProposals.tsx # Category requests and skill proposals
│   │   ├── Reports.tsx          # SQL system reports runner
│   │   └── admin/
│   │       ├── AdminDashboard.tsx   # Admin metrics and aggregates
│   │       ├── AdminCategories.tsx  # Category CRUD and category request queue
│   │       ├── AdminSkills.tsx      # Skill CRUD and skill proposal queue
│   │       ├── AdminRequests.tsx    # Read-only skill requests oversight
│   │       └── AdminStudents.tsx    # Read-only student roster oversight
│   └── test/
│       └── setup.ts             # Vitest DOM setup
└── README.md
```

---

## 4. Application Routes

| Path | Component | Guard / Access | Description |
|---|---|---|---|
| `/login` | `Login` | Signed-out only | Student sign in (regno, email, password) |
| `/signup` | `StudentSignup` | Signed-out only | Student account registration |
| `/admin/login` | `AdminLogin` | Signed-out only | Administrator sign in (email, password) |
| `/admin/signup` | `AdminSignup` | Signed-out only | Administrator registration with secret keyphrase |
| `/dashboard` | `StudentDashboard` | `RequireStudent` | Student overview, upcoming sessions, quick stats |
| `/catalogue` | `Catalogue` | `RequireStudent` | Browse skills, filter by category/search, manage offered skills |
| `/skills/:skillid` | `SkillDetail` | `RequireStudent` | View skill details, instructors list, and request session |
| `/requests` | `RequestsList` | `RequireStudent` | Received and Sent skill requests with status tabs |
| `/requests/:requestid` | `RequestDetail` | `RequireStudent` | Request lifecycle actions (accept, propose slot, cancel, contact reveal) |
| `/students/:studentid` | `PublicProfile` | `RequireStudent` | Public view of student skills and reviews (contact details strictly hidden) |
| `/profile/setup` | `ProfileSetup` | `RequireStudent` (allows incomplete) | Mandatory 3-step profile onboarding |
| `/profile/edit` | `ProfileEdit` | `RequireStudent` (allows incomplete) | Edit personal details and contact numbers |
| `/proposals` | `StudentProposals` | `RequireStudent` | Submit category requests and skill proposals |
| `/reports` | `Reports` | `RequireAnyAuth` | Run system SQL reports 1 to 5 (stacked cards for student & admin) |
| `/admin` | `AdminDashboard` | `RequireAdmin` | Administrative overview and system metrics |
| `/admin/categories` | `AdminCategories` | `RequireAdmin` | Category CRUD and category request approval queue |
| `/admin/skills` | `AdminSkills` | `RequireAdmin` | Skill CRUD and skill proposal approval queue |
| `/admin/requests` | `AdminRequests` | `RequireAdmin` | Read-only audit log of all system skill requests |
| `/admin/students` | `AdminStudents` | `RequireAdmin` | Read-only directory and status of all students |

---

## 5. Email Architecture & Dispatch Mechanics

- **Login Email vs Contact Details**: The login email (`auth.users.email`) is the **only** email address that receives notifications and session emails. The fields `student.email1` and `student.email2` are contact details shared with counterpart students only after a session is confirmed. They are never used to log in or to deliver system emails.
- **Outbox Pattern**: PostgreSQL transactions writing workflow mutations (`create_request`, `respond_to_request`, `respond_to_slot`, `cancel_request`) insert pre-built notification payloads into `public.email_outbox` with status `queued` and attempts `0`.
- **Atomic Processing**: The Edge Function `process-email-outbox` atomically claims batches using `public.claim_outbox_emails(p_batch_size, p_requestid)` with `FOR UPDATE SKIP LOCKED`.
- **Resend Dispatch**: Dispatched via Resend API using secrets configured in Supabase:
  ```bash
  npx supabase secrets set RESEND_API_KEY="re_..." MAIL_FROM="SkillShare <onboarding@resend.dev>"
  npx supabase functions deploy process-email-outbox
  ```

---

## 6. Architecture for the Report

### The Ten Original Tables
1. `student`: Core student entity (`studentid`, `fname`, `lname`, `dept`, `year`, `phone1`, `phone2`, `email1`, `email2`, `profile_complete`).
2. `category`: Grouping for skills (`categoryid`, `categoryname`).
3. `skill`: Skills offered in catalogue (`skillid`, `skillname`, `categoryid`).
4. `studenthas_skill`: Associative table linking students who can teach a skill (`studentid`, `skillid`).
5. `skill_request`: Skill request lifecycle records (`requestid`, `requestdate`, `status`, `skillid`).
6. `student_sends_skill_request`: Associative table identifying the learner (`studentid`, `requestid`).
7. `student_receives_skill_request`: Associative table identifying the teacher (`studentid`, `requestid`).
8. `student_gives_feedback`: Feedback rating and comments submitted by learner (`feedbackid`, `requestid`, `studentid`, `rating`, `comments`, `given_at`).
9. `student_receives_feedback`: Counterpart feedback link for the teacher (`feedbackid`, `requestid`, `studentid`).
10. `signup`: Legacy registration identity linking student to username (`studentid`, `username`, `password_hash`).

### The Seven Supplementary Tables (Why Each Exists)
1. `app_user`: Bridges Supabase Auth (`auth_id` UUID) with application domain roles (`role`: 'student' | 'admin') and links to `student.studentid`.
2. `request_meeting`: Isolates scheduling details (`meeting_time`, `duration_minutes`, `mode`, `location`, `meeting_link`, `proposed_at`) from the core request state machine, allowing clean slot proposals and conflict detection without overloading `skill_request`.
3. `request_cancellation`: Records cancellation audit trails (`cancelled_by`, `reason`, `cancelled_at`) for both accepted and confirmed requests.
4. `category_request`: Student self-service queue for requesting new categories (`proposed_name`, `status`, `reviewed_by`, `reviewed_at`, `admin_notes`).
5. `skill_proposal`: Student self-service queue for proposing new skills within an existing category (`proposed_name`, `categoryid`, `status`, `reviewed_by`, `reviewed_at`, `admin_notes`).
6. `notification`: In-app notification queue (`studentid`, `kind`, `ref_id`, `is_read`, `created_at`) supporting real-time alerts.
7. `email_outbox`: Transactional outbox table (`requestid`, `kind`, `to_studentid`, `payload`, `status`, `attempts`, `last_error`, `created_at`, `sent_at`) decoupling database state transitions from external HTTP email delivery.

### Status Lifecycle State Machine
```
[pending] ──(Provider accepts + proposes slot)──> [accepted]
[pending] ──(Provider rejects)──────────────────> [rejected]
[pending] ──(Requester cancels)─────────────────> [cancelled]
[accepted] ──(Requester agrees)─────────────────> [confirmed]
[accepted] ──(Requester declines)───────────────> [rejected]
[accepted] ──(Either party cancels >= 1h)───────> [cancelled]
[accepted] ──(Cancel deadline expires)──────────> [cancelled] (auto-sync)
[confirmed] ──(Either party cancels >= 1h)──────> [cancelled]
[confirmed] ──(Meeting ends)────────────────────> [completed] (auto-sync)
[completed] ──(Requester submits feedback)──────> Feedback recorded
```

### RLS and RPC Security Model
- **Row Level Security (RLS)** is enabled on all 17 tables and views. Direct table access is restricted to authenticated users.
- Sensitive tables (`email_outbox`, `request_cancellation`, `signup`, `app_user`) have zero direct public write grants.
- All domain operations are encapsulated behind PostgreSQL functions marked `SECURITY DEFINER` with fixed `search_path = public, pg_temp`.
- Caller identity is securely derived from `auth.uid()` via helper function `public.my_studentid()`. Students cannot impersonate peers, access another student's contact details outside confirmed sessions, or bypass transition constraints.

### Why Credentials Live in Supabase Auth instead of signup.password
- `signup.password` (or `signup.password_hash`) in the original schema is insecure and unsuited for modern web authentication (lacking salt, secure hashing like bcrypt/argon2, session token issuance, CSRF protection, and refresh rotation).
- Delegating identity and password verification to Supabase Auth (`auth.users`) provides industry-standard JWT sessions, secure token storage, brute-force throttling, and email confirmation flows.
- `signup` is maintained purely for relational fidelity to the academic course specification, recording registration numbers alongside `student` records.

---

## 7. ASSUMPTIONS

As required by Section 0 ("Never guess: if something is not specified, implement the most restrictive reasonable behaviour and list it under ASSUMPTIONS in the README"):

1. **Admin Creation & Keyphrase Security**: In Supabase mode, the secret admin keyphrase is never exposed to the client bundle and is verified via the `admin-signup` Edge Function. In Mock mode, it is verified via a constant-time comparison against `MOCK_ADMIN_KEYPHRASE`.
2. **Registration Number Case**: Registration numbers are strictly formatted as `^[0-9]{2}[A-Z]{3}[0-9]{4}$` (e.g. `25BCE1232`). Sign-in inputs accept case-insensitive inputs and normalize them to uppercase before resolving.
3. **Session Conflict Detection**: A session conflict (`SLOT_CONFLICT`) occurs when any confirmed session overlaps the proposed half-open interval `[meeting_time, meeting_time + duration)`. Back-to-back meetings (where one session ends at the exact minute the next begins) are explicitly allowed and not flagged as conflicts.
4. **Cancellation Window Boundary**: As specified, the cancellation cutoff is `meeting_time - 60 minutes`. The check is inclusive: exactly 60 minutes before start is permitted; 1 millisecond past the deadline throws `CANCEL_WINDOW_CLOSED`.
5. **Contact Details Reveal**: Contact fields (`phone1`, `phone2`, `email1`, `email2`) are strictly forbidden to other students unless the caller is a party to a session that is in `confirmed` or `completed` status.
6. **Report 1 Department Filter**: If the department parameter `p_dept` is null or empty, all students are returned; when supplied, comparison is case-insensitive.
7. **Default Route**: Non-authenticated visitors accessing the root `/` or any unknown route are redirected to `/login`, which automatically routes authenticated users to `/admin` or `/dashboard` based on their role.
8. **Feedback Prompt Dismissal**: Dismissed feedback prompts remain suppressed in the current browser session's in-memory state and re-surface upon next login or page reload while feedback remains due.
9. **Login Email vs Contact Emails**: The login email is stored in `auth.users.email` and is the only address used to sign in and receive SkillShare notifications and meeting emails. In contrast, `student.email1` and `student.email2` are contact emails disclosed only after a session is confirmed. Modifying contact emails in student profile setup/edit never affects authentication credentials or notification delivery destinations.

