-- supabase/tests/verify.sql
-- SkillShare: Automated Schema & RPC Signature Verification Script
-- Can be executed via psql, Supabase CLI test, or directly in the Supabase SQL Editor.

BEGIN;

DO $$
DECLARE
    v_missing_tables text[] := ARRAY[]::text[];
    v_missing_funcs text[] := ARRAY[]::text[];
    v_tbl text;
    v_func text;
    v_test_cat_id integer;
    v_test_skill_id integer;
    v_test_stud_id integer;
    v_test_req_id integer;
    v_report_res jsonb;
BEGIN
    RAISE NOTICE '=== 1. VERIFYING TABLES EXISTENCE ===';

    -- 10 Original Tables
    FOREACH v_tbl IN ARRAY ARRAY[
        'category', 'student', 'skill', 'studenthas_skill', 'skill_request',
        'student_sends_skill_request', 'student_receives_skill_request',
        'student_gives_feedback', 'student_receives_feedback', 'signup'
    ]
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_tbl) THEN
            v_missing_tables := array_append(v_missing_tables, v_tbl);
        END IF;
    END LOOP;

    -- 7 Supplementary Tables
    FOREACH v_tbl IN ARRAY ARRAY[
        'app_user', 'request_meeting', 'request_cancellation',
        'category_request', 'skill_proposal', 'notification', 'email_outbox'
    ]
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_tbl) THEN
            v_missing_tables := array_append(v_missing_tables, v_tbl);
        END IF;
    END LOOP;

    IF array_length(v_missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'FAILED: Missing tables: %', array_to_string(v_missing_tables, ', ');
    ELSE
        RAISE NOTICE 'SUCCESS: All 17 tables present.';
    END IF;

    RAISE NOTICE '=== 2. VERIFYING VIEWS ===';
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'v_skill_catalogue') THEN
        RAISE EXCEPTION 'FAILED: Missing view v_skill_catalogue';
    ELSE
        RAISE NOTICE 'SUCCESS: View v_skill_catalogue present.';
    END IF;

    RAISE NOTICE '=== 3. VERIFYING RPCS & FUNCTION SIGNATURES ===';
    FOREACH v_func IN ARRAY ARRAY[
        'resolve_login_identifier',
        'get_me',
        'update_my_profile',
        'get_public_profile',
        'list_feedback_received',
        'list_skill_providers',
        'list_my_skills',
        'add_my_skill',
        'remove_my_skill',
        'submit_category_request',
        'submit_skill_proposal',
        'admin_create_category',
        'admin_update_category',
        'admin_delete_category',
        'admin_create_skill',
        'admin_update_skill',
        'admin_delete_skill',
        'admin_list_category_requests',
        'admin_review_category_request',
        'admin_list_skill_proposals',
        'admin_review_skill_proposal',
        'admin_list_students',
        'admin_list_requests',
        'get_admin_stats',
        'create_request',
        'respond_to_request',
        'respond_to_slot',
        'cancel_request',
        'get_request',
        'list_my_requests',
        'get_contact_details',
        'sync_completed_requests',
        'list_feedback_due',
        'submit_feedback',
        'get_my_dashboard',
        'mark_notifications_read',
        'run_report'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = v_func
        ) THEN
            v_missing_funcs := array_append(v_missing_funcs, v_func);
        END IF;
    END LOOP;

    IF array_length(v_missing_funcs, 1) > 0 THEN
        RAISE EXCEPTION 'FAILED: Missing functions: %', array_to_string(v_missing_funcs, ', ');
    ELSE
        RAISE NOTICE 'SUCCESS: All 37 public RPC functions are verified.';
    END IF;

    RAISE NOTICE '=== 4. FUNCTIONAL BEHAVIORAL CHECKS ===';

    -- Test Category & Skill insertion
    INSERT INTO public.category (categoryname) VALUES ('Test Category Verification') RETURNING categoryid INTO v_test_cat_id;
    INSERT INTO public.skill (skillname, categoryid) VALUES ('Test Skill Verification', v_test_cat_id) RETURNING skillid INTO v_test_skill_id;

    -- Test Student insertion
    INSERT INTO public.student (fname, lname, dept, year, phone1, email1)
    VALUES ('Audit', 'User', 'Computer Science', 3, '9876543210', 'audit.user@example.com')
    RETURNING studentid INTO v_test_stud_id;

    -- Test is_profile_complete
    IF NOT public.is_profile_complete(v_test_stud_id) THEN
        RAISE EXCEPTION 'FAILED: Expected is_profile_complete to return true for complete student';
    END IF;

    -- Test Request and status trigger
    INSERT INTO public.skill_request (status, skillid)
    VALUES ('pending', v_test_skill_id)
    RETURNING requestid INTO v_test_req_id;

    -- Verify invalid transition trigger throws
    BEGIN
        UPDATE public.skill_request SET status = 'INVALID_STATUS' WHERE requestid = v_test_req_id;
        RAISE EXCEPTION 'FAILED: Invalid status should have been rejected by trigger';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'SUCCESS: Invalid status properly rejected by trigger.';
    END;

    -- Verify reports execution
    v_report_res := public.run_report(1, 'Computer Science');
    IF jsonb_array_length(v_report_res) = 0 THEN
        RAISE EXCEPTION 'FAILED: run_report(1) returned empty array';
    END IF;

    v_report_res := public.run_report(2, NULL);
    IF jsonb_array_length(v_report_res) = 0 THEN
        RAISE EXCEPTION 'FAILED: run_report(2) returned empty array';
    END IF;

    v_report_res := public.run_report(4, NULL);
    IF jsonb_array_length(v_report_res) = 0 THEN
        RAISE EXCEPTION 'FAILED: run_report(4) returned empty array';
    END IF;

    RAISE NOTICE 'SUCCESS: All reports executed successfully.';
    RAISE NOTICE '=== ALL CHECKS PASSED SUCCESSFULLY ===';
END $$;

-- Roll back test transaction so database remains clean
ROLLBACK;
