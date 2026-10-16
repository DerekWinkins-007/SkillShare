import React from 'react';

export interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  'data-testid'?: string;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  'data-testid': testId,
  className = '',
}) => {
  return (
    <div
      role="alert"
      data-testid={testId}
      className={`bg-status-danger-bg border border-status-danger-border text-status-danger-text rounded-lg p-space-sm flex items-start gap-space-xs font-body-sm text-body-sm ${className}`}
    >
      <span className="material-symbols-outlined text-error text-[20px] shrink-0">
        error
      </span>
      <div className="flex-1 font-medium">{message}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-status-danger-text hover:opacity-75 p-0.5 rounded transition-opacity"
          aria-label="Dismiss error"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
};
