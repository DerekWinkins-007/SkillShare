-- 0007_feedback_dashboard_reports.sql
-- SkillShare: Feedback, Dashboard, Reports, Grants, and Realtime Publications

-- 1. RPC: list_feedback_due
CREATE OR REPLACE FUNCTION public.list_feedback_due()
RETURNS jsonb AS $$
DECLARE
    v_my_sid integer;
    v_res jsonb;
BEGIN
    v_my_sid := public.my_studentid();
    IF v_my_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT COALESCE(jsonb_agg(public.build_request_view(sr.requestid, v_my_sid) ORDER BY sr.requestid DESC), '[]'::jsonb)
    INTO v_res
    FROM public.skill_request sr
    JOIN public.student_sends_skill_request req ON req.requestid = sr.requestid
    WHERE req.studentid = v_my_sid
      AND sr.status = 'completed'
      AND NOT EXISTS (
          SELECT 1 FROM public.student_gives_feedback sgf
          WHERE sgf.requestid = sr.requestid
      );

    RETURN v_res;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. RPC: submit_feedback
CREATE OR REPLACE FUNCTION public.submit_feedback(
    p_requestid integer,
    p_rating integer,
    p_comments text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_my_sid integer;
    v_sr public.skill_request%ROWTYPE;
    v_req_sid integer;
    v_prov_sid integer;
    v_comments varchar(100);
BEGIN
    v_my_sid := public.my_studentid();
    IF v_my_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT * INTO v_sr FROM public.skill_request WHERE requestid = p_requestid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'REQUEST_NOT_FOUND';
    END IF;

    SELECT studentid INTO v_req_sid FROM public.student_sends_skill_request WHERE requestid = p_requestid;
    SELECT studentid INTO v_prov_sid FROM public.student_receives_skill_request WHERE requestid = p_requestid;

    -- Only requester can submit feedback
    IF v_my_sid <> v_req_sid THEN
        RAISE EXCEPTION 'FEEDBACK_NOT_ALLOWED';
    END IF;

    IF v_sr.status <> 'completed' THEN
        RAISE EXCEPTION 'FEEDBACK_NOT_ALLOWED';
    END IF;

    IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Rating must be between 1 and 5';
    END IF;

    v_comments := NULLIF(trim(p_comments), '');
    IF v_comments IS NOT NULL AND length(v_comments) > 100 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Comments max 100 chars';
    END IF;

    IF EXISTS (SELECT 1 FROM public.student_gives_feedback WHERE requestid = p_requestid) THEN
        RAISE EXCEPTION 'FEEDBACK_EXISTS';
    END IF;

    -- Insert one row into student_gives_feedback (giver) and one into student_receives_feedback (receiver)
    INSERT INTO public.student_gives_feedback (studentid, comments, rating, requestid)
    VALUES (v_req_sid, v_comments, p_rating, p_requestid);

    INSERT INTO public.student_receives_feedback (studentid, comments, rating, requestid)
    VALUES (v_prov_sid, v_comments, p_rating, p_requestid);

    -- Notify provider
    INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
    VALUES (v_prov_sid, 'feedback_received', p_requestid, false, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: get_my_dashboard
CREATE OR REPLACE FUNCTION public.get_my_dashboard()
RETURNS jsonb AS $$
DECLARE
    v_my_sid integer;
    v_skill_count integer;
    v_pending_inc integer;
    v_upcoming jsonb;
    v_avg_rating numeric;
    v_feedback_count integer;
    v_feedback_due jsonb;
BEGIN
    v_my_sid := public.my_studentid();
    IF v_my_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    -- My skill count
    SELECT COUNT(*)::integer INTO v_skill_count
    FROM public.studenthas_skill WHERE studentid = v_my_sid;

    -- Pending incoming requests
    SELECT COUNT(*)::integer INTO v_pending_inc
    FROM public.skill_request sr
    JOIN public.student_receives_skill_request prov ON prov.requestid = sr.requestid
    WHERE prov.studentid = v_my_sid AND sr.status = 'pending';

    -- Upcoming confirmed sessions
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'requestid', sr.requestid,
        'skillname', sk.skillname,
        'meeting_time', rm.meeting_time,
        'counterpart_name', trim(COALESCE(cp.fname, '') || ' ' || COALESCE(cp.lname, ''))
    ) ORDER BY rm.meeting_time ASC), '[]'::jsonb)
    INTO v_upcoming
    FROM public.skill_request sr
    JOIN public.skill sk ON sk.skillid = sr.skillid
    JOIN public.request_meeting rm ON rm.requestid = sr.requestid
    JOIN (
        SELECT ss.requestid, cp_st.fname, cp_st.lname
        FROM public.student_sends_skill_request ss
        JOIN public.student_receives_skill_request rec ON rec.requestid = ss.requestid
        JOIN public.student cp_st ON cp_st.studentid = rec.studentid
        WHERE ss.studentid = v_my_sid
        UNION ALL
        SELECT rec.requestid, cp_st.fname, cp_st.lname
        FROM public.student_receives_skill_request rec
        JOIN public.student_sends_skill_request ss ON ss.requestid = rec.requestid
        JOIN public.student cp_st ON cp_st.studentid = ss.studentid
        WHERE rec.studentid = v_my_sid
    ) cp ON cp.requestid = sr.requestid
    WHERE sr.status = 'confirmed'
      AND now() < public.meeting_end(rm.meeting_time, rm.duration_minutes);

    -- Rating stats
    SELECT
        ROUND(AVG(rating)::numeric, 1),
        COUNT(*)::integer
    INTO v_avg_rating, v_feedback_count
    FROM public.student_receives_feedback
    WHERE studentid = v_my_sid;

    -- Feedback due
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'requestid', sr.requestid,
        'skillname', sk.skillname,
        'provider_name', trim(COALESCE(prov_st.fname, '') || ' ' || COALESCE(prov_st.lname, ''))
    ) ORDER BY sr.requestid DESC), '[]'::jsonb)
    INTO v_feedback_due
    FROM public.skill_request sr
    JOIN public.skill sk ON sk.skillid = sr.skillid
    JOIN public.student_sends_skill_request req ON req.requestid = sr.requestid
    JOIN public.student_receives_skill_request prov ON prov.requestid = sr.requestid
    JOIN public.student prov_st ON prov_st.studentid = prov.studentid
    WHERE req.studentid = v_my_sid
      AND sr.status = 'completed'
      AND NOT EXISTS (
          SELECT 1 FROM public.student_gives_feedback sgf
          WHERE sgf.requestid = sr.requestid
      );

    RETURN jsonb_build_object(
        'my_skill_count', COALESCE(v_skill_count, 0),
        'pending_incoming', COALESCE(v_pending_inc, 0),
        'upcoming', v_upcoming,
        'avg_rating', v_avg_rating,
        'feedback_count', COALESCE(v_feedback_count, 0),
        'feedback_due', v_feedback_due
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. RPC: mark_notifications_read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids integer[])
RETURNS void AS $$
DECLARE
    v_my_sid integer;
BEGIN
    v_my_sid := public.my_studentid();
    IF v_my_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    UPDATE public.notification
    SET is_read = true
    WHERE studentid = v_my_sid
      AND notificationid = ANY(p_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: run_report
CREATE OR REPLACE FUNCTION public.run_report(p_n integer, p_dept text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    v_res jsonb;
BEGIN
    IF p_n = 1 THEN
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'studentid', s.studentid,
            'fname', s.fname,
            'lname', s.lname,
            'dept', s.dept
        ) ORDER BY s.studentid ASC), '[]'::jsonb)
        INTO v_res
        FROM public.student s
        WHERE (p_dept IS NULL OR lower(trim(s.dept)) = lower(trim(p_dept)));

    ELSIF p_n = 2 THEN
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'skillname', sk.skillname,
            'categoryname', c.categoryname
        ) ORDER BY sk.skillname ASC), '[]'::jsonb)
        INTO v_res
        FROM public.skill sk
        JOIN public.category c ON c.categoryid = sk.categoryid;

    ELSIF p_n = 3 THEN
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'total_feedback', agg.total_feedback,
            'avg_rating', agg.avg_rating
        )), '[]'::jsonb)
        INTO v_res
        FROM (
            SELECT
                COUNT(*)::integer AS total_feedback,
                ROUND(AVG(rating)::numeric, 1) AS avg_rating
            FROM public.student_gives_feedback
        ) agg;

    ELSIF p_n = 4 THEN
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'status', agg.status,
            'request_count', agg.request_count
        ) ORDER BY agg.status ASC), '[]'::jsonb)
        INTO v_res
        FROM (
            SELECT
                status,
                COUNT(*)::integer AS request_count
            FROM public.skill_request
            GROUP BY status
        ) agg;

    ELSIF p_n = 5 THEN
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'studentid', srf.studentid,
            'feedbackid', srf.feedbackid,
            'rating', srf.rating,
            'comments', srf.comments
        ) ORDER BY srf.rating DESC, srf.feedbackid DESC), '[]'::jsonb)
        INTO v_res
        FROM public.student_receives_feedback srf;

    ELSE
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Invalid report number';
    END IF;

    RETURN v_res;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 6. Grants
DO $$
BEGIN
    -- Schema usage
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

    -- Tables
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
    GRANT SELECT ON public.category, public.skill, public.v_skill_catalogue TO anon;

    -- Functions
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon, service_role;
END $$;

-- 7. Realtime Publication Setup (if publication exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notification;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.category_request;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.skill_proposal;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore publication alteration errors if table already added or insufficient privileges
        NULL;
END $$;
