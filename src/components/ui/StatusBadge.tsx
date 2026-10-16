import React from 'react';

export interface StatusBadgeProps {
  status: string;
  className?: string;
  'data-testid'?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', 'data-testid': testId }) => {
  const normStatus = status.toLowerCase();

  let colorClasses = 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';

  if (normStatus === 'pending' || normStatus === 'open') {
    colorClasses = 'bg-status-active-bg text-status-active-text border-status-active-border';
  } else if (normStatus === 'accepted') {
    colorClasses = 'bg-secondary-container text-on-secondary-container border-outline-variant';
  } else if (normStatus === 'confirmed' || normStatus === 'approved' || normStatus === 'completed' || normStatus === 'resolved') {
    colorClasses = 'bg-status-success-bg text-status-success-text border-status-success-border';
  } else if (normStatus === 'cancelled' || normStatus === 'rejected' || normStatus === 'declined') {
    colorClasses = 'bg-status-danger-bg text-status-danger-text border-status-danger-border';
  } else if (normStatus === 'expired') {
    colorClasses = 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border';
  }

  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-xs font-semibold uppercase tracking-wider border ${colorClasses} ${className}`}
    >
      {status}
    </span>
  );
};
