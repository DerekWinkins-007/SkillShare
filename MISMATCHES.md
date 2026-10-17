# SkillShare Backend Implementation & Parity Notes

This document records the exact contract alignments and design decisions between the Supabase SQL backend, Edge Functions, and the existing `src/lib/api/supabase.adapter.ts`.

---

## 1. Schema & Data Types Parity

1. **Integer Identifiers**:
   - As mandated by sections 2 and 3 of the prompt, all table IDs (`categoryid`, `studentid`, `skillid`, `requestid`, `feedbackid`, `catrequestid`, `skillproposalid`, `notificationid`, `emailid`) are standard `integer` types generated via `GENERATED ALWAYS AS IDENTITY` with the prescribed start offsets (e.g. `student` starts at 101, `skill` at 201, `skill_request` at 301, `student_gives_feedback` at 401, `student_receives_feedback` at 501).
   - All RPC parameter inputs accepting IDs are typed as `integer`.

2. **No PostgreSQL ENUM Types**:
   - Status, mode, and role vocabularies are NOT implemented as custom Postgres `ENUM` types.
   - For supplementary tables (`app_user`, `request_meeting`, `category_request`, `skill_proposal`, `email_outbox`), valid sets are enforced via table `CHECK` constraints.
   - For the ten original tables (`skill_request`, `student_gives_feedback`, `student_receives_feedback`), constraints are enforced using `BEFORE INSERT OR UPDATE` triggers to adhere strictly to the original specification.

3. **String Sizes & Constraints**:
   - Strict `varchar(n)` limits match the submitted schema report (e.g., `varchar(20)` for `fname`/`lname`, `varchar(30)` for `categoryname`/`skillname`/`dept`/`username`, `varchar(15)` for phones, `varchar(50)` for emails, `varchar(100)` for feedback comments, `varchar(150)` for offline locations, `varchar(200)` for reasons and meeting links).

---

## 2. Authentication & Student Registration Model

1. **Student Registration**:
   - Trigger `on_auth_user_created` fires on `auth.users` insert.
   - It validates `raw_user_meta_data->>'regno'` against `^[0-9]{2}[A-Z]{3}[0-9]{4}$`.
   - Populates `public.student`, `public.signup (studentid, username)`, and `public.app_user (auth_id, role='student', studentid)`.
   - If registration number is duplicate, raises `REGNO_TAKEN`.

2. **Admin Registration**:
   - Managed via the `admin-signup` Edge Function.
   - Verifies the secret keyphrase securely on the server side using constant-time comparison against `ADMIN_KEYPHRASE`.
   - Creates the Supabase Auth user via admin API with `email_confirm: true`.
   - Inserts `public.app_user (auth_id, role='admin', display_name, studentid=NULL)`.

3. **Login Resolution (`resolve_login_identifier`) & Email Roles**:
   - **Login Email** = `auth.users.email`. This is the single address used for authentication and the ONLY destination address SkillShare sends notifications and meeting emails to.
   - **Contact Emails** = `student.email1` and `student.email2`. These are strictly counterpart contact details revealed upon session confirmation (`get_contact_details` and confirmation email body). SkillShare never sends automated emails to them.
   - Editing `email1` or `email2` via `update_my_profile` never alters the login email or notification recipient.
   - `resolve_login_identifier(p_regno)` strictly returns `auth.users.email` by joining `signup` -> `app_user` -> `auth.users`, never falling back to `student.email1`.
   - `get_me()` returns `login_email` directly from `auth.users.email`.

4. **Email Outbox & Resend Dispatch (`process-email-outbox`)**:
   - Outbox processing consumes rows from `public.email_outbox` via atomic `claim_outbox_emails` RPC using `FOR UPDATE SKIP LOCKED`.
   - Email templates are canonicalized in `shared/emailTemplates.ts` and mirrored to `supabase/functions/_shared/emailTemplates.ts`.
   - The recipient address is strictly resolved from `to_studentid` -> `app_user.auth_id` -> `auth.admin.getUserById(auth_id)` -> `user.email`. Never uses `student.email1` or `email2` for sending.
   - Emails are dispatched via Resend REST API (`https://api.resend.com/emails`) with Bearer token authentication from `RESEND_API_KEY` and sender address from `MAIL_FROM`.

---

## 3. Error Code Mappings

All RPC exceptions use `RAISE EXCEPTION '<ERROR_CODE>' USING DETAIL = '...'`. The adapter catches these messages directly and maps them to typed `AppError` instances:
- `NOT_AUTHENTICATED`: Caller is not logged in.
- `FORBIDDEN`: Role violation (e.g. student calling admin RPC, non-participant accessing session).
- `VALIDATION`: Input length, format, or range violations.
- `INVALID_REGNO`: Registration number regex mismatch.
- `REGNO_TAKEN`: Registration number already registered in `signup`.
- `EMAIL_TAKEN`: Email already registered in `auth.users`.
- `INVALID_KEYPHRASE`: Admin keyphrase mismatch during admin sign-up.
- `PROFILE_INCOMPLETE`: Student attempting action requiring complete profile.
- `NAME_TAKEN`: Duplicate category or skill name.
- `CATEGORY_NOT_FOUND`: Category ID does not exist.
- `SKILL_NOT_FOUND`: Skill ID does not exist.
- `CATEGORY_IN_USE`: Cannot delete category while skills belong to it.
- `SKILL_IN_USE`: Cannot delete skill while offered by students or attached to requests.
- `SELF_REQUEST`: Student requesting session with themselves.
- `SKILL_NOT_OFFERED`: Target student does not teach the requested skill.
- `DUPLICATE_ACTIVE_REQUEST`: Active pending/accepted/confirmed session already exists between pair for skill.
- `REQUEST_NOT_FOUND`: Request ID does not exist.
- `INVALID_TRANSITION`: State machine transition violation.
- `SLOT_TOO_SOON`: Proposed meeting time less than 120 minutes in future.
- `LOCATION_REQUIRED`: Offline mode specified without valid location string.
- `SLOT_CONFLICT`: Meeting interval `[start, start + duration)` overlaps an existing confirmed meeting for either party.
- `CANCEL_WINDOW_CLOSED`: Cancellation attempted within 60 minutes of meeting start time.
- `FEEDBACK_NOT_ALLOWED`: Feedback submitted by non-requester or on uncompleted session.
- `FEEDBACK_EXISTS`: Feedback already submitted for request.
- `ALREADY_REVIEWED`: Proposal already approved or rejected.

---

## 4. Email Dispatch Architecture

- When state mutations occur (`create_request`, `respond_to_request`, `respond_to_slot`, `cancel_request`), rows are inserted into `public.email_outbox` with pre-formed JSON payloads.
- The client triggers `process-email-outbox` Edge Function fire-and-forget.
- The Edge Function renders the subject and body using identical HTML/text formatting as `shared/emailTemplates.ts`.
