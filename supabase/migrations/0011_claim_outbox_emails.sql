-- 0011_claim_outbox_emails.sql
-- SkillShare: Concurrency-safe atomic claim RPC for email_outbox processing

CREATE OR REPLACE FUNCTION public.claim_outbox_emails(
    p_batch_size integer DEFAULT 50,
    p_requestid integer DEFAULT NULL
)
RETURNS TABLE (
    emailid integer,
    requestid integer,
    kind varchar(40),
    to_studentid integer,
    payload jsonb,
    attempts integer
) AS $$
BEGIN
    RETURN QUERY
    WITH cte AS (
        SELECT eo.emailid
        FROM public.email_outbox eo
        WHERE (eo.status = 'queued' OR (eo.status = 'failed' AND eo.attempts < 3))
          AND (p_requestid IS NULL OR eo.requestid = p_requestid)
        ORDER BY eo.created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.email_outbox eo
    SET attempts = eo.attempts + 1
    FROM cte
    WHERE eo.emailid = cte.emailid
    RETURNING
        eo.emailid,
        eo.requestid,
        eo.kind,
        eo.to_studentid,
        eo.payload,
        eo.attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict execution to service_role only
REVOKE EXECUTE ON FUNCTION public.claim_outbox_emails(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outbox_emails(integer, integer) TO service_role;
