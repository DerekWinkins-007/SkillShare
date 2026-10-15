// supabase/functions/process-email-outbox/index.ts
// Deno TypeScript Edge Function for processing queued emails in email_outbox

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatIST(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
  return `${formatter.format(d)} IST`;
}

function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface OutboxPayload {
  kind: string;
  skillname?: string;
  categoryname?: string;
  meeting_time?: string;
  cancel_deadline?: string;
  mode?: string;
  location?: string | null;
  meeting_link?: string | null;
  requester_name?: string;
  provider_name?: string;
  cancelled_by_fname?: string;
  reason?: string;
  counterpart?: {
    fname: string;
    lname: string;
    dept: string;
    year: number;
    phone1: string;
    phone2?: string | null;
    email1: string;
    email2?: string | null;
  };
}

function renderEmail(payload: OutboxPayload): { subject: string; html: string; text: string } {
  switch (payload.kind) {
    case 'request_confirmed': {
      const formattedTime = formatIST(payload.meeting_time);
      const modeLabel = payload.mode.charAt(0).toUpperCase() + payload.mode.slice(1);
      const subject = `SkillShare: ${payload.skillname} session confirmed for ${formattedTime} (${modeLabel})`;
      const deadlineIST = formatIST(payload.cancel_deadline);
      const cp = payload.counterpart;

      const html = `
<div>
  <h2>Session Confirmed: ${escapeHtml(payload.skillname)} (${escapeHtml(payload.categoryname)})</h2>
  <p><strong>Time:</strong> ${escapeHtml(formattedTime)}</p>
  <p><strong>Mode:</strong> ${escapeHtml(modeLabel)}</p>
  <p><strong>${payload.mode === 'offline' ? 'Location' : 'Meeting Link'}:</strong> ${escapeHtml(payload.mode === 'offline' ? payload.location : (payload.meeting_link ?? 'None'))}</p>
  <p>You can cancel until ${escapeHtml(deadlineIST)}.</p>
  <h3>Counterpart Information</h3>
  <p><strong>Name:</strong> ${escapeHtml(cp.fname)} ${escapeHtml(cp.lname)} (${escapeHtml(cp.dept)}, Year ${escapeHtml(cp.year)})</p>
  <p><strong>Phone:</strong> ${escapeHtml(cp.phone1)} ${cp.phone2 ? `| ${escapeHtml(cp.phone2)}` : ''}</p>
  <p><strong>Email:</strong> ${escapeHtml(cp.email1)} ${cp.email2 ? `| ${escapeHtml(cp.email2)}` : ''}</p>
</div>`;

      const text = `Session Confirmed: ${payload.skillname}\nTime: ${formattedTime}\nCounterpart: ${cp.fname} ${cp.lname}\nPhone: ${cp.phone1}\nEmail: ${cp.email1}`;
      return { subject, html, text };
    }

    case 'request_received': {
      const subject = `SkillShare: New session request for ${payload.skillname}`;
      const text = `${payload.requester_name} has requested a learning session for ${payload.skillname}. Please log in to accept or decline.`;
      const html = `<p>${escapeHtml(text)}</p>`;
      return { subject, html, text };
    }

    case 'request_accepted': {
      const subject = `SkillShare: Your request for ${payload.skillname} has been accepted`;
      const timeStr = formatIST(payload.meeting_time);
      const text = `${payload.provider_name} has accepted your request and proposed a slot at ${timeStr}. Please log in to confirm or decline.`;
      const html = `<p>${escapeHtml(text)}</p>`;
      return { subject, html, text };
    }

    case 'request_rejected': {
      const subject = `SkillShare: Request for ${payload.skillname} was declined`;
      const text = `Your session request for ${payload.skillname} could not be scheduled.`;
      const html = `<p>${escapeHtml(text)}</p>`;
      return { subject, html, text };
    }

    case 'request_cancelled': {
      const subject = `SkillShare: Session for ${payload.skillname} has been cancelled`;
      const text = `${payload.cancelled_by_fname} cancelled the session for ${payload.skillname}. Reason: ${payload.reason}`;
      const html = `<p>${escapeHtml(text)}</p>`;
      return { subject, html, text };
    }

    default:
      return {
        subject: 'SkillShare Notification',
        html: `<p>New notification</p>`,
        text: 'New notification',
      };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let requestid: number | undefined;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        requestid = body?.requestid;
      } catch {
        // empty body ok
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabaseAdmin
      .from('email_outbox')
      .select('*, student:to_studentid(email1, email2)')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(50);

    if (requestid !== undefined) {
      query = query.eq('requestid', requestid);
    }

    const { data: queued, error: fetchError } = await query;
    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const item of queued ?? []) {
      try {
        const rendered = renderEmail(item.payload);
        const toEmails: string[] = [];
        if (item.student?.email1) toEmails.push(item.student.email1);
        if (item.student?.email2) toEmails.push(item.student.email2);

        // If email service provider configured (e.g. Resend), send here.
        // In local/sandbox environments, log to console.
        console.log(`[EMAIL DISPATCH] To: ${toEmails.join(', ')} | Subject: ${rendered.subject}`);

        await supabaseAdmin
          .from('email_outbox')
          .update({
            status: 'sent',
            attempts: (item.attempts ?? 0) + 1,
            sent_at: new Date().toISOString(),
          })
          .eq('emailid', item.emailid);

        sentCount++;
      } catch (err: unknown) {
        await supabaseAdmin
          .from('email_outbox')
          .update({
            status: 'failed',
            attempts: (item.attempts ?? 0) + 1,
            last_error: String(err),
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
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
