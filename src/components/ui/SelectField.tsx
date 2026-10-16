import React, { forwardRef } from 'react';

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, helperText, id, required, children, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-space-2xs w-full">
        {label && (
          <label htmlFor={id} className="font-label-md text-label-md text-on-surface">
            {label} {required && <span className="text-error font-bold">*</span>}
          </label>
        )}
        <div className="relative flex items-center w-full">
          <select
            ref={ref}
            id={id}
            required={required}
            className={`h-10 w-full appearance-none rounded-lg border bg-surface-container-lowest px-space-sm pr-10 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-fixed focus:border-primary-container transition-colors disabled:opacity-50 disabled:bg-surface-container-low cursor-pointer ${
              error
                ? 'border-error focus:ring-error-container focus:border-error'
                : 'border-outline-variant'
            } ${className}`}
            {...props}
          >
            {children}
          </select>
          <span className="material-symbols-outlined absolute right-3 text-secondary text-[20px] pointer-events-none">
            expand_more
          </span>
        </div>
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

SelectField.displayName = 'SelectField';
