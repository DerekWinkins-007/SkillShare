-- 0003_auth_profile_rpcs.sql
-- SkillShare: Auth User Trigger & Authentication / Profile RPCs

-- 1. Trigger on auth.users for student registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_regno varchar(30);
    v_studentid integer;
BEGIN
    -- Extract registration number from metadata
    v_regno := upper(trim(COALESCE(NEW.raw_user_meta_data->>'regno', '')));

    -- Only proceed if regno is provided (students)
    IF v_regno IS NOT NULL AND v_regno <> '' THEN
        -- Validate regno pattern: 2 digits + 3 uppercase letters + 4 digits
        IF NOT (v_regno ~ '^[0-9]{2}[A-Z]{3}[0-9]{4}$') THEN
            RAISE EXCEPTION 'INVALID_REGNO' USING DETAIL = 'Invalid registration number format';
        END IF;

        -- Check if regno is already registered
        IF EXISTS (SELECT 1 FROM public.signup WHERE upper(username) = v_regno) THEN
            RAISE EXCEPTION 'REGNO_TAKEN' USING DETAIL = 'Registration number is already registered';
        END IF;

        -- Create student record
        INSERT INTO public.student (email1)
        VALUES (lower(trim(NEW.email)))
        RETURNING studentid INTO v_studentid;

        -- Create signup record mapping studentid to registration number
        INSERT INTO public.signup (studentid, username)
        VALUES (v_studentid, v_regno);

        -- Create app_user record
        INSERT INTO public.app_user (auth_id, role, studentid, display_name, created_at)
        VALUES (NEW.id, 'student', v_studentid, NULL, now());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition on auth.users (if auth schema exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- 2. RPC: resolve_login_identifier
-- Resolves a registration number (username) to login email for Supabase Auth signIn
CREATE OR REPLACE FUNCTION public.resolve_login_identifier(p_regno text)
RETURNS text AS $$
DECLARE
    v_regno varchar(30);
    v_email text;
BEGIN
    v_regno := upper(trim(p_regno));

    SELECT u.email INTO v_email
    FROM public.signup su
    JOIN public.app_user au ON au.studentid = su.studentid
    JOIN auth.users u ON u.id = au.auth_id
    WHERE upper(su.username) = v_regno;

    IF v_email IS NULL THEN
        -- Fallback: check student.email1
        SELECT s.email1 INTO v_email
        FROM public.signup su
        JOIN public.student s ON s.studentid = su.studentid
        WHERE upper(su.username) = v_regno;
    END IF;

    RETURN v_email;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. RPC: get_me
-- Returns Me structure for currently logged in session
CREATE OR REPLACE FUNCTION public.get_me()
RETURNS jsonb AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_user public.app_user%ROWTYPE;
    v_st public.student%ROWTYPE;
    v_regno varchar(30);
    v_email text;
    v_complete boolean := false;
    v_student_json jsonb := NULL;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    SELECT * INTO v_user FROM public.app_user WHERE auth_id = v_uid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

    IF v_user.role = 'student' THEN
        SELECT * INTO v_st FROM public.student WHERE studentid = v_user.studentid;
        SELECT username INTO v_regno FROM public.signup WHERE studentid = v_user.studentid;
        v_complete := public.is_profile_complete(v_user.studentid);

        v_student_json := jsonb_build_object(
            'studentid', v_st.studentid,
            'regno', COALESCE(v_regno, ''),
            'fname', v_st.fname,
            'lname', v_st.lname,
            'dept', v_st.dept,
            'year', v_st.year,
            'phone1', v_st.phone1,
            'phone2', v_st.phone2,
            'email1', v_st.email1,
            'email2', v_st.email2
        );

        RETURN jsonb_build_object(
            'auth_id', v_uid,
            'role', 'student',
            'login_email', COALESCE(v_email, v_st.email1, ''),
            'display_name', NULL,
            'student', v_student_json,
            'profile_complete', v_complete
        );
    ELSE
        RETURN jsonb_build_object(
            'auth_id', v_uid,
            'role', 'admin',
            'login_email', COALESCE(v_email, ''),
            'display_name', v_user.display_name,
            'student', NULL,
            'profile_complete', true
        );
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. RPC: update_my_profile
CREATE OR REPLACE FUNCTION public.update_my_profile(
    p_fname text,
    p_lname text,
    p_dept text,
    p_year integer,
    p_phone1 text,
    p_phone2 text DEFAULT NULL,
    p_email1 text DEFAULT NULL,
    p_email2 text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_sid integer;
    v_fname varchar(20) := trim(p_fname);
    v_lname varchar(20) := trim(p_lname);
    v_dept varchar(30) := trim(p_dept);
    v_phone1 varchar(15) := trim(p_phone1);
    v_phone2 varchar(15) := NULLIF(trim(p_phone2), '');
    v_email1 varchar(50) := lower(trim(p_email1));
    v_email2 varchar(50) := NULLIF(lower(trim(p_email2)), '');
    v_regno varchar(30);
    v_st public.student%ROWTYPE;
BEGIN
    v_sid := public.my_studentid();
    IF v_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    -- Validations
    IF length(v_fname) = 0 OR length(v_fname) > 20 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'First name must be 1-20 characters';
    END IF;
    IF length(v_lname) = 0 OR length(v_lname) > 20 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Last name must be 1-20 characters';
    END IF;
    IF length(v_dept) = 0 OR length(v_dept) > 30 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Department must be 1-30 characters';
    END IF;
    IF p_year IS NULL OR p_year < 1 OR p_year > 4 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Year must be between 1 and 4';
    END IF;
    IF NOT (v_phone1 ~ '^[0-9]{10}$') THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Phone 1 must be 10 digits';
    END IF;
    IF v_phone2 IS NOT NULL AND NOT (v_phone2 ~ '^[0-9]{10}$') THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Phone 2 must be 10 digits';
    END IF;
    IF length(v_email1) = 0 OR length(v_email1) > 50 OR NOT (v_email1 ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Invalid primary email';
    END IF;
    IF v_email2 IS NOT NULL AND (length(v_email2) > 50 OR NOT (v_email2 ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')) THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Invalid secondary email';
    END IF;

    UPDATE public.student
    SET fname = v_fname,
        lname = v_lname,
        dept = v_dept,
        year = p_year,
        phone1 = v_phone1,
        phone2 = v_phone2,
        email1 = v_email1,
        email2 = v_email2
    WHERE studentid = v_sid
    RETURNING * INTO v_st;

    SELECT username INTO v_regno FROM public.signup WHERE studentid = v_sid;

    RETURN jsonb_build_object(
        'studentid', v_st.studentid,
        'regno', COALESCE(v_regno, ''),
        'fname', v_st.fname,
        'lname', v_st.lname,
        'dept', v_st.dept,
        'year', v_st.year,
        'phone1', v_st.phone1,
        'phone2', v_st.phone2,
        'email1', v_st.email1,
        'email2', v_st.email2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: get_public_profile
CREATE OR REPLACE FUNCTION public.get_public_profile(p_studentid integer)
RETURNS jsonb AS $$
DECLARE
    v_st public.student%ROWTYPE;
    v_skills jsonb;
    v_avg_rating numeric;
    v_feedback_count integer;
    v_sessions_taught integer;
BEGIN
    SELECT * INTO v_st FROM public.student WHERE studentid = p_studentid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Student not found';
    END IF;

    -- Aggregate skills offered by student
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'skillid', s.skillid,
        'skillname', s.skillname,
        'categoryid', s.categoryid,
        'categoryname', c.categoryname
    ) ORDER BY s.skillname), '[]'::jsonb)
    INTO v_skills
    FROM public.studenthas_skill shs
    JOIN public.skill s ON s.skillid = shs.skillid
    JOIN public.category c ON c.categoryid = s.categoryid
    WHERE shs.studentid = p_studentid;

    -- Rating stats
    SELECT
        ROUND(AVG(rating)::numeric, 1),
        COUNT(*)::integer
    INTO v_avg_rating, v_feedback_count
    FROM public.student_receives_feedback
    WHERE studentid = p_studentid;

    -- Sessions taught count (confirmed or completed sessions where provider)
    SELECT COUNT(*)::integer INTO v_sessions_taught
    FROM public.student_receives_skill_request sr_rec
    JOIN public.skill_request sr ON sr.requestid = sr_rec.requestid
    WHERE sr_rec.studentid = p_studentid
      AND sr.status IN ('confirmed', 'completed');

    RETURN jsonb_build_object(
        'studentid', v_st.studentid,
        'fname', COALESCE(v_st.fname, ''),
        'lname', COALESCE(v_st.lname, ''),
        'dept', COALESCE(v_st.dept, ''),
        'year', COALESCE(v_st.year, 1),
        'skills', v_skills,
        'avg_rating', v_avg_rating,
        'feedback_count', COALESCE(v_feedback_count, 0),
        'sessions_taught', COALESCE(v_sessions_taught, 0)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 6. RPC: list_feedback_received
CREATE OR REPLACE FUNCTION public.list_feedback_received(p_studentid integer)
RETURNS jsonb AS $$
DECLARE
    v_res jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'feedbackid', rf.feedbackid,
        'rating', rf.rating,
        'comments', rf.comments,
        'giver_fname', COALESCE(giver.fname, 'Anonymous'),
        'skillname', s.skillname,
        'requestid', rf.requestid
    ) ORDER BY rf.feedbackid DESC), '[]'::jsonb)
    INTO v_res
    FROM public.student_receives_feedback rf
    JOIN public.skill_request sr ON sr.requestid = rf.requestid
    JOIN public.skill s ON s.skillid = sr.skillid
    JOIN public.student_sends_skill_request ss ON ss.requestid = rf.requestid
    JOIN public.student giver ON giver.studentid = ss.studentid
    WHERE rf.studentid = p_studentid;

    RETURN v_res;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
