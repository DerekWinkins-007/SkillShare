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
});
