-- Migration 0009: Security & Rule Parity Fixes
-- 1. Enable RLS on all remaining tables (INC-01)
-- 2. Align phone number validation with rules.ts (^(\+91)?[0-9]{10}$) (INC-02)
-- 3. Add performance indexes on foreign key columns (INC-03)

-- 1. Enable RLS on all remaining tables
ALTER TABLE public.student_sends_skill_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_receives_skill_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_gives_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_receives_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_meeting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_cancellation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

-- 2. Foreign Key and Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_skill_request_skillid ON public.skill_request (skillid);
CREATE INDEX IF NOT EXISTS idx_student_sends_req_reqid ON public.student_sends_skill_request (requestid);
CREATE INDEX IF NOT EXISTS idx_student_receives_req_reqid ON public.student_receives_skill_request (requestid);
CREATE INDEX IF NOT EXISTS idx_student_gives_fb_reqid ON public.student_gives_feedback (requestid);
CREATE INDEX IF NOT EXISTS idx_student_receives_fb_reqid ON public.student_receives_feedback (requestid);

-- 3. Update update_my_profile to support phone numbers with optional +91 prefix
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
    IF length(v_phone1) > 15 OR NOT (v_phone1 ~ '^(\+91)?[0-9]{10}$') THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Phone 1 must be 10 digits or +91 followed by 10 digits';
    END IF;
    IF v_phone2 IS NOT NULL AND (length(v_phone2) > 15 OR NOT (v_phone2 ~ '^(\+91)?[0-9]{10}$')) THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Phone 2 must be 10 digits or +91 followed by 10 digits';
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

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text, integer, text, text, text, text) TO authenticated, service_role;
