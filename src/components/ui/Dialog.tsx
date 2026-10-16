import React, { useEffect, useRef } from 'react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  'data-testid'?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-md',
  'data-testid': testId,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid={testId}
      className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-inverse-surface/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={`w-full ${maxWidth} bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-modal overflow-hidden flex flex-col`}
      >
        <div className="flex items-center justify-between p-space-lg border-b border-surface-container-high">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
              {title}
            </h2>
            {description && (
              <p className="font-body-sm text-body-sm text-secondary mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-low transition-colors"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-space-lg overflow-y-auto max-h-[calc(85vh-130px)]">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-space-sm p-space-md bg-surface-container-low border-t border-surface-container-high">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
