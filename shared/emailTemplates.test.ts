import { describe, it, expect } from 'vitest';
import { renderEmail, escapeHtml, formatIST } from './emailTemplates';

describe('emailTemplates', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;');
    expect(escapeHtml('Tom & Jerry "Special" <script>')).toBe(
      'Tom &amp; Jerry &quot;Special&quot; &lt;script&gt;'
    );
  });

  it('formats dates in Asia/Kolkata with IST suffix', () => {
    const formatted = formatIST('2026-10-16T10:00:00.000Z');
    expect(formatted).toContain('IST');
    expect(formatted).toContain('2026');
  });

  it('renders request_confirmed with slot first, role line, counterpart, cancel sentence, and escaped HTML', () => {
    const rendered = renderEmail({
      kind: 'request_confirmed',
      requestid: 301,
      skillname: '<b>Python</b>',
      categoryname: 'Programming',
      recipient_role: 'learner',
      meeting_time: '2026-10-16T10:00:00.000Z',
      duration_minutes: 60,
      mode: 'offline',
      location: 'Room <101>',
      meeting_link: null,
      cancel_deadline: '2026-10-16T09:00:00.000Z',
      counterpart: {
        fname: '<Jane>',
        lname: 'Smith',
        dept: 'CSE',
        year: 3,
        phone1: '+919876543210',
        phone2: null,
        email1: 'jane@vit.ac.in',
        email2: null,
      },
    });

    expect(rendered.subject).toContain('<b>Python</b>');
    expect(rendered.subject).toContain('(Offline)');
    expect(rendered.html).toContain('&lt;b&gt;Python&lt;/b&gt;');
    expect(rendered.html).toContain('&lt;Jane&gt;');
    expect(rendered.html).toContain('&lt;101&gt;');
    expect(rendered.html).toContain('You are learning this skill.');
    expect(rendered.html).toContain('You can cancel until');
    expect(rendered.text).toContain('Session Details:');
    expect(rendered.text).toContain('Duration: 60 minutes');
    expect(rendered.text).toContain('Location: Room <101>');
  });

  it('renders request_cancelled with who cancelled, skill, time, and reason', () => {
    const rendered = renderEmail({
      kind: 'request_cancelled',
      requestid: 301,
      cancelled_by_fname: '<Bob>',
      skillname: 'Rust',
      meeting_time: '2026-10-16T10:00:00.000Z',
      reason: 'Sick with fever',
    });

    expect(rendered.html).toContain('&lt;Bob&gt;');
    expect(rendered.html).toContain('Rust');
    expect(rendered.html).toContain('Sick with fever');
    expect(rendered.text).toContain('<Bob> has cancelled');
  });

  it('renders request_received with requester name and skill', () => {
    const rendered = renderEmail({
      kind: 'request_received',
      requester_name: '<Alice>',
      skillname: 'SQL',
    });

    expect(rendered.html).toContain('&lt;Alice&gt;');
    expect(rendered.html).toContain('SQL');
    expect(rendered.text).toContain('<Alice>');
  });

  it('renders request_accepted with provider name, skill, and proposed slot block', () => {
    const rendered = renderEmail({
      kind: 'request_accepted',
      provider_name: '<Charlie>',
      skillname: 'Docker',
      meeting_time: '2026-10-16T12:00:00.000Z',
      duration_minutes: 45,
      mode: 'online',
      meeting_link: 'https://meet.google.com/test',
    });

    expect(rendered.html).toContain('&lt;Charlie&gt;');
    expect(rendered.html).toContain('Docker');
    expect(rendered.html).toContain('45 minutes');
    expect(rendered.html).toContain('https://meet.google.com/test');
    expect(rendered.text).toContain('You must agree to this slot in the app to confirm the session.');
  });

  it('renders request_rejected with provider name and skill', () => {
    const rendered = renderEmail({
      kind: 'request_rejected',
      provider_name: '<David>',
      skillname: 'Kubernetes',
    });

    expect(rendered.html).toContain('&lt;David&gt;');
    expect(rendered.html).toContain('Kubernetes');
    expect(rendered.text).toContain('<David> has declined');
  });

  describe('SQL jsonb_build_object payload fidelity', () => {
    it('renders SQL payload from create_request without undefined or null', () => {
      // Replicates SQL from 0006a_request_workflow.sql create_request:
      // jsonb_build_object('kind', 'request_received', 'requestid', v_new_req_id, 'requester_name', v_req_name, 'skillname', v_sk.skillname)
      const sqlPayload = {
        kind: 'request_received' as const,
        requestid: 101,
        requester_name: 'Jane Doe',
        skillname: 'TypeScript',
      };
      const rendered = renderEmail(sqlPayload);
      expect(rendered.text).not.toContain('undefined');
      expect(rendered.text).not.toContain('null');
      expect(rendered.html).not.toContain('undefined');
      expect(rendered.html).not.toContain('null');
    });

    it('renders SQL payload from respond_to_request (rejected) without undefined or null', () => {
      // Replicates SQL from 0006a_request_workflow.sql respond_to_request (reject):
      // jsonb_build_object('kind', 'request_rejected', 'requestid', p_requestid, 'provider_name', v_prov_name, 'skillname', v_sk.skillname)
      const sqlPayload = {
        kind: 'request_rejected' as const,
        requestid: 102,
        provider_name: 'John Smith',
        skillname: 'React',
      };
      const rendered = renderEmail(sqlPayload);
      expect(rendered.text).not.toContain('undefined');
      expect(rendered.text).not.toContain('null');
      expect(rendered.html).not.toContain('undefined');
      expect(rendered.html).not.toContain('null');
    });

    it('renders SQL payload from respond_to_request (accepted) with date/time/mode block and no undefined or null', () => {
      // Replicates SQL from 0006a_request_workflow.sql respond_to_request (accept):
      // jsonb_build_object('kind', 'request_accepted', 'requestid', p_requestid, 'provider_name', v_prov_name, 'skillname', v_sk.skillname, 'meeting_time', p_meeting_time, 'duration_minutes', p_duration_minutes, 'mode', p_mode, 'location', v_loc, 'meeting_link', v_link)
      const sqlPayload = {
        kind: 'request_accepted' as const,
        requestid: 103,
        provider_name: 'Alice Wonder',
        skillname: 'Python',
        meeting_time: '2026-10-25T14:00:00.000Z',
        duration_minutes: 60,
        mode: 'online' as const,
        location: null,
        meeting_link: 'https://meet.google.com/abc-defg-hij',
      };
      const rendered = renderEmail(sqlPayload);
      expect(rendered.text).not.toContain('undefined');
      expect(rendered.text).not.toContain('null');
      expect(rendered.html).not.toContain('undefined');
      expect(rendered.html).not.toContain('null');
      expect(rendered.text).toContain('Date & Time:');
      expect(rendered.text).toContain('Duration: 60 minutes');
      expect(rendered.text).toContain('Mode: Online');
      expect(rendered.text).toContain('Meeting Link: https://meet.google.com/abc-defg-hij');
    });

    it('renders SQL payload from respond_to_slot (confirmed) putting date, time, duration, mode and location/link FIRST', () => {
      // Replicates SQL from 0006b_request_workflow.sql respond_to_slot (agree):
      // jsonb_build_object('kind', 'request_confirmed', 'requestid', p_requestid, 'skillname', v_sk.skillname, 'categoryname', v_cat.categoryname, 'recipient_role', 'learner', 'meeting_time', v_rm.meeting_time, 'duration_minutes', v_rm.duration_minutes, 'mode', v_rm.mode, 'location', v_rm.location, 'meeting_link', v_rm.meeting_link, 'cancel_deadline', v_cancel_dl, 'counterpart', jsonb_build_object(...))
      const sqlPayload = {
        kind: 'request_confirmed' as const,
        requestid: 104,
        skillname: 'Rust Systems',
        categoryname: 'Computer Science',
        recipient_role: 'learner' as const,
        meeting_time: '2026-10-26T16:00:00.000Z',
        duration_minutes: 45,
        mode: 'offline' as const,
        location: 'SJT 401',
        meeting_link: null,
        cancel_deadline: '2026-10-26T15:00:00.000Z',
        counterpart: {
          fname: 'Professor',
          lname: 'Oak',
          dept: 'CSE',
          year: 4,
          phone1: '+919999988888',
          phone2: null,
          email1: 'oak@vit.ac.in',
          email2: null,
        },
      };
      const rendered = renderEmail(sqlPayload);
      expect(rendered.text).not.toContain('undefined');
      expect(rendered.text).not.toContain('null');
      expect(rendered.html).not.toContain('undefined');
      expect(rendered.html).not.toContain('null');

      // Assert date/time/duration/mode/location block appears FIRST in both text and html
      const detailsIndexText = rendered.text.indexOf('Session Details:');
      const skillIndexText = rendered.text.indexOf('Skill:');
      const counterpartIndexText = rendered.text.indexOf('Counterpart Information:');
      expect(detailsIndexText).toBeGreaterThanOrEqual(0);
      expect(skillIndexText).toBeGreaterThan(detailsIndexText);
      expect(counterpartIndexText).toBeGreaterThan(skillIndexText);

      // Verify date/time block precedes counterpart info in HTML
      const detailsIndexHtml = rendered.html.indexOf('Session Details');
      const counterpartIndexHtml = rendered.html.indexOf('Counterpart Information');
      expect(detailsIndexHtml).toBeLessThan(counterpartIndexHtml);
    });

    it('renders SQL payload from cancel_request (0013) without undefined or null', () => {
      // Replicates SQL from 0013_fix_cancel_request_email_payload.sql:
      // jsonb_build_object('kind', 'request_cancelled', 'requestid', p_requestid, 'cancelled_by_fname', COALESCE(v_my_st.fname, ''), 'skillname', v_sk.skillname, 'meeting_time', v_rm.meeting_time, 'reason', v_reason)
      const sqlPayload = {
        kind: 'request_cancelled' as const,
        requestid: 105,
        cancelled_by_fname: 'Bob',
        skillname: 'Cloud Computing',
        meeting_time: '2026-10-27T10:00:00.000Z',
        reason: 'Emergency exam scheduled',
      };
      const rendered = renderEmail(sqlPayload);
      expect(rendered.text).not.toContain('undefined');
      expect(rendered.text).not.toContain('null');
      expect(rendered.html).not.toContain('undefined');
      expect(rendered.html).not.toContain('null');
      expect(rendered.text).toContain('Bob has cancelled the session for Cloud Computing.');
      expect(rendered.text).toContain('Emergency exam scheduled');
    });
  });
});
