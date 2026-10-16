import React, { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, className = '', children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-label-md font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none outline-none';

    const sizeStyles = {
      sm: 'h-8 px-space-sm text-label-sm rounded-lg gap-1.5',
      md: 'h-10 px-space-md text-label-md rounded-lg gap-2',
      lg: 'h-12 px-space-lg text-label-md rounded-lg gap-2.5',
    }[size];

    const variantStyles = {
      primary: 'bg-primary-container hover:bg-primary text-on-primary shadow-sm active:translate-y-px',
      secondary: 'bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant active:translate-y-px',
      danger: 'bg-error hover:bg-tertiary text-on-error shadow-sm active:translate-y-px',
      ghost: 'bg-transparent hover:bg-surface-container-low text-secondary hover:text-on-surface',
      outline: 'bg-transparent border border-outline-variant hover:bg-surface-container-low text-on-surface active:translate-y-px',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="material-symbols-outlined text-[18px] animate-spin">
            progress_activity
          </span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
