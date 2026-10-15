-- 0005_admin_rpcs.sql
-- SkillShare: Admin Category/Skill CRUD, Review Queues, Rosters, and Stats RPCs

-- 1. admin_create_category
CREATE OR REPLACE FUNCTION public.admin_create_category(p_name text)
RETURNS jsonb AS $$
DECLARE
    v_name varchar(30);
    v_id integer;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    v_name := trim(regexp_replace(p_name, '\s+', ' ', 'g'));
    IF length(v_name) = 0 OR length(v_name) > 30 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Name 1-30 chars';
    END IF;

    IF EXISTS (SELECT 1 FROM public.category WHERE lower(categoryname) = lower(v_name)) THEN
        RAISE EXCEPTION 'NAME_TAKEN';
    END IF;

    INSERT INTO public.category (categoryname)
    VALUES (v_name)
    RETURNING categoryid INTO v_id;

    RETURN jsonb_build_object(
        'categoryid', v_id,
        'categoryname', v_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. admin_update_category
CREATE OR REPLACE FUNCTION public.admin_update_category(p_categoryid integer, p_name text)
RETURNS jsonb AS $$
DECLARE
    v_name varchar(30);
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.category WHERE categoryid = p_categoryid) THEN
        RAISE EXCEPTION 'CATEGORY_NOT_FOUND';
    END IF;

    v_name := trim(regexp_replace(p_name, '\s+', ' ', 'g'));
    IF length(v_name) = 0 OR length(v_name) > 30 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Name 1-30 chars';
    END IF;

    IF EXISTS (SELECT 1 FROM public.category WHERE lower(categoryname) = lower(v_name) AND categoryid <> p_categoryid) THEN
        RAISE EXCEPTION 'NAME_TAKEN';
    END IF;

    UPDATE public.category
    SET categoryname = v_name
    WHERE categoryid = p_categoryid;

    RETURN jsonb_build_object(
        'categoryid', p_categoryid,
        'categoryname', v_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. admin_delete_category
CREATE OR REPLACE FUNCTION public.admin_delete_category(p_categoryid integer)
RETURNS void AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.category WHERE categoryid = p_categoryid) THEN
        RAISE EXCEPTION 'CATEGORY_NOT_FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM public.skill WHERE categoryid = p_categoryid) THEN
        RAISE EXCEPTION 'CATEGORY_IN_USE';
    END IF;

    DELETE FROM public.category WHERE categoryid = p_categoryid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. admin_create_skill
CREATE OR REPLACE FUNCTION public.admin_create_skill(p_name text, p_categoryid integer)
RETURNS jsonb AS $$
DECLARE
    v_name varchar(30);
    v_id integer;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.category WHERE categoryid = p_categoryid) THEN
        RAISE EXCEPTION 'CATEGORY_NOT_FOUND';
    END IF;

    v_name := trim(regexp_replace(p_name, '\s+', ' ', 'g'));
    IF length(v_name) = 0 OR length(v_name) > 30 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Name 1-30 chars';
    END IF;

    IF EXISTS (SELECT 1 FROM public.skill WHERE lower(skillname) = lower(v_name)) THEN
        RAISE EXCEPTION 'NAME_TAKEN';
    END IF;

    INSERT INTO public.skill (skillname, categoryid)
    VALUES (v_name, p_categoryid)
    RETURNING skillid INTO v_id;

    RETURN jsonb_build_object(
        'skillid', v_id,
        'skillname', v_name,
        'categoryid', p_categoryid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. admin_update_skill
CREATE OR REPLACE FUNCTION public.admin_update_skill(p_skillid integer, p_name text, p_categoryid integer)
RETURNS jsonb AS $$
DECLARE
    v_name varchar(30);
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.skill WHERE skillid = p_skillid) THEN
        RAISE EXCEPTION 'SKILL_NOT_FOUND';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.category WHERE categoryid = p_categoryid) THEN
        RAISE EXCEPTION 'CATEGORY_NOT_FOUND';
    END IF;

    v_name := trim(regexp_replace(p_name, '\s+', ' ', 'g'));
    IF length(v_name) = 0 OR length(v_name) > 30 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Name 1-30 chars';
    END IF;

    IF EXISTS (SELECT 1 FROM public.skill WHERE lower(skillname) = lower(v_name) AND skillid <> p_skillid) THEN
        RAISE EXCEPTION 'NAME_TAKEN';
    END IF;

    UPDATE public.skill
    SET skillname = v_name,
        categoryid = p_categoryid
    WHERE skillid = p_skillid;

    RETURN jsonb_build_object(
        'skillid', p_skillid,
        'skillname', v_name,
        'categoryid', p_categoryid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. admin_delete_skill
CREATE OR REPLACE FUNCTION public.admin_delete_skill(p_skillid integer)
RETURNS void AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.skill WHERE skillid = p_skillid) THEN
        RAISE EXCEPTION 'SKILL_NOT_FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM public.studenthas_skill WHERE skillid = p_skillid)
       OR EXISTS (SELECT 1 FROM public.skill_request WHERE skillid = p_skillid) THEN
        RAISE EXCEPTION 'SKILL_IN_USE';
    END IF;

    DELETE FROM public.skill WHERE skillid = p_skillid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. admin_list_category_requests
CREATE OR REPLACE FUNCTION public.admin_list_category_requests(p_status text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    v_res jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'catrequestid', cr.catrequestid,
        'studentid', cr.studentid,
        'proposed_name', cr.proposed_name,
        'reason', cr.reason,
        'status', cr.status,
        'created_at', cr.created_at,
        'reviewed_at', cr.reviewed_at,
        'review_note', cr.review_note,
        'proposer_regno', COALESCE(su.username, ''),
        'proposer_name', trim(COALESCE(st.fname, '') || ' ' || COALESCE(st.lname, ''))
    ) ORDER BY cr.created_at DESC), '[]'::jsonb)
    INTO v_res
    FROM public.category_request cr
    JOIN public.student st ON st.studentid = cr.studentid
    LEFT JOIN public.signup su ON su.studentid = cr.studentid
    WHERE (p_status IS NULL OR p_status = 'all' OR cr.status = p_status);

    RETURN v_res;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 8. admin_review_category_request
CREATE OR REPLACE FUNCTION public.admin_review_category_request(
    p_catrequestid integer,
    p_approve boolean,
    p_note text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_cr public.category_request%ROWTYPE;
    v_note varchar(200);
    v_new_cat_id integer;
    v_admin_uid uuid := auth.uid();
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT * INTO v_cr FROM public.category_request WHERE catrequestid = p_catrequestid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Category request not found';
    END IF;

    IF v_cr.status <> 'pending' THEN
        RAISE EXCEPTION 'ALREADY_REVIEWED';
    END IF;

    v_note := NULLIF(trim(p_note), '');
    IF v_note IS NOT NULL AND length(v_note) > 200 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Note max 200 chars';
    END IF;

    IF p_approve THEN
        IF EXISTS (SELECT 1 FROM public.category WHERE lower(categoryname) = lower(v_cr.proposed_name)) THEN
            RAISE EXCEPTION 'NAME_TAKEN';
        END IF;

        INSERT INTO public.category (categoryname)
        VALUES (v_cr.proposed_name)
        RETURNING categoryid INTO v_new_cat_id;

        UPDATE public.category_request
        SET status = 'approved',
            reviewed_by = v_admin_uid,
            reviewed_at = now(),
            review_note = v_note
        WHERE catrequestid = p_catrequestid;

        INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
        VALUES (v_cr.studentid, 'category_request_approved', p_catrequestid, false, now());
    ELSE
        UPDATE public.category_request
        SET status = 'rejected',
            reviewed_by = v_admin_uid,
            reviewed_at = now(),
            review_note = v_note
        WHERE catrequestid = p_catrequestid;

        INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
        VALUES (v_cr.studentid, 'category_request_rejected', p_catrequestid, false, now());
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. admin_list_skill_proposals
CREATE OR REPLACE FUNCTION public.admin_list_skill_proposals(p_status text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    v_res jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'skillproposalid', sp.skillproposalid,
        'studentid', sp.studentid,
        'proposed_name', sp.proposed_name,
        'categoryid', sp.categoryid,
        'categoryname', c.categoryname,
        'reason', sp.reason,
        'status', sp.status,
        'created_at', sp.created_at,
        'reviewed_at', sp.reviewed_at,
        'review_note', sp.review_note,
        'proposer_regno', COALESCE(su.username, ''),
        'proposer_name', trim(COALESCE(st.fname, '') || ' ' || COALESCE(st.lname, ''))
    ) ORDER BY sp.created_at DESC), '[]'::jsonb)
    INTO v_res
    FROM public.skill_proposal sp
    JOIN public.student st ON st.studentid = sp.studentid
    JOIN public.category c ON c.categoryid = sp.categoryid
    LEFT JOIN public.signup su ON su.studentid = sp.studentid
    WHERE (p_status IS NULL OR p_status = 'all' OR sp.status = p_status);

    RETURN v_res;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 10. admin_review_skill_proposal
CREATE OR REPLACE FUNCTION public.admin_review_skill_proposal(
    p_skillproposalid integer,
    p_approve boolean,
    p_note text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_sp public.skill_proposal%ROWTYPE;
    v_note varchar(200);
    v_new_skill_id integer;
    v_admin_uid uuid := auth.uid();
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT * INTO v_sp FROM public.skill_proposal WHERE skillproposalid = p_skillproposalid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Skill proposal not found';
    END IF;

    IF v_sp.status <> 'pending' THEN
        RAISE EXCEPTION 'ALREADY_REVIEWED';
    END IF;

    v_note := NULLIF(trim(p_note), '');
    IF v_note IS NOT NULL AND length(v_note) > 200 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Note max 200 chars';
    END IF;

    IF p_approve THEN
        IF NOT EXISTS (SELECT 1 FROM public.category WHERE categoryid = v_sp.categoryid) THEN
            RAISE EXCEPTION 'CATEGORY_NOT_FOUND';
        END IF;

        IF EXISTS (SELECT 1 FROM public.skill WHERE lower(skillname) = lower(v_sp.proposed_name)) THEN
            RAISE EXCEPTION 'NAME_TAKEN';
        END IF;

        INSERT INTO public.skill (skillname, categoryid)
        VALUES (v_sp.proposed_name, v_sp.categoryid)
        RETURNING skillid INTO v_new_skill_id;

        UPDATE public.skill_proposal
        SET status = 'approved',
            reviewed_by = v_admin_uid,
            reviewed_at = now(),
            review_note = v_note
        WHERE skillproposalid = p_skillproposalid;

        INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
        VALUES (v_sp.studentid, 'skill_proposal_approved', p_skillproposalid, false, now());
    ELSE
        UPDATE public.skill_proposal
        SET status = 'rejected',
            reviewed_by = v_admin_uid,
            reviewed_at = now(),
            review_note = v_note
        WHERE skillproposalid = p_skillproposalid;

        INSERT INTO public.notification (studentid, kind, ref_id, is_read, created_at)
        VALUES (v_sp.studentid, 'skill_proposal_rejected', p_skillproposalid, false, now());
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. admin_list_students
CREATE OR REPLACE FUNCTION public.admin_list_students()
RETURNS jsonb AS $$
DECLARE
    v_res jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'studentid', st.studentid,
        'regno', COALESCE(su.username, ''),
        'fname', st.fname,
        'lname', st.lname,
        'dept', st.dept,
        'year', st.year,
        'profile_complete', public.is_profile_complete(st.studentid)
    ) ORDER BY st.studentid ASC), '[]'::jsonb)
    INTO v_res
    FROM public.student st
    LEFT JOIN public.signup su ON su.studentid = st.studentid;

    RETURN v_res;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 12. admin_list_requests
CREATE OR REPLACE FUNCTION public.admin_list_requests(p_status text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    v_res jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'requestid', sr.requestid,
        'requestdate', sr.requestdate,
        'status', sr.status,
        'skillname', sk.skillname,
        'requester_name', trim(COALESCE(req_st.fname, '') || ' ' || COALESCE(req_st.lname, '')),
        'provider_name', trim(COALESCE(prov_st.fname, '') || ' ' || COALESCE(prov_st.lname, '')),
        'meeting_time', rm.meeting_time
    ) ORDER BY sr.requestid DESC), '[]'::jsonb)
    INTO v_res
    FROM public.skill_request sr
    JOIN public.skill sk ON sk.skillid = sr.skillid
    JOIN public.student_sends_skill_request req ON req.requestid = sr.requestid
    JOIN public.student req_st ON req_st.studentid = req.studentid
    JOIN public.student_receives_skill_request prov ON prov.requestid = sr.requestid
    JOIN public.student prov_st ON prov_st.studentid = prov.studentid
    LEFT JOIN public.request_meeting rm ON rm.requestid = sr.requestid
    WHERE (p_status IS NULL OR p_status = 'all' OR sr.status = p_status);

    RETURN v_res;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 13. get_admin_stats
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb AS $$
DECLARE
    v_total_students integer;
    v_total_cats integer;
    v_total_skills integer;
    v_pending_cat integer;
    v_pending_skill integer;
    v_avg_rating numeric;
    v_status_json jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT COUNT(*)::integer INTO v_total_students FROM public.student;
    SELECT COUNT(*)::integer INTO v_total_cats FROM public.category;
    SELECT COUNT(*)::integer INTO v_total_skills FROM public.skill;

    SELECT COUNT(*)::integer INTO v_pending_cat
    FROM public.category_request WHERE status = 'pending';

    SELECT COUNT(*)::integer INTO v_pending_skill
    FROM public.skill_proposal WHERE status = 'pending';

    SELECT ROUND(AVG(rating)::numeric, 1) INTO v_avg_rating
    FROM public.student_receives_feedback;

    SELECT jsonb_build_object(
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'accepted', COUNT(*) FILTER (WHERE status = 'accepted'),
        'confirmed', COUNT(*) FILTER (WHERE status = 'confirmed'),
        'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'completed', COUNT(*) FILTER (WHERE status = 'completed')
    ) INTO v_status_json
    FROM public.skill_request;

    RETURN jsonb_build_object(
        'total_students', v_total_students,
        'total_categories', v_total_cats,
        'total_skills', v_total_skills,
        'requests_by_status', v_status_json,
        'pending_category_requests', v_pending_cat,
        'pending_skill_proposals', v_pending_skill,
        'avg_rating', v_avg_rating
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
