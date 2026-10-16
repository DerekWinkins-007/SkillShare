import React, { forwardRef } from 'react';

export interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  maxChars?: number;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, helperText, maxChars, id, required, value, className = '', ...props }, ref) => {
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="flex flex-col gap-space-2xs w-full">
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={id} className="font-label-md text-label-md text-on-surface">
              {label} {required && <span className="text-error font-bold">*</span>}
            </label>
          )}
          {maxChars !== undefined && (
            <span className="font-body-sm text-body-sm text-secondary tabular-nums">
              {currentLength} / {maxChars}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={id}
          required={required}
          value={value}
          maxLength={maxChars}
          className={`w-full rounded-lg border bg-surface-container-lowest p-space-sm font-body-md text-body-md text-on-surface placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary-fixed focus:border-primary-container transition-colors disabled:opacity-50 disabled:bg-surface-container-low ${
            error
              ? 'border-error focus:ring-error-container focus:border-error'
              : 'border-outline-variant'
          } ${className}`}
          {...props}
        />
        {helperText && !error && (
          <p className="font-body-sm text-body-sm text-secondary">{helperText}</p>
        )}
        {error && (
          <p role="alert" className="font-body-sm text-body-sm text-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextareaField.displayName = 'TextareaField';
