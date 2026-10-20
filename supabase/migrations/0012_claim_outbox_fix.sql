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
        WHERE ((eo.status = 'queued' AND COALESCE(eo.attempts, 0) = 0)
            OR (eo.status = 'failed' AND COALESCE(eo.attempts, 0) < 3))
          AND (p_requestid IS NULL OR eo.requestid = p_requestid)
        ORDER BY eo.created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.email_outbox eo
    SET attempts = COALESCE(eo.attempts, 0) + 1
    FROM cte
    WHERE eo.emailid = cte.emailid
    RETURNING eo.emailid, eo.requestid, eo.kind, eo.to_studentid, eo.payload, eo.attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;