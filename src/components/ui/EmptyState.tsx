import React from 'react';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  'data-testid'?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  action,
  'data-testid': testId,
  className = '',
}) => {
  return (
    <div
      data-testid={testId}
      className={`flex flex-col items-center justify-center p-space-2xl text-center bg-surface-container-lowest border border-outline-variant/40 rounded-xl ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-secondary mb-space-md">
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
        {title}
      </h3>
      {description && (
        <p className="font-body-sm text-body-sm text-secondary max-w-sm mt-1">
          {description}
        </p>
      )}
      {action && <div className="mt-space-lg">{action}</div>}
    </div>
  );
};
