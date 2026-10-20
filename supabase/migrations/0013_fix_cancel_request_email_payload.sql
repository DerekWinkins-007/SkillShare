-- 0013 (corrected): cancel_request with email payload fix, pending-cancel rule and search_path
CREATE OR REPLACE FUNCTION public.cancel_request(
    p_requestid integer,
    p_reason text
)
RETURNS void AS $$
DECLARE
    v_my_sid integer;
    v_sr public.skill_request%ROWTYPE;
    v_req_sid integer;
    v_prov_sid integer;
    v_cp_sid integer;
    v_reason varchar(200);
    v_rm public.request_meeting%ROWTYPE;
    v_sk public.skill%ROWTYPE;
    v_my_st public.student%ROWTYPE;
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

    IF v_sr.status NOT IN ('pending', 'accepted', 'confirmed') THEN
        RAISE EXCEPTION 'INVALID_TRANSITION';
    END IF;

    IF v_sr.status = 'pending' AND v_my_sid <> v_req_sid THEN
        RAISE EXCEPTION 'INVALID_TRANSITION';
    END IF;

    v_reason := trim(p_reason);
    IF length(v_reason) = 0 OR length(v_reason) > 200 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Reason 1-200 chars';
    END IF;

    SELECT * INTO v_rm FROM public.request_meeting WHERE requestid = p_requestid;

    IF v_sr.status IN ('accepted', 'confirmed') THEN
        IF v_rm.meeting_time IS NOT NULL AND now() > public.cancel_deadline(v_rm.meeting_time) THEN
            RAISE EXCEPTION 'CANCEL_WINDOW_CLOSED';
        END IF;
    END IF;

    SELECT * INTO v_sk FROM public.skill WHERE skillid = v_sr.skillid;
    SELECT * INTO v_my_st FROM public.student WHERE studentid = v_my_sid;

    INSERT INTO public.request_cancellation (requestid, cancelled_by, reason, cancelled_at)
    VALUES (p_requestid, v_my_sid, v_reason, now())
    ON CONFLICT (requestid) DO UPDATE
    SET cancelled_by = EXCLUDED.cancelled_by,
        reason = EXCLUDED.reason,
        cancelled_at = now();

    UPDATE public.skill_request
    SET status = 'cancelled'
    WHERE requestid = p_requestid;

    INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
    VALUES (v_cp_sid, 'request_cancelled', p_requestid, false, now());

    INSERT INTO public.email_outbox (requestid, kind, to_studentid, payload, status, attempts, created_at)
    VALUES (
        p_requestid,
        'request_cancelled',
        v_cp_sid,
        jsonb_build_object(
            'kind', 'request_cancelled',
            'requestid', p_requestid,
            'cancelled_by_fname', COALESCE(v_my_st.fname, ''),
            'skillname', v_sk.skillname,
            'meeting_time', v_rm.meeting_time,
            'reason', v_reason
        ),
        'queued',
        0,
        now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;