-- 0001_enums_tables.sql
-- SkillShare: The Ten Original Tables + Seven Supplementary Tables
-- Exact PostgreSQL types, integers for IDs, varchar(n) constraints, and triggers for original tables

-- 1. Original Table: category
CREATE TABLE IF NOT EXISTS public.category (
    categoryid integer GENERATED ALWAYS AS IDENTITY (START WITH 1) PRIMARY KEY,
    categoryname varchar(30) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_name_lower ON public.category (lower(categoryname));

-- 2. Original Table: student
CREATE TABLE IF NOT EXISTS public.student (
    studentid integer GENERATED ALWAYS AS IDENTITY (START WITH 101) PRIMARY KEY,
    phone1 varchar(15),
    phone2 varchar(15),
    email1 varchar(50),
    email2 varchar(50),
    fname varchar(20),
    lname varchar(20),
    year integer,
    dept varchar(30)
);

-- 3. Original Table: skill
CREATE TABLE IF NOT EXISTS public.skill (
    skillid integer GENERATED ALWAYS AS IDENTITY (START WITH 201) PRIMARY KEY,
    skillname varchar(30) NOT NULL,
    categoryid integer NOT NULL REFERENCES public.category(categoryid) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_name_cat_lower ON public.skill (categoryid, lower(skillname));

-- 4. Original Table: studenthas_skill
CREATE TABLE IF NOT EXISTS public.studenthas_skill (
    studentid integer NOT NULL REFERENCES public.student(studentid) ON DELETE CASCADE,
    skillid integer NOT NULL REFERENCES public.skill(skillid) ON DELETE RESTRICT,
    PRIMARY KEY (studentid, skillid)
);

-- 5. Original Table: skill_request
CREATE TABLE IF NOT EXISTS public.skill_request (
    requestid integer GENERATED ALWAYS AS IDENTITY (START WITH 301) PRIMARY KEY,
    requestdate timestamptz NOT NULL DEFAULT now(),
    status varchar(20) NOT NULL,
    skillid integer NOT NULL REFERENCES public.skill(skillid) ON DELETE RESTRICT
);

-- Triggers for original table: skill_request status validation
CREATE OR REPLACE FUNCTION public.check_skill_request_status()
RETURNS trigger AS $$
BEGIN
    IF NEW.status NOT IN ('pending', 'accepted', 'confirmed', 'rejected', 'cancelled', 'completed') THEN
        RAISE EXCEPTION 'INVALID_TRANSITION' USING DETAIL = 'Invalid skill_request status';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_skill_request_status ON public.skill_request;
CREATE TRIGGER trg_check_skill_request_status
BEFORE INSERT OR UPDATE ON public.skill_request
FOR EACH ROW
EXECUTE FUNCTION public.check_skill_request_status();

-- 6. Original Table: student_sends_skill_request (Requester)
CREATE TABLE IF NOT EXISTS public.student_sends_skill_request (
    studentid integer NOT NULL REFERENCES public.student(studentid) ON DELETE CASCADE,
    requestid integer NOT NULL REFERENCES public.skill_request(requestid) ON DELETE CASCADE,
    PRIMARY KEY (studentid, requestid)
);

-- 7. Original Table: student_receives_skill_request (Provider)
CREATE TABLE IF NOT EXISTS public.student_receives_skill_request (
    studentid integer NOT NULL REFERENCES public.student(studentid) ON DELETE CASCADE,
    requestid integer NOT NULL REFERENCES public.skill_request(requestid) ON DELETE CASCADE,
    PRIMARY KEY (studentid, requestid)
);

-- 8. Original Table: student_gives_feedback (Requester -> Feedback)
CREATE TABLE IF NOT EXISTS public.student_gives_feedback (
    feedbackid integer GENERATED ALWAYS AS IDENTITY (START WITH 401) PRIMARY KEY,
    studentid integer NOT NULL REFERENCES public.student(studentid) ON DELETE CASCADE,
    comments varchar(100),
    rating integer NOT NULL,
    requestid integer NOT NULL REFERENCES public.skill_request(requestid) ON DELETE CASCADE
);

-- 9. Original Table: student_receives_feedback (Provider <- Feedback)
CREATE TABLE IF NOT EXISTS public.student_receives_feedback (
    feedbackid integer GENERATED ALWAYS AS IDENTITY (START WITH 501) PRIMARY KEY,
    studentid integer NOT NULL REFERENCES public.student(studentid) ON DELETE CASCADE,
    comments varchar(100),
    rating integer NOT NULL,
    requestid integer NOT NULL REFERENCES public.skill_request(requestid) ON DELETE CASCADE
);

-- Trigger for feedback rating check (1 to 5)
CREATE OR REPLACE FUNCTION public.check_feedback_rating()
RETURNS trigger AS $$
BEGIN
    IF NEW.rating IS NULL OR NEW.rating < 1 OR NEW.rating > 5 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Feedback rating must be between 1 and 5';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_gives_feedback_rating ON public.student_gives_feedback;
CREATE TRIGGER trg_check_gives_feedback_rating
BEFORE INSERT OR UPDATE ON public.student_gives_feedback
FOR EACH ROW
EXECUTE FUNCTION public.check_feedback_rating();

DROP TRIGGER IF EXISTS trg_check_receives_feedback_rating ON public.student_receives_feedback;
CREATE TRIGGER trg_check_receives_feedback_rating
BEFORE INSERT OR UPDATE ON public.student_receives_feedback
FOR EACH ROW
EXECUTE FUNCTION public.check_feedback_rating();

-- 10. Original Table: signup (Username = regno, credentials owned by Supabase Auth)
CREATE TABLE IF NOT EXISTS public.signup (
    studentid integer NOT NULL REFERENCES public.student(studentid) ON DELETE CASCADE,
    username varchar(30) NOT NULL,
    salt varchar(32),
    password varchar(128),
    PRIMARY KEY (studentid, username)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_signup_username_upper ON public.signup (upper(username));

-- 11. Supplementary Table: app_user
CREATE TABLE IF NOT EXISTS public.app_user (
    auth_id uuid PRIMARY KEY,
    role varchar(10) NOT NULL CHECK (role IN ('student', 'admin')),
    studentid integer UNIQUE REFERENCES public.student(studentid) ON DELETE CASCADE,
    display_name varchar(60),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Supplementary Table: request_meeting
CREATE TABLE IF NOT EXISTS public.request_meeting (
    requestid integer PRIMARY KEY REFERENCES public.skill_request(requestid) ON DELETE CASCADE,
    meeting_time timestamptz NOT NULL,
    duration_minutes integer NOT NULL CHECK (duration_minutes IN (30, 45, 60, 90)),
    mode varchar(10) NOT NULL CHECK (mode IN ('online', 'offline')),
    location varchar(150),
    meeting_link varchar(200),
    proposed_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_request_meeting_mode_location CHECK (
        mode = 'online' OR (mode = 'offline' AND location IS NOT NULL AND length(trim(location)) > 0)
    )
);

-- 13. Supplementary Table: request_cancellation
CREATE TABLE IF NOT EXISTS public.request_cancellation (
    requestid integer PRIMARY KEY REFERENCES public.skill_request(requestid) ON DELETE CASCADE,
    cancelled_by integer REFERENCES public.student(studentid) ON DELETE SET NULL,
    reason varchar(200) NOT NULL,
    cancelled_at timestamptz NOT NULL DEFAULT now()
);

-- 14. Supplementary Table: category_request
CREATE TABLE IF NOT EXISTS public.category_request (
    catrequestid integer GENERATED ALWAYS AS IDENTITY (START WITH 1) PRIMARY KEY,
    studentid integer NOT NULL REFERENCES public.student(studentid) ON DELETE CASCADE,
    proposed_name varchar(30) NOT NULL,
    reason varchar(200),
    status varchar(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    reviewed_by uuid,
    reviewed_at timestamptz,
    review_note varchar(200)
);

-- 15. Supplementary Table: skill_proposal
CREATE TABLE IF NOT EXISTS public.skill_proposal (
    skillproposalid integer GENERATED ALWAYS AS IDENTITY (START WITH 1) PRIMARY KEY,
    studentid integer NOT NULL REFERENCES public.student(studentid) ON DELETE CASCADE,
    proposed_name varchar(30) NOT NULL,
    categoryid integer NOT NULL REFERENCES public.category(categoryid) ON DELETE RESTRICT,
    reason varchar(200),
    status varchar(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    reviewed_by uuid,
    reviewed_at timestamptz,
    review_note varchar(200)
);

-- 16. Supplementary Table: notification
CREATE TABLE IF NOT EXISTS public.notification (
    notificationid integer GENERATED ALWAYS AS IDENTITY (START WITH 1) PRIMARY KEY,
    studentid integer NOT NULL REFERENCES public.student(studentid) ON DELETE CASCADE,
    kind varchar(40) NOT NULL,
    ref_id integer,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_student_read ON public.notification (studentid, is_read, created_at DESC);

-- 17. Supplementary Table: email_outbox
CREATE TABLE IF NOT EXISTS public.email_outbox (
    emailid integer GENERATED ALWAYS AS IDENTITY (START WITH 1) PRIMARY KEY,
    requestid integer REFERENCES public.skill_request(requestid) ON DELETE SET NULL,
    kind varchar(40) NOT NULL,
    to_studentid integer NOT NULL REFERENCES public.student(studentid) ON DELETE CASCADE,
    payload jsonb NOT NULL,
    status varchar(10) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
    attempts integer NOT NULL DEFAULT 0,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_email_outbox_queued ON public.email_outbox (status, requestid);
