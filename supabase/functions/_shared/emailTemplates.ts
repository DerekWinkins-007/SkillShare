export type EmailKind =
  | 'request_received'
  | 'request_accepted'
  | 'request_rejected'
  | 'request_confirmed'
  | 'request_cancelled';

export interface EmailPayloadCounterpart {
  fname: string;
  lname: string;
  dept: string;
  year: number;
  phone1: string;
  phone2?: string | null;
  email1: string;
  email2?: string | null;
}

export interface RequestConfirmedPayload {
  kind: 'request_confirmed';
  requestid: number;
  skillname: string;
  categoryname: string;
  recipient_role: 'learner' | 'teacher';
  meeting_time: string;
  duration_minutes: number;
  mode: 'online' | 'offline';
  location: string | null;
  meeting_link: string | null;
  cancel_deadline: string;
  counterpart: EmailPayloadCounterpart;
}

export interface RequestCancelledPayload {
  kind: 'request_cancelled';
  requestid?: number;
  cancelled_by_fname: string;
  skillname: string;
  meeting_time?: string | null;
  reason: string;
}

export interface RequestReceivedPayload {
  kind: 'request_received';
  requestid?: number;
  requester_name: string;
  skillname: string;
}

export interface RequestAcceptedPayload {
  kind: 'request_accepted';
  requestid?: number;
  provider_name: string;
  skillname: string;
  meeting_time: string;
  duration_minutes: number;
  mode: 'online' | 'offline';
  location?: string | null;
  meeting_link?: string | null;
}

export interface RequestRejectedPayload {
  kind: 'request_rejected';
  requestid?: number;
  provider_name: string;
  skillname: string;
}

export type EmailPayload =
  | RequestConfirmedPayload
  | RequestCancelledPayload
  | RequestReceivedPayload
  | RequestAcceptedPayload
  | RequestRejectedPayload;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatIST(dateStr: string | Date): string {
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

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function renderEmail(payload: EmailPayload): RenderedEmail {
  switch (payload.kind) {
    case 'request_confirmed': {
      const formattedTime = formatIST(payload.meeting_time);
      const modeLabel = capitalize(payload.mode);
      const subject = `SkillShare: ${payload.skillname} session confirmed for ${formattedTime} (${modeLabel})`;

      const roleLineText =
        payload.recipient_role === 'learner'
          ? 'You are learning this skill.'
          : 'You are teaching this skill.';
      const roleLineHtml = `<p>${escapeHtml(roleLineText)}</p>`;

      const deadlineIST = formatIST(payload.cancel_deadline);
      const cancelSentence = `You can cancel until ${deadlineIST}.`;

      const counterpart = payload.counterpart;
      const counterpartName = `${counterpart.fname} ${counterpart.lname}`.trim();
      const phone2Text = counterpart.phone2 ? `, Phone 2: ${counterpart.phone2}` : '';
      const email2Text = counterpart.email2 ? `, Email 2: ${counterpart.email2}` : '';

      const locationOrLinkText =
        payload.mode === 'offline'
          ? `Location: ${payload.location ?? 'TBD'}`
          : `Meeting Link: ${payload.meeting_link ?? 'None provided'}`;

      const locationOrLinkHtml =
        payload.mode === 'offline'
          ? `<li><strong>Location:</strong> ${escapeHtml(payload.location ?? 'TBD')}</li>`
          : `<li><strong>Meeting Link:</strong> ${
              payload.meeting_link
                ? `<a href="${escapeHtml(payload.meeting_link)}">${escapeHtml(payload.meeting_link)}</a>`
                : 'None provided'
            }</li>`;

      const html = `
<div>
  <h2>Session Details</h2>
  <ul>
    <li><strong>Date &amp; Time:</strong> ${escapeHtml(formattedTime)}</li>
    <li><strong>Duration:</strong> ${escapeHtml(payload.duration_minutes)} minutes</li>
    <li><strong>Mode:</strong> ${escapeHtml(modeLabel)}</li>
    ${locationOrLinkHtml}
  </ul>
  <p><strong>Skill:</strong> ${escapeHtml(payload.skillname)} (${escapeHtml(payload.categoryname)})</p>
  ${roleLineHtml}
  <h3>Counterpart Information</h3>
  <ul>
    <li><strong>Name:</strong> ${escapeHtml(counterpartName)}</li>
    <li><strong>Department:</strong> ${escapeHtml(counterpart.dept)}</li>
    <li><strong>Year:</strong> ${escapeHtml(counterpart.year)}</li>
    <li><strong>Phone 1:</strong> ${escapeHtml(counterpart.phone1)}</li>
    ${counterpart.phone2 ? `<li><strong>Phone 2:</strong> ${escapeHtml(counterpart.phone2)}</li>` : ''}
    <li><strong>Email 1:</strong> ${escapeHtml(counterpart.email1)}</li>
    ${counterpart.email2 ? `<li><strong>Email 2:</strong> ${escapeHtml(counterpart.email2)}</li>` : ''}
  </ul>
  <p>${escapeHtml(cancelSentence)}</p>
</div>`.trim();

      const text = `
Session Details:
- Date & Time: ${formattedTime}
- Duration: ${payload.duration_minutes} minutes
- Mode: ${modeLabel}
- ${locationOrLinkText}

Skill: ${payload.skillname} (${payload.categoryname})
${roleLineText}

Counterpart Information:
- Name: ${counterpartName}
- Department: ${counterpart.dept}
- Year: ${counterpart.year}
- Phone 1: ${counterpart.phone1}${phone2Text}
- Email 1: ${counterpart.email1}${email2Text}

${cancelSentence}
`.trim();

      return { subject, html, text };
    }

    case 'request_cancelled': {
      const scheduledTimeStr = payload.meeting_time ? formatIST(payload.meeting_time) : 'Not scheduled';
      const subject = `SkillShare: Request for ${payload.skillname} cancelled`;
      const html = `
<div>
  <p><strong>${escapeHtml(payload.cancelled_by_fname)}</strong> has cancelled the session for <strong>${escapeHtml(payload.skillname)}</strong>.</p>
  <p><strong>Scheduled Time:</strong> ${escapeHtml(scheduledTimeStr)}</p>
  <p><strong>Reason:</strong> ${escapeHtml(payload.reason)}</p>
</div>`.trim();

      const text = `
${payload.cancelled_by_fname} has cancelled the session for ${payload.skillname}.
Scheduled Time: ${scheduledTimeStr}
Reason: ${payload.reason}
`.trim();

      return { subject, html, text };
    }

    case 'request_received': {
      const subject = `SkillShare: New request received for ${payload.skillname}`;
      const html = `
<div>
  <p>You have received a new skill request from <strong>${escapeHtml(payload.requester_name)}</strong> for <strong>${escapeHtml(payload.skillname)}</strong>.</p>
  <p>Please open SkillShare to accept and propose a slot or reject the request.</p>
</div>`.trim();

      const text = `
You have received a new skill request from ${payload.requester_name} for ${payload.skillname}.
Please open SkillShare to accept and propose a slot or reject the request.
`.trim();

      return { subject, html, text };
    }

    case 'request_accepted': {
      const formattedTime = formatIST(payload.meeting_time);
      const modeLabel = capitalize(payload.mode);
      const subject = `SkillShare: Request accepted for ${payload.skillname}`;

      const locationOrLinkHtml =
        payload.mode === 'offline'
          ? `<li><strong>Location:</strong> ${escapeHtml(payload.location ?? 'TBD')}</li>`
          : `<li><strong>Meeting Link:</strong> ${
              payload.meeting_link
                ? `<a href="${escapeHtml(payload.meeting_link)}">${escapeHtml(payload.meeting_link)}</a>`
                : 'None provided'
            }</li>`;

      const locationOrLinkText =
        payload.mode === 'offline'
          ? `Location: ${payload.location ?? 'TBD'}`
          : `Meeting Link: ${payload.meeting_link ?? 'None provided'}`;

      const html = `
<div>
  <p><strong>${escapeHtml(payload.provider_name)}</strong> has accepted your request for <strong>${escapeHtml(payload.skillname)}</strong> and proposed the following meeting slot:</p>
  <ul>
    <li><strong>Date &amp; Time:</strong> ${escapeHtml(formattedTime)}</li>
    <li><strong>Duration:</strong> ${escapeHtml(payload.duration_minutes)} minutes</li>
    <li><strong>Mode:</strong> ${escapeHtml(modeLabel)}</li>
    ${locationOrLinkHtml}
  </ul>
  <p>You must agree to this slot in the app to confirm the session.</p>
</div>`.trim();

      const text = `
${payload.provider_name} has accepted your request for ${payload.skillname} and proposed the following meeting slot:
- Date & Time: ${formattedTime}
- Duration: ${payload.duration_minutes} minutes
- Mode: ${modeLabel}
- ${locationOrLinkText}

You must agree to this slot in the app to confirm the session.
`.trim();

      return { subject, html, text };
    }

    case 'request_rejected': {
      const subject = `SkillShare: Request declined for ${payload.skillname}`;
      const html = `
<div>
  <p><strong>${escapeHtml(payload.provider_name)}</strong> has declined your request for <strong>${escapeHtml(payload.skillname)}</strong>.</p>
</div>`.trim();

      const text = `
${payload.provider_name} has declined your request for ${payload.skillname}.
`.trim();

      return { subject, html, text };
    }
  }
}
