-- 0002_views_rls.sql
-- SkillShare: Views, Helper Functions, and Row Level Security (RLS)

-- Helper: Compute if student profile is complete
CREATE OR REPLACE FUNCTION public.is_profile_complete(p_studentid integer)
RETURNS boolean AS $$
DECLARE
    v_st public.student%ROWTYPE;
BEGIN
    SELECT * INTO v_st FROM public.student WHERE studentid = p_studentid;
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    RETURN (
        v_st.fname IS NOT NULL AND length(trim(v_st.fname)) > 0 AND
        v_st.lname IS NOT NULL AND length(trim(v_st.lname)) > 0 AND
        v_st.dept IS NOT NULL AND length(trim(v_st.dept)) > 0 AND
        v_st.year IS NOT NULL AND
        v_st.phone1 IS NOT NULL AND length(trim(v_st.phone1)) > 0 AND
        v_st.email1 IS NOT NULL AND length(trim(v_st.email1)) > 0
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper: Get current student ID from Supabase auth.uid()
CREATE OR REPLACE FUNCTION public.my_studentid()
RETURNS integer AS $$
DECLARE
    v_id integer;
BEGIN
    SELECT studentid INTO v_id FROM public.app_user WHERE auth_id = auth.uid();
    RETURN v_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper: Get current app_user role ('student' or 'admin')
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS varchar AS $$
DECLARE
    v_role varchar(10);
BEGIN
    SELECT role INTO v_role FROM public.app_user WHERE auth_id = auth.uid();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper: Is caller an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN (public.my_role() = 'admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper: Meeting End Time
CREATE OR REPLACE FUNCTION public.meeting_end(p_meeting_time timestamptz, p_duration_minutes integer)
RETURNS timestamptz AS $$
BEGIN
    RETURN p_meeting_time + (p_duration_minutes || ' minutes')::interval;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper: Cancel Deadline (exactly 60 minutes before meeting_time)
CREATE OR REPLACE FUNCTION public.cancel_deadline(p_meeting_time timestamptz)
RETURNS timestamptz AS $$
BEGIN
    RETURN p_meeting_time - interval '60 minutes';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper: Half-open interval overlap check [start_a, end_a) and [start_b, end_b)
CREATE OR REPLACE FUNCTION public.intervals_overlap(
    p_start_a timestamptz,
    p_dur_a integer,
    p_start_b timestamptz,
    p_dur_b integer
)
RETURNS boolean AS $$
DECLARE
    v_end_a timestamptz := p_start_a + (p_dur_a || ' minutes')::interval;
    v_end_b timestamptz := p_start_b + (p_dur_b || ' minutes')::interval;
BEGIN
    RETURN (p_start_a < v_end_b) AND (p_start_b < v_end_a);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper: Slot conflict check for a student
CREATE OR REPLACE FUNCTION public.check_slot_conflict(
    p_studentid integer,
    p_meeting_time timestamptz,
    p_duration_minutes integer,
    p_exclude_requestid integer DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
    v_conflict boolean := false;
BEGIN
    -- Check any confirmed meeting involving p_studentid as requester or provider
    SELECT true INTO v_conflict
    FROM public.request_meeting rm
    JOIN public.skill_request sr ON sr.requestid = rm.requestid
    WHERE sr.status = 'confirmed'
      AND (p_exclude_requestid IS NULL OR rm.requestid <> p_exclude_requestid)
      AND (
          EXISTS (
              SELECT 1 FROM public.student_sends_skill_request ss
              WHERE ss.requestid = rm.requestid AND ss.studentid = p_studentid
          )
          OR EXISTS (
              SELECT 1 FROM public.student_receives_skill_request sr_rec
              WHERE sr_rec.requestid = rm.requestid AND sr_rec.studentid = p_studentid
          )
      )
      AND public.intervals_overlap(rm.meeting_time, rm.duration_minutes, p_meeting_time, p_duration_minutes)
    LIMIT 1;

    RETURN COALESCE(v_conflict, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- View: v_skill_catalogue
-- Aggregates skills, category name, and provider count of complete-profile students
CREATE OR REPLACE VIEW public.v_skill_catalogue AS
SELECT
    s.skillid,
    s.skillname,
    s.categoryid,
    c.categoryname,
    COALESCE(COUNT(DISTINCT shs.studentid) FILTER (
        WHERE public.is_profile_complete(shs.studentid)
    ), 0)::integer AS provider_count
FROM public.skill s
JOIN public.category c ON c.categoryid = s.categoryid
LEFT JOIN public.studenthas_skill shs ON shs.skillid = s.skillid
GROUP BY s.skillid, s.skillname, s.categoryid, c.categoryname;

-- Enable Row Level Security (RLS) on tables accessed directly by client
ALTER TABLE public.category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studenthas_skill ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_proposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;

-- Policies: category (Read-only for all, write for admin)
DROP POLICY IF EXISTS "Allow read category" ON public.category;
CREATE POLICY "Allow read category" ON public.category
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Admin modify category" ON public.category;
CREATE POLICY "Admin modify category" ON public.category
    FOR ALL TO authenticated USING (public.is_admin());

-- Policies: skill (Read-only for all, write for admin)
DROP POLICY IF EXISTS "Allow read skill" ON public.skill;
CREATE POLICY "Allow read skill" ON public.skill
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Admin modify skill" ON public.skill;
CREATE POLICY "Admin modify skill" ON public.skill
    FOR ALL TO authenticated USING (public.is_admin());

-- Policies: category_request (Students view/insert own, Admin view/update all)
DROP POLICY IF EXISTS "Student view own category requests" ON public.category_request;
CREATE POLICY "Student view own category requests" ON public.category_request
    FOR SELECT TO authenticated
    USING (studentid = public.my_studentid() OR public.is_admin());

DROP POLICY IF EXISTS "Student insert own category requests" ON public.category_request;
CREATE POLICY "Student insert own category requests" ON public.category_request
    FOR INSERT TO authenticated
    WITH CHECK (studentid = public.my_studentid());

DROP POLICY IF EXISTS "Admin update category requests" ON public.category_request;
CREATE POLICY "Admin update category requests" ON public.category_request
    FOR UPDATE TO authenticated
    USING (public.is_admin());

-- Policies: skill_proposal (Students view/insert own, Admin view/update all)
DROP POLICY IF EXISTS "Student view own skill proposals" ON public.skill_proposal;
CREATE POLICY "Student view own skill proposals" ON public.skill_proposal
    FOR SELECT TO authenticated
    USING (studentid = public.my_studentid() OR public.is_admin());

DROP POLICY IF EXISTS "Student insert own skill proposals" ON public.skill_proposal;
CREATE POLICY "Student insert own skill proposals" ON public.skill_proposal
    FOR INSERT TO authenticated
    WITH CHECK (studentid = public.my_studentid());

DROP POLICY IF EXISTS "Admin update skill proposals" ON public.skill_proposal;
CREATE POLICY "Admin update skill proposals" ON public.skill_proposal
    FOR UPDATE TO authenticated
    USING (public.is_admin());

-- Policies: notification (Students view and update own)
DROP POLICY IF EXISTS "Student view own notifications" ON public.notification;
CREATE POLICY "Student view own notifications" ON public.notification
    FOR SELECT TO authenticated
    USING (studentid = public.my_studentid());

DROP POLICY IF EXISTS "Student update own notifications" ON public.notification;
CREATE POLICY "Student update own notifications" ON public.notification
    FOR UPDATE TO authenticated
    USING (studentid = public.my_studentid());
