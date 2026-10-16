import React from 'react';

export interface ChipProps {
  label: string;
  onRemove?: () => void;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  'data-testid'?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  onRemove,
  onClick,
  selected = false,
  className = '',
  'data-testid': testId,
}) => {
  return (
    <span
      data-testid={testId}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-medium transition-colors border ${
        selected
          ? 'bg-primary-container text-on-primary border-primary-container shadow-xs'
          : 'bg-surface-container-low text-on-surface border-outline-variant hover:bg-surface-container'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/10 rounded-full p-0.5 inline-flex items-center justify-center transition-colors"
          aria-label={`Remove ${label}`}
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </span>
  );
};
