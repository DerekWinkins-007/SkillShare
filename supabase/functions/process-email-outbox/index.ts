// supabase/functions/process-email-outbox/index.ts
// Deno TypeScript Edge Function for processing queued emails in email_outbox via Resend API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';
import { renderEmail } from '../_shared/emailTemplates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let requestid: number | null = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (typeof body?.requestid === 'number') {
          requestid = body.requestid;
        }
      } catch {
        // empty body ok
      }
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const mailFrom = Deno.env.get('MAIL_FROM');

    if (!resendApiKey || !mailFrom) {
      return new Response(
        JSON.stringify({
          error: 'Configuration missing: RESEND_API_KEY and MAIL_FROM environment variables must be configured on the server.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Atomically claim rows via RPC claim_outbox_emails (FOR UPDATE SKIP LOCKED)
    const { data: claimed, error: claimError } = await supabaseAdmin.rpc('claim_outbox_emails', {
      p_batch_size: 50,
      p_requestid: requestid,
    });

    if (claimError) {
      return new Response(JSON.stringify({ error: claimError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const item of (claimed ?? [])) {
      try {
        // 1. Render subject, html, and text using canonical shared templates
        const rendered = renderEmail(item.payload);

        // 2. Resolve recipient auth_id from app_user via to_studentid
        const { data: userRow, error: userRowError } = await supabaseAdmin
          .from('app_user')
          .select('auth_id')
          .eq('studentid', item.to_studentid)
          .maybeSingle();

        if (userRowError || !userRow?.auth_id) {
          throw new Error(`No app_user found for studentid ${item.to_studentid}`);
        }

        // 3. Resolve login email strictly from auth.users via service role
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userRow.auth_id);
        if (userError || !userData?.user?.email) {
          throw new Error(`Failed to get login email for auth_id ${userRow.auth_id}: ${userError?.message}`);
        }

        const loginEmail = userData.user.email;

        // 4. Send via Resend REST API (Authorization: Bearer RESEND_API_KEY, To: loginEmail only)
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: mailFrom,
            to: [loginEmail],
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          }),
        });

        if (!resendRes.ok) {
          const errText = await resendRes.text();
          throw new Error(`Resend API error (${resendRes.status}): ${errText}`);
        }

        // 5. Mark as sent on success
        await supabaseAdmin
          .from('email_outbox')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('emailid', item.emailid);

        sentCount++;
      } catch (err: unknown) {
        const errorMsg = String(err).slice(0, 500);
        console.error(`[EMAIL ERROR] Email ID ${item.emailid}: ${errorMsg}`);

        await supabaseAdmin
          .from('email_outbox')
          .update({
            status: 'failed',
            last_error: errorMsg,
          })
          .eq('emailid', item.emailid);

        failedCount++;
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, failed: failedCount }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const errorMsg = String(err).slice(0, 500);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
