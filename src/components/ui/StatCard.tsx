import React from 'react';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: string;
  'data-testid'?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  'data-testid': testId,
}) => {
  return (
    <div
      data-testid={testId}
      className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-lg shadow-sm flex flex-col justify-between"
    >
      <div className="flex items-center justify-between text-secondary">
        <span className="font-label-md text-label-md text-secondary font-medium">{label}</span>
        {icon && (
          <span className="material-symbols-outlined text-secondary text-[24px]">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-space-sm">
        <div className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
          {value}
        </div>
        {subtitle && (
          <div className="font-body-sm text-body-sm text-secondary mt-1">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
