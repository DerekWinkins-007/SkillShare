-- 0006b_request_workflow.sql
-- SkillShare: Respond to Slot Proposal and Cancel Request RPCs

-- 1. RPC: respond_to_slot
CREATE OR REPLACE FUNCTION public.respond_to_slot(
    p_requestid integer,
    p_agree boolean
)
RETURNS void AS $$
DECLARE
    v_my_sid integer;
    v_sr public.skill_request%ROWTYPE;
    v_req_sid integer;
    v_prov_sid integer;
    v_sk public.skill%ROWTYPE;
    v_cat public.category%ROWTYPE;
    v_rm public.request_meeting%ROWTYPE;
    v_req_st public.student%ROWTYPE;
    v_prov_st public.student%ROWTYPE;
    v_req_name text;
    v_prov_name text;
    v_cancel_dl timestamptz;
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

    -- Only requester can accept or decline the slot proposed by the provider
    IF v_my_sid <> v_req_sid THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF v_sr.status <> 'accepted' THEN
        RAISE EXCEPTION 'INVALID_TRANSITION';
    END IF;

    SELECT * INTO v_sk FROM public.skill WHERE skillid = v_sr.skillid;
    SELECT * INTO v_cat FROM public.category WHERE categoryid = v_sk.categoryid;
    SELECT * INTO v_rm FROM public.request_meeting WHERE requestid = p_requestid;
    SELECT * INTO v_req_st FROM public.student WHERE studentid = v_req_sid;
    SELECT * INTO v_prov_st FROM public.student WHERE studentid = v_prov_sid;

    v_req_name := trim(COALESCE(v_req_st.fname, '') || ' ' || COALESCE(v_req_st.lname, ''));
    v_prov_name := trim(COALESCE(v_prov_st.fname, '') || ' ' || COALESCE(v_prov_st.lname, ''));

    IF NOT p_agree THEN
        UPDATE public.skill_request
        SET status = 'rejected'
        WHERE requestid = p_requestid;

        INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
        VALUES (v_prov_sid, 'request_rejected', p_requestid, false, now());

        INSERT INTO public.email_outbox (requestid, kind, to_studentid, payload, status, attempts, created_at)
        VALUES (
            p_requestid,
            'request_rejected',
            v_prov_sid,
            jsonb_build_object(
                'kind', 'request_rejected',
                'requestid', p_requestid,
                'provider_name', v_req_name,
                'skillname', v_sk.skillname
            ),
            'queued',
            0,
            now()
        );
    ELSE
        -- Double check slot conflict at confirmation time
        IF public.check_slot_conflict(v_prov_sid, v_rm.meeting_time, v_rm.duration_minutes, p_requestid)
           OR public.check_slot_conflict(v_req_sid, v_rm.meeting_time, v_rm.duration_minutes, p_requestid) THEN
            RAISE EXCEPTION 'SLOT_CONFLICT';
        END IF;

        UPDATE public.skill_request
        SET status = 'confirmed'
        WHERE requestid = p_requestid;

        v_cancel_dl := public.cancel_deadline(v_rm.meeting_time);

        -- Notifications for both parties
        INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
        VALUES (v_req_sid, 'request_confirmed', p_requestid, false, now());

        INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
        VALUES (v_prov_sid, 'request_confirmed', p_requestid, false, now());

        -- Email to requester (learner) with provider counterpart details
        INSERT INTO public.email_outbox (requestid, kind, to_studentid, payload, status, attempts, created_at)
        VALUES (
            p_requestid,
            'request_confirmed',
            v_req_sid,
            jsonb_build_object(
                'kind', 'request_confirmed',
                'requestid', p_requestid,
                'skillname', v_sk.skillname,
                'categoryname', v_cat.categoryname,
                'recipient_role', 'learner',
                'meeting_time', v_rm.meeting_time,
                'duration_minutes', v_rm.duration_minutes,
                'mode', v_rm.mode,
                'location', v_rm.location,
                'meeting_link', v_rm.meeting_link,
                'cancel_deadline', v_cancel_dl,
                'counterpart', jsonb_build_object(
                    'fname', COALESCE(v_prov_st.fname, ''),
                    'lname', COALESCE(v_prov_st.lname, ''),
                    'dept', COALESCE(v_prov_st.dept, ''),
                    'year', COALESCE(v_prov_st.year, 1),
                    'phone1', COALESCE(v_prov_st.phone1, ''),
                    'phone2', v_prov_st.phone2,
                    'email1', COALESCE(v_prov_st.email1, ''),
                    'email2', v_prov_st.email2
                )
            ),
            'queued',
            0,
            now()
        );

        -- Email to provider (teacher) with requester counterpart details
        INSERT INTO public.email_outbox (requestid, kind, to_studentid, payload, status, attempts, created_at)
        VALUES (
            p_requestid,
            'request_confirmed',
            v_prov_sid,
            jsonb_build_object(
                'kind', 'request_confirmed',
                'requestid', p_requestid,
                'skillname', v_sk.skillname,
                'categoryname', v_cat.categoryname,
                'recipient_role', 'teacher',
                'meeting_time', v_rm.meeting_time,
                'duration_minutes', v_rm.duration_minutes,
                'mode', v_rm.mode,
                'location', v_rm.location,
                'meeting_link', v_rm.meeting_link,
                'cancel_deadline', v_cancel_dl,
                'counterpart', jsonb_build_object(
                    'fname', COALESCE(v_req_st.fname, ''),
                    'lname', COALESCE(v_req_st.lname, ''),
                    'dept', COALESCE(v_req_st.dept, ''),
                    'year', COALESCE(v_req_st.year, 1),
                    'phone1', COALESCE(v_req_st.phone1, ''),
                    'phone2', v_req_st.phone2,
                    'email1', COALESCE(v_req_st.email1, ''),
                    'email2', v_req_st.email2
                )
            ),
            'queued',
            0,
            now()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: cancel_request
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
    v_sk public.skill%ROWTYPE;
    v_rm public.request_meeting%ROWTYPE;
    v_my_st public.student%ROWTYPE;
    v_reason varchar(200);
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

    v_reason := trim(p_reason);
    IF length(v_reason) = 0 OR length(v_reason) > 200 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Reason 1-200 chars';
    END IF;

    SELECT * INTO v_rm FROM public.request_meeting WHERE requestid = p_requestid;

    -- If confirmed, verify cancel deadline
    IF v_sr.status = 'confirmed' THEN
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

    -- Notify counterpart
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
