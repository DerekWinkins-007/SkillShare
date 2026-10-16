import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { isValidRegno, passwordRules } from '../lib/rules';
import { AppError, errorMessages } from '../lib/types';
import { Button, TextField, ErrorBanner } from '../components/ui';

export const StudentSignup: React.FC = () => {
  const [regno, setRegno] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signupMutation = useMutation({
    mutationFn: async () => {
      const trimmedRegno = regno.trim().toUpperCase();
      const trimmedEmail = email.trim().toLowerCase();

      if (!isValidRegno(trimmedRegno)) {
        throw new AppError('INVALID_REGNO', 'Registration number must match pattern (e.g. 25BCE1232)');
      }
      if (!trimmedEmail || trimmedEmail.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        throw new AppError('VALIDATION', 'Email must be a valid address and maximum 50 characters');
      }
      if (!passwordRules(password)) {
        throw new AppError('VALIDATION', 'Password must be 8-72 characters with at least one letter and one number');
      }
      if (password !== confirmPassword) {
        throw new AppError('VALIDATION', 'Passwords do not match');
      }

      return await api.signUpStudent({
        regno: trimmedRegno,
        email: trimmedEmail,
        password,
      });
    },
    onSuccess: async (res) => {
      if (res.status === 'confirmation_required') {
        setConfirmationNotice(true);
      } else {
        const me = await api.getMe();
        queryClient.setQueryData(queryKeys.auth.me, me);
        navigate('/profile/setup');
      }
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setErrorMsg(errorMessages[err.code] || err.message);
      } else {
        setErrorMsg('Sign up failed');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    signupMutation.mutate();
  };

  if (confirmationNotice) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-space-md py-space-xl">
        <div className="mb-space-2xl text-center">
          <Link to="/login" className="font-headline-md text-headline-md font-bold text-primary-container tracking-tight">
            SkillShare
          </Link>
        </div>
        <section className="w-full max-w-[440px] bg-surface-container-lowest p-space-xl rounded-xl border border-outline-variant/60 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-status-success-bg border border-status-success-border text-status-success-text flex items-center justify-center mx-auto mb-space-md">
            <span className="material-symbols-outlined text-[24px]">mark_email_read</span>
          </div>
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface mb-space-sm">
            Confirmation required
          </h1>
          <p data-testid="signup-confirmation-msg" className="font-body-md text-body-md text-secondary mb-space-lg">
            Please check your email to confirm your account before logging in.
          </p>
          <Link to="/login">
            <Button className="w-full">Go to sign in</Button>
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-space-md py-space-xl">
      {/* Brand Wordmark */}
      <div className="mb-space-2xl text-center">
        <Link to="/login" className="font-headline-md text-headline-md font-bold text-primary-container tracking-tight">
          SkillShare
        </Link>
      </div>

      {/* Sign Up Card */}
      <section className="w-full max-w-[440px] bg-surface-container-lowest p-space-xl rounded-xl border border-outline-variant/60 shadow-sm">
        <h1 className="font-display-lg text-display-lg font-bold text-on-surface mb-space-lg">
          Create student account
        </h1>

        {errorMsg && (
          <div className="mb-space-md">
            <ErrorBanner
              message={errorMsg}
              data-testid="signup-error"
              onDismiss={() => setErrorMsg(null)}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          <TextField
            id="regno"
            label="Registration number"
            helperText="Format: 2 digits, 3 letters, 4 digits."
            required
            data-testid="signup-regno"
            value={regno}
            onChange={(e) => setRegno(e.target.value.toUpperCase())}
            placeholder="e.g. 25BCE1232"
          />

          <TextField
            id="email"
            label="Email"
            type="email"
            required
            maxLength={50}
            data-testid="signup-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@vitstudent.ac.in"
          />

          <TextField
            id="password"
            label="Password"
            type="password"
            helperText="At least 8 characters, with a letter and a number."
            required
            data-testid="signup-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <TextField
            id="confirm_password"
            label="Re-enter password"
            type="password"
            required
            data-testid="signup-confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <Button
            type="submit"
            data-testid="signup-submit"
            isLoading={signupMutation.isPending}
            className="w-full mt-space-2xs"
          >
            {signupMutation.isPending ? 'Signing up...' : 'Create account'}
          </Button>
        </form>

        {/* Already have an account */}
        <nav className="mt-space-lg text-center font-body-sm text-body-sm text-secondary border-t border-surface-container-high pt-space-md">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-container font-label-sm hover:underline ml-1">
            Sign in
          </Link>
        </nav>
      </section>
    </div>
  );
};
