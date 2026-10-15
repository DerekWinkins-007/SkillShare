-- 0006c_request_workflow.sql
-- SkillShare: Request Lists, Details, Contact Reveal, and Auto-Completion Sync RPCs

-- 1. RPC: get_request
CREATE OR REPLACE FUNCTION public.get_request(p_requestid integer)
RETURNS jsonb AS $$
DECLARE
    v_my_sid integer;
BEGIN
    v_my_sid := public.my_studentid();
    IF v_my_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    RETURN public.build_request_view(p_requestid, v_my_sid);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. RPC: list_my_requests
CREATE OR REPLACE FUNCTION public.list_my_requests(
    p_role text,
    p_status text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_my_sid integer;
    v_res jsonb;
BEGIN
    v_my_sid := public.my_studentid();
    IF v_my_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF p_role = 'requester' THEN
        SELECT COALESCE(jsonb_agg(public.build_request_view(sr.requestid, v_my_sid) ORDER BY sr.requestid DESC), '[]'::jsonb)
        INTO v_res
        FROM public.skill_request sr
        JOIN public.student_sends_skill_request req ON req.requestid = sr.requestid
        WHERE req.studentid = v_my_sid
          AND (p_status IS NULL OR p_status = 'all' OR sr.status = p_status);
    ELSIF p_role = 'provider' THEN
        SELECT COALESCE(jsonb_agg(public.build_request_view(sr.requestid, v_my_sid) ORDER BY sr.requestid DESC), '[]'::jsonb)
        INTO v_res
        FROM public.skill_request sr
        JOIN public.student_receives_skill_request prov ON prov.requestid = sr.requestid
        WHERE prov.studentid = v_my_sid
          AND (p_status IS NULL OR p_status = 'all' OR sr.status = p_status);
    ELSE
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Role must be requester or provider';
    END IF;

    RETURN v_res;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. RPC: get_contact_details
CREATE OR REPLACE FUNCTION public.get_contact_details(p_requestid integer)
RETURNS jsonb AS $$
DECLARE
    v_my_sid integer;
    v_sr public.skill_request%ROWTYPE;
    v_req_sid integer;
    v_prov_sid integer;
    v_cp_sid integer;
    v_cp_st public.student%ROWTYPE;
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

    IF v_my_sid = v_req_sid THEN
        v_cp_sid := v_prov_sid;
    ELSIF v_my_sid = v_prov_sid THEN
        v_cp_sid := v_req_sid;
    ELSE
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    -- Contact details are only revealed for confirmed or completed sessions
    IF v_sr.status NOT IN ('confirmed', 'completed') THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT * INTO v_cp_st FROM public.student WHERE studentid = v_cp_sid;

    RETURN jsonb_build_object(
        'requestid', p_requestid,
        'fname', COALESCE(v_cp_st.fname, ''),
        'lname', COALESCE(v_cp_st.lname, ''),
        'dept', COALESCE(v_cp_st.dept, ''),
        'year', COALESCE(v_cp_st.year, 1),
        'phone1', COALESCE(v_cp_st.phone1, ''),
        'phone2', v_cp_st.phone2,
        'email1', COALESCE(v_cp_st.email1, ''),
        'email2', v_cp_st.email2
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. RPC: sync_completed_requests
CREATE OR REPLACE FUNCTION public.sync_completed_requests()
RETURNS jsonb AS $$
DECLARE
    v_completed_count integer := 0;
    v_expired_count integer := 0;
    v_rec RECORD;
BEGIN
    -- 1. Auto-complete confirmed sessions whose meeting end time has passed
    FOR v_rec IN
        SELECT sr.requestid, req.studentid AS requester_id
        FROM public.skill_request sr
        JOIN public.request_meeting rm ON rm.requestid = sr.requestid
        JOIN public.student_sends_skill_request req ON req.requestid = sr.requestid
        WHERE sr.status = 'confirmed'
          AND now() >= public.meeting_end(rm.meeting_time, rm.duration_minutes)
    LOOP
        UPDATE public.skill_request
        SET status = 'completed'
        WHERE requestid = v_rec.requestid;

        -- Notify requester that session completed and feedback is due
        INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
        VALUES (v_rec.requester_id, 'session_completed_feedback_due', v_rec.requestid, false, now());

        v_completed_count := v_completed_count + 1;
    END LOOP;

    -- 2. Auto-expire accepted sessions that were not confirmed before the cancellation cutoff
    FOR v_rec IN
        SELECT sr.requestid, req.studentid AS requester_id, prov.studentid AS provider_id
        FROM public.skill_request sr
        JOIN public.request_meeting rm ON rm.requestid = sr.requestid
        JOIN public.student_sends_skill_request req ON req.requestid = sr.requestid
        JOIN public.student_receives_skill_request prov ON prov.requestid = sr.requestid
        WHERE sr.status = 'accepted'
          AND now() > public.cancel_deadline(rm.meeting_time)
    LOOP
        UPDATE public.skill_request
        SET status = 'cancelled'
        WHERE requestid = v_rec.requestid;

        INSERT INTO public.request_cancellation (requestid, cancelled_by, reason, cancelled_at)
        VALUES (v_rec.requestid, NULL, 'Slot response expired', now())
        ON CONFLICT (requestid) DO UPDATE
        SET reason = EXCLUDED.reason, cancelled_at = now();

        -- Notify both parties
        INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
        VALUES (v_rec.requester_id, 'request_cancelled', v_rec.requestid, false, now());

        INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
        VALUES (v_rec.provider_id, 'request_cancelled', v_rec.requestid, false, now());

        v_expired_count := v_expired_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'completed', v_completed_count,
        'expired', v_expired_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
