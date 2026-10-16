import React from 'react';
import { Link } from 'react-router-dom';

export interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  backTo,
  backLabel = 'Back',
  actions,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-space-xs mb-space-xl ${className}`}>
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary hover:text-primary-container transition-colors w-fit"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>{backLabel}</span>
        </Link>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="font-body-md text-body-md text-secondary mt-1">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-space-sm flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
