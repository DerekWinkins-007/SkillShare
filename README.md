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
| `/profile/setup` | `ProfileSetup` | `RequireStudent` (allows incomplete) | Mandatory 3-step profile onboarding |
| `/profile/edit` | `ProfileEdit` | `RequireStudent` (allows incomplete) | Edit personal details and contact numbers |
| `/profile/:studentid` | `PublicProfile` | `RequireStudent` | Public view of student skills and reviews (redacted contact info) |
| `/proposals` | `StudentProposals` | `RequireStudent` | Submit category requests and skill proposals |
| `/reports` | `Reports` | `RequireStudent` | Run system SQL reports 1 to 5 |
| `/admin` | `AdminDashboard` | `RequireAdmin` | Administrative overview and system metrics |
| `/admin/categories` | `AdminCategories` | `RequireAdmin` | Category CRUD and category request approval queue |
| `/admin/skills` | `AdminSkills` | `RequireAdmin` | Skill CRUD and skill proposal approval queue |
| `/admin/requests` | `AdminRequests` | `RequireAdmin` | Read-only audit log of all system skill requests |
| `/admin/students` | `AdminStudents` | `RequireAdmin` | Read-only directory and status of all students |

---

## 5. Feature to Database Table Mapping
 
| Feature | Tables Read | Tables Written |
|---|---|---|
| **Student Sign-Up** | `signup`, `app_user` | `student`, `signup`, `app_user` |
| **Admin Sign-Up** | `app_user` | `app_user` |
| **Student Sign-In** | `signup`, `app_user`, `student` | None (reads session / verifies regno + email via RPC) |
| **Admin Sign-In** | `app_user` | None (reads session / verifies admin role) |
| **Get Me / Auth State** | `app_user`, `student`, `signup` | None |
| **Update Profile** | `student` | `student` |
| **View Public Profile** | `student`, `studenthas_skill`, `skill`, `category`, `student_receives_feedback`, `skill_request`, `student_receives_skill_request` | None |
| **List Catalogue / Skills** | `skill`, `category`, `studenthas_skill` (via `v_skill_catalogue`) | None |
| **Manage My Skills** | `studenthas_skill`, `skill`, `category` | `studenthas_skill` |
| **Submit Category Request** | `category`, `category_request`, `student` | `category_request` |
| **Submit Skill Proposal** | `skill`, `skill_proposal`, `category`, `student` | `skill_proposal` |
| **Admin Category Management** | `category`, `skill` | `category` |
| **Admin Skill Management** | `skill`, `category`, `skill_request` | `skill`, `studenthas_skill` |
| **Review Category Request** | `category_request`, `category`, `student`, `signup` | `category_request`, `category`, `notification` |
| **Review Skill Proposal** | `skill_proposal`, `skill`, `category`, `student`, `signup` | `skill_proposal`, `skill`, `notification` |
| **Create Skill Request** | `student`, `skill`, `studenthas_skill`, `skill_request`, `student_sends_skill_request`, `student_receives_skill_request` | `skill_request`, `student_sends_skill_request`, `student_receives_skill_request`, `notification`, `email_outbox` |
| **Respond to Request (Accept/Reject)** | `skill_request`, `student_receives_skill_request`, `request_meeting` | `skill_request`, `request_meeting`, `notification`, `email_outbox` |
| **Respond to Slot (Agree/Decline)** | `skill_request`, `student_sends_skill_request`, `request_meeting` | `skill_request`, `notification`, `email_outbox` |
| **Cancel Request** | `skill_request`, `student_sends_skill_request`, `student_receives_skill_request`, `request_meeting` | `skill_request`, `request_cancellation`, `notification`, `email_outbox` |
| **Contact Reveal** | `skill_request`, `student_sends_skill_request`, `student_receives_skill_request`, `student` | None |
| **Sync Completed / Expired** | `skill_request`, `request_meeting`, `student_sends_skill_request`, `student_receives_skill_request` | `skill_request`, `request_cancellation`, `notification` |
| **Feedback Submission** | `skill_request`, `student_sends_skill_request`, `student_receives_skill_request`, `student_gives_feedback`, `student_receives_feedback` | `student_gives_feedback`, `student_receives_feedback`, `notification` |
| **Notifications** | `notification` | `notification` (mark read) |
| **Admin Oversight (Students, Requests, Stats)** | `student`, `signup`, `skill_request`, `skill`, `category`, `category_request`, `skill_proposal`, `student_gives_feedback` | None |
| **Reports (1 to 5)** | `student`, `skill`, `category`, `student_gives_feedback`, `skill_request`, `student_receives_feedback` | None |

---

## 6. Query Key Invalidation Mapping

All cache keys are generated from the typed factory in `src/lib/queryKeys.ts`.

| Mutation / Action | Target Query Keys Invalidated |
|---|---|
| `updateMyProfile` | `queryKeys.auth.me` |
| `addMySkill` | `queryKeys.catalogue.mySkills`, `['catalogue', 'skills']` |
| `removeMySkill` | `queryKeys.catalogue.mySkills`, `['catalogue', 'skills']` |
| `submitCategoryRequest` | `queryKeys.proposals.myCategoryRequests` |
| `submitSkillProposal` | `queryKeys.proposals.mySkillProposals` |
| `adminCreateCategory` | `queryKeys.catalogue.categories`, `queryKeys.admin.stats` |
| `adminUpdateCategory` | `queryKeys.catalogue.categories` |
| `adminDeleteCategory` | `queryKeys.catalogue.categories`, `queryKeys.admin.stats` |
| `adminCreateSkill` | `['catalogue', 'skills']`, `queryKeys.admin.stats` |
| `adminUpdateSkill` | `['catalogue', 'skills']` |
| `adminDeleteSkill` | `['catalogue', 'skills']`, `queryKeys.admin.stats` |
| `adminReviewCategoryRequest` | `['admin', 'categoryRequests']`, `queryKeys.catalogue.categories`, `queryKeys.admin.stats` |
| `adminReviewSkillProposal` | `['admin', 'skillProposals']`, `['catalogue', 'skills']`, `queryKeys.admin.stats` |
| `createRequest` | `queryKeys.requests.myRequests('requester')`, `queryKeys.dashboard.my` |
| `respondToRequest` | `queryKeys.requests.detail(id)`, `queryKeys.requests.myRequests('provider')`, `queryKeys.dashboard.my` |
| `respondToSlot` | `queryKeys.requests.detail(id)`, `queryKeys.requests.contact(id)`, `queryKeys.requests.myRequests('requester')`, `queryKeys.dashboard.my` |
| `cancelRequest` | `queryKeys.requests.detail(id)`, `queryKeys.requests.myRequests('requester')`, `queryKeys.requests.myRequests('provider')`, `queryKeys.dashboard.my` |
| `syncCompletedRequests` | `queryKeys.requests.myRequests('requester')`, `queryKeys.requests.myRequests('provider')`, `queryKeys.requests.feedbackDue`, `queryKeys.notifications.list`, `queryKeys.dashboard.my` |
| `submitFeedback` | `queryKeys.requests.detail(id)`, `queryKeys.requests.feedbackDue`, `queryKeys.dashboard.my`, `queryKeys.profile.public(id)` |
| `markNotificationsRead` | `queryKeys.notifications.list` |
| `signIn` / `signInAdmin` / `signOut` / `onAuthChange` | `queryKeys.auth.me`, all cache cleared on sign out |

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
