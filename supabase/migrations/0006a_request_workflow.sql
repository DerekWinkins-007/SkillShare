-- 0006a_request_workflow.sql
-- SkillShare: Request View Helper, Create Request, and Respond to Request

-- Helper: build_request_view for a specific student viewer
CREATE OR REPLACE FUNCTION public.build_request_view(p_requestid integer, p_viewer_studentid integer)
RETURNS jsonb AS $$
DECLARE
    v_sr public.skill_request%ROWTYPE;
    v_sk public.skill%ROWTYPE;
    v_cat public.category%ROWTYPE;
    v_rm public.request_meeting%ROWTYPE;
    v_rc public.request_cancellation%ROWTYPE;
    v_req_sid integer;
    v_prov_sid integer;
    v_my_role text;
    v_cp_sid integer;
    v_cp_st public.student%ROWTYPE;
    v_cancel_dl timestamptz := NULL;
    v_feedback_given boolean := false;
BEGIN
    SELECT * INTO v_sr FROM public.skill_request WHERE requestid = p_requestid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'REQUEST_NOT_FOUND';
    END IF;

    SELECT studentid INTO v_req_sid FROM public.student_sends_skill_request WHERE requestid = p_requestid;
    SELECT studentid INTO v_prov_sid FROM public.student_receives_skill_request WHERE requestid = p_requestid;

    IF p_viewer_studentid = v_req_sid THEN
        v_my_role := 'requester';
        v_cp_sid := v_prov_sid;
    ELSIF p_viewer_studentid = v_prov_sid THEN
        v_my_role := 'provider';
        v_cp_sid := v_req_sid;
    ELSE
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT * INTO v_sk FROM public.skill WHERE skillid = v_sr.skillid;
    SELECT * INTO v_cat FROM public.category WHERE categoryid = v_sk.categoryid;
    SELECT * INTO v_cp_st FROM public.student WHERE studentid = v_cp_sid;
    SELECT * INTO v_rm FROM public.request_meeting WHERE requestid = p_requestid;
    SELECT * INTO v_rc FROM public.request_cancellation WHERE requestid = p_requestid;

    IF v_rm.meeting_time IS NOT NULL THEN
        v_cancel_dl := public.cancel_deadline(v_rm.meeting_time);
    END IF;

    -- Check if feedback given by requester
    IF EXISTS (SELECT 1 FROM public.student_gives_feedback WHERE requestid = p_requestid) THEN
        v_feedback_given := true;
    END IF;

    RETURN jsonb_build_object(
        'requestid', v_sr.requestid,
        'requestdate', v_sr.requestdate,
        'status', v_sr.status,
        'skillid', v_sk.skillid,
        'skillname', v_sk.skillname,
        'categoryid', v_cat.categoryid,
        'categoryname', v_cat.categoryname,
        'my_role', v_my_role,
        'counterpart_studentid', v_cp_sid,
        'counterpart_fname', COALESCE(v_cp_st.fname, ''),
        'counterpart_lname', COALESCE(v_cp_st.lname, ''),
        'counterpart_dept', COALESCE(v_cp_st.dept, ''),
        'counterpart_year', COALESCE(v_cp_st.year, 1),
        'meeting_time', v_rm.meeting_time,
        'duration_minutes', v_rm.duration_minutes,
        'mode', v_rm.mode,
        'location', v_rm.location,
        'meeting_link', v_rm.meeting_link,
        'cancel_deadline', v_cancel_dl,
        'cancelled_by', v_rc.cancelled_by,
        'cancel_reason', v_rc.reason,
        'feedback_given', v_feedback_given
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 1. RPC: create_request
CREATE OR REPLACE FUNCTION public.create_request(
    p_provider_studentid integer,
    p_skillid integer
)
RETURNS integer AS $$
DECLARE
    v_req_sid integer;
    v_req_st public.student%ROWTYPE;
    v_prov_st public.student%ROWTYPE;
    v_sk public.skill%ROWTYPE;
    v_new_req_id integer;
    v_req_name text;
BEGIN
    v_req_sid := public.my_studentid();
    IF v_req_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    -- 1. Check profile complete
    IF NOT public.is_profile_complete(v_req_sid) THEN
        RAISE EXCEPTION 'PROFILE_INCOMPLETE';
    END IF;

    -- 2. Check skill exists
    SELECT * INTO v_sk FROM public.skill WHERE skillid = p_skillid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SKILL_NOT_FOUND';
    END IF;

    -- 3. Check self request
    IF v_req_sid = p_provider_studentid THEN
        RAISE EXCEPTION 'SELF_REQUEST';
    END IF;

    -- 4. Check skill offered by provider with complete profile
    IF NOT EXISTS (
        SELECT 1 FROM public.studenthas_skill shs
        WHERE shs.studentid = p_provider_studentid AND shs.skillid = p_skillid
    ) OR NOT public.is_profile_complete(p_provider_studentid) THEN
        RAISE EXCEPTION 'SKILL_NOT_OFFERED';
    END IF;

    -- 5. Check duplicate active request
    IF EXISTS (
        SELECT 1 FROM public.skill_request sr
        JOIN public.student_sends_skill_request req ON req.requestid = sr.requestid
        JOIN public.student_receives_skill_request prov ON prov.requestid = sr.requestid
        WHERE req.studentid = v_req_sid
          AND prov.studentid = p_provider_studentid
          AND sr.skillid = p_skillid
          AND sr.status IN ('pending', 'accepted', 'confirmed')
    ) THEN
        RAISE EXCEPTION 'DUPLICATE_ACTIVE_REQUEST';
    END IF;

    SELECT * INTO v_req_st FROM public.student WHERE studentid = v_req_sid;
    v_req_name := trim(COALESCE(v_req_st.fname, '') || ' ' || COALESCE(v_req_st.lname, ''));

    INSERT INTO public.skill_request (requestdate, status, skillid)
    VALUES (now(), 'pending', p_skillid)
    RETURNING requestid INTO v_new_req_id;

    INSERT INTO public.student_sends_skill_request (studentid, requestid)
    VALUES (v_req_sid, v_new_req_id);

    INSERT INTO public.student_receives_skill_request (studentid, requestid)
    VALUES (p_provider_studentid, v_new_req_id);

    -- Notification
    INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
    VALUES (p_provider_studentid, 'request_received', v_new_req_id, false, now());

    -- Email Outbox
    INSERT INTO public.email_outbox (requestid, kind, to_studentid, payload, status, attempts, created_at)
    VALUES (
        v_new_req_id,
        'request_received',
        p_provider_studentid,
        jsonb_build_object(
            'kind', 'request_received',
            'requestid', v_new_req_id,
            'requester_name', v_req_name,
            'skillname', v_sk.skillname
        ),
        'queued',
        0,
        now()
    );

    RETURN v_new_req_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: respond_to_request
CREATE OR REPLACE FUNCTION public.respond_to_request(
    p_requestid integer,
    p_accept boolean,
    p_meeting_time timestamptz DEFAULT NULL,
    p_duration_minutes integer DEFAULT NULL,
    p_mode text DEFAULT NULL,
    p_location text DEFAULT NULL,
    p_meeting_link text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_my_sid integer;
    v_sr public.skill_request%ROWTYPE;
    v_req_sid integer;
    v_prov_sid integer;
    v_sk public.skill%ROWTYPE;
    v_prov_st public.student%ROWTYPE;
    v_prov_name text;
    v_loc varchar(150);
    v_link varchar(200);
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

    -- Only provider can respond to request
    IF v_my_sid <> v_prov_sid THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF v_sr.status <> 'pending' THEN
        RAISE EXCEPTION 'INVALID_TRANSITION';
    END IF;

    SELECT * INTO v_sk FROM public.skill WHERE skillid = v_sr.skillid;
    SELECT * INTO v_prov_st FROM public.student WHERE studentid = v_prov_sid;
    v_prov_name := trim(COALESCE(v_prov_st.fname, '') || ' ' || COALESCE(v_prov_st.lname, ''));

    IF NOT p_accept THEN
        UPDATE public.skill_request
        SET status = 'rejected'
        WHERE requestid = p_requestid;

        INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
        VALUES (v_req_sid, 'request_rejected', p_requestid, false, now());

        INSERT INTO public.email_outbox (requestid, kind, to_studentid, payload, status, attempts, created_at)
        VALUES (
            p_requestid,
            'request_rejected',
            v_req_sid,
            jsonb_build_object(
                'kind', 'request_rejected',
                'requestid', p_requestid,
                'provider_name', v_prov_name,
                'skillname', v_sk.skillname
            ),
            'queued',
            0,
            now()
        );
    ELSE
        -- Slot proposal validation
        IF p_meeting_time IS NULL OR p_meeting_time < (now() + interval '120 minutes') THEN
            RAISE EXCEPTION 'SLOT_TOO_SOON';
        END IF;

        IF p_duration_minutes IS NULL OR p_duration_minutes NOT IN (30, 45, 60, 90) THEN
            RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Duration must be 30, 45, 60, or 90 minutes';
        END IF;

        IF p_mode IS NULL OR p_mode NOT IN ('online', 'offline') THEN
            RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Mode must be online or offline';
        END IF;

        v_loc := NULLIF(trim(p_location), '');
        v_link := NULLIF(trim(p_meeting_link), '');

        IF p_mode = 'offline' AND (v_loc IS NULL OR length(v_loc) = 0) THEN
            RAISE EXCEPTION 'LOCATION_REQUIRED';
        END IF;

        -- Slot conflict check for provider and requester
        IF public.check_slot_conflict(v_prov_sid, p_meeting_time, p_duration_minutes, p_requestid)
           OR public.check_slot_conflict(v_req_sid, p_meeting_time, p_duration_minutes, p_requestid) THEN
            RAISE EXCEPTION 'SLOT_CONFLICT';
        END IF;

        INSERT INTO public.request_meeting (
            requestid, meeting_time, duration_minutes, mode, location, meeting_link, proposed_at
        ) VALUES (
            p_requestid, p_meeting_time, p_duration_minutes, p_mode, v_loc, v_link, now()
        )
        ON CONFLICT (requestid) DO UPDATE
        SET meeting_time = EXCLUDED.meeting_time,
            duration_minutes = EXCLUDED.duration_minutes,
            mode = EXCLUDED.mode,
            location = EXCLUDED.location,
            meeting_link = EXCLUDED.meeting_link,
            proposed_at = now();

        UPDATE public.skill_request
        SET status = 'accepted'
        WHERE requestid = p_requestid;

        INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
        VALUES (v_req_sid, 'request_accepted', p_requestid, false, now());

        INSERT INTO public.email_outbox (requestid, kind, to_studentid, payload, status, attempts, created_at)
        VALUES (
            p_requestid,
            'request_accepted',
            v_req_sid,
            jsonb_build_object(
                'kind', 'request_accepted',
                'requestid', p_requestid,
                'provider_name', v_prov_name,
                'skillname', v_sk.skillname,
                'meeting_time', p_meeting_time,
                'duration_minutes', p_duration_minutes,
                'mode', p_mode,
                'location', v_loc,
                'meeting_link', v_link
            ),
            'queued',
            0,
            now()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
