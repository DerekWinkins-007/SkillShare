export function describeNotification(n: { kind: string; ref_id: number | null }): string {
  const ref = n.ref_id !== null ? ` #${n.ref_id}` : '';
  switch (n.kind) {
    case 'request_received':
      return `You received a new skill request${ref}.`;
    case 'request_accepted':
      return `Your skill request${ref} was accepted with a proposed slot.`;
    case 'request_rejected':
      return `Your skill request${ref} was declined.`;
    case 'request_confirmed':
      return `Skill request${ref} has been confirmed.`;
    case 'request_cancelled':
      return `Skill request${ref} was cancelled.`;
    case 'request_expired':
      return `Skill request${ref} expired before confirmation.`;
    case 'feedback_due':
      return `Feedback is due for completed session${ref}.`;
    case 'feedback_received':
      return `You received new feedback for session${ref}.`;
    case 'category_request_reviewed':
      return `Your category request${ref} has been reviewed by an administrator.`;
    case 'skill_proposal_reviewed':
      return `Your skill proposal${ref} has been reviewed by an administrator.`;
    default:
      return `Notification: ${n.kind}${ref}.`;
  }
}
