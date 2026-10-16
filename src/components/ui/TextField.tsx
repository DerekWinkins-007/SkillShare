import React, { forwardRef } from 'react';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  leftIcon?: string;
  rightAction?: React.ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, helperText, leftIcon, rightAction, id, required, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-space-2xs w-full">
        {label && (
          <label htmlFor={id} className="font-label-md text-label-md text-on-surface flex items-center justify-between">
            <span>
              {label} {required && <span className="text-error font-bold">*</span>}
            </span>
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px] pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            required={required}
            className={`h-10 w-full rounded-lg border bg-surface-container-lowest font-body-md text-body-md text-on-surface placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary-fixed focus:border-primary-container transition-colors disabled:opacity-50 disabled:bg-surface-container-low ${
              leftIcon ? 'pl-10' : 'px-space-sm'
            } ${rightAction ? 'pr-16' : 'pr-space-sm'} ${
              error
                ? 'border-error focus:ring-error-container focus:border-error'
                : 'border-outline-variant'
            } ${className}`}
            {...props}
          />
          {rightAction && (
            <div className="absolute right-1 flex items-center">
              {rightAction}
            </div>
          )}
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

TextField.displayName = 'TextField';
