-- Migration 0008: Separate Login Email from Contact Emails
-- Login email is auth.users.email (used for auth signIn and where system emails are sent).
-- student.email1 and student.email2 are contact emails only (revealed upon confirmation).

-- 1. Redefine resolve_login_identifier
-- Must return auth.users.email for the given registration number.
-- Does NOT fallback to student.email1.
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

    RETURN v_email;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Redefine get_me
-- Returns Me structure for currently logged in session.
-- login_email must come directly from auth.users.email, never falling back to student.email1.
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
            'login_email', COALESCE(v_email, ''),
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

-- Grants: ensure anon and authenticated can execute resolve_login_identifier and get_me
GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_me() TO authenticated, anon, service_role;
