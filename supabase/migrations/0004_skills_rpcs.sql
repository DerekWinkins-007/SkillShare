-- 0004_skills_rpcs.sql
-- SkillShare: Skills, Providers, and Proposals RPCs

-- 1. RPC: list_skill_providers
CREATE OR REPLACE FUNCTION public.list_skill_providers(p_skillid integer)
RETURNS jsonb AS $$
DECLARE
    v_my_sid integer;
    v_res jsonb;
BEGIN
    v_my_sid := public.my_studentid();

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'studentid', st.studentid,
        'fname', COALESCE(st.fname, ''),
        'lname', COALESCE(st.lname, ''),
        'dept', COALESCE(st.dept, ''),
        'year', COALESCE(st.year, 1),
        'avg_rating', stats.avg_rating,
        'feedback_count', stats.feedback_count
    ) ORDER BY stats.avg_rating DESC NULLS LAST, st.fname ASC), '[]'::jsonb)
    INTO v_res
    FROM public.studenthas_skill shs
    JOIN public.student st ON st.studentid = shs.studentid
    LEFT JOIN LATERAL (
        SELECT
            ROUND(AVG(rf.rating)::numeric, 1) AS avg_rating,
            COUNT(rf.feedbackid)::integer AS feedback_count
        FROM public.student_receives_feedback rf
        WHERE rf.studentid = st.studentid
    ) stats ON true
    WHERE shs.skillid = p_skillid
      AND (v_my_sid IS NULL OR st.studentid <> v_my_sid)
      AND public.is_profile_complete(st.studentid);

    RETURN v_res;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. RPC: list_my_skills
CREATE OR REPLACE FUNCTION public.list_my_skills()
RETURNS jsonb AS $$
DECLARE
    v_sid integer;
    v_res jsonb;
BEGIN
    v_sid := public.my_studentid();
    IF v_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'skillid', s.skillid,
        'skillname', s.skillname,
        'categoryid', s.categoryid,
        'categoryname', c.categoryname
    ) ORDER BY s.skillname ASC), '[]'::jsonb)
    INTO v_res
    FROM public.studenthas_skill shs
    JOIN public.skill s ON s.skillid = shs.skillid
    JOIN public.category c ON c.categoryid = s.categoryid
    WHERE shs.studentid = v_sid;

    RETURN v_res;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. RPC: add_my_skill
CREATE OR REPLACE FUNCTION public.add_my_skill(p_skillid integer)
RETURNS void AS $$
DECLARE
    v_sid integer;
BEGIN
    v_sid := public.my_studentid();
    IF v_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.skill WHERE skillid = p_skillid) THEN
        RAISE EXCEPTION 'SKILL_NOT_FOUND';
    END IF;

    INSERT INTO public.studenthas_skill (studentid, skillid)
    VALUES (v_sid, p_skillid)
    ON CONFLICT (studentid, skillid) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: remove_my_skill
CREATE OR REPLACE FUNCTION public.remove_my_skill(p_skillid integer)
RETURNS void AS $$
DECLARE
    v_sid integer;
BEGIN
    v_sid := public.my_studentid();
    IF v_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    DELETE FROM public.studenthas_skill
    WHERE studentid = v_sid AND skillid = p_skillid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: submit_category_request
CREATE OR REPLACE FUNCTION public.submit_category_request(
    p_proposed_name text,
    p_reason text DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
    v_sid integer;
    v_name varchar(30);
    v_reason varchar(200);
    v_id integer;
BEGIN
    v_sid := public.my_studentid();
    IF v_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF NOT public.is_profile_complete(v_sid) THEN
        RAISE EXCEPTION 'PROFILE_INCOMPLETE';
    END IF;

    v_name := trim(regexp_replace(p_proposed_name, '\s+', ' ', 'g'));
    IF length(v_name) = 0 OR length(v_name) > 30 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Name 1-30 chars';
    END IF;

    v_reason := NULLIF(trim(p_reason), '');
    IF v_reason IS NOT NULL AND length(v_reason) > 200 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Reason max 200 chars';
    END IF;

    -- Check if name taken
    IF EXISTS (SELECT 1 FROM public.category WHERE lower(categoryname) = lower(v_name))
       OR EXISTS (SELECT 1 FROM public.category_request WHERE status = 'pending' AND lower(proposed_name) = lower(v_name)) THEN
        RAISE EXCEPTION 'NAME_TAKEN';
    END IF;

    INSERT INTO public.category_request (studentid, proposed_name, reason, status, created_at)
    VALUES (v_sid, v_name, v_reason, 'pending', now())
    RETURNING catrequestid INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: submit_skill_proposal
CREATE OR REPLACE FUNCTION public.submit_skill_proposal(
    p_proposed_name text,
    p_categoryid integer,
    p_reason text DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
    v_sid integer;
    v_name varchar(30);
    v_reason varchar(200);
    v_id integer;
BEGIN
    v_sid := public.my_studentid();
    IF v_sid IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    IF NOT public.is_profile_complete(v_sid) THEN
        RAISE EXCEPTION 'PROFILE_INCOMPLETE';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.category WHERE categoryid = p_categoryid) THEN
        RAISE EXCEPTION 'CATEGORY_NOT_FOUND';
    END IF;

    v_name := trim(regexp_replace(p_proposed_name, '\s+', ' ', 'g'));
    IF length(v_name) = 0 OR length(v_name) > 30 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Name 1-30 chars';
    END IF;

    v_reason := NULLIF(trim(p_reason), '');
    IF v_reason IS NOT NULL AND length(v_reason) > 200 THEN
        RAISE EXCEPTION 'VALIDATION' USING DETAIL = 'Reason max 200 chars';
    END IF;

    -- Check if name taken
    IF EXISTS (SELECT 1 FROM public.skill WHERE lower(skillname) = lower(v_name))
       OR EXISTS (SELECT 1 FROM public.skill_proposal WHERE status = 'pending' AND lower(proposed_name) = lower(v_name)) THEN
        RAISE EXCEPTION 'NAME_TAKEN';
    END IF;

    INSERT INTO public.skill_proposal (studentid, proposed_name, categoryid, reason, status, created_at)
    VALUES (v_sid, v_name, p_categoryid, v_reason, 'pending', now())
    RETURNING skillproposalid INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
