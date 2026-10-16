import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { AppError, errorMessages } from '../lib/types';
import { Button, TextField, ErrorBanner } from '../components/ui';

export const Login: React.FC = () => {
  const [regno, setRegno] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const trimmedRegno = regno.trim().toUpperCase();
      const trimmedEmail = email.trim().toLowerCase();

      if (!/^[0-9]{2}[A-Z]{3}[0-9]{4}$/.test(trimmedRegno)) {
        throw new AppError('INVALID_CREDENTIALS');
      }

      await api.signIn({ regno: trimmedRegno, email: trimmedEmail, password });
      return await api.getMe();
    },
    onSuccess: (me) => {
      queryClient.setQueryData(queryKeys.auth.me, me);
      if (!me?.profile_complete) {
        navigate('/profile/setup');
      } else {
        navigate('/dashboard');
      }
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setErrorMsg(errorMessages[err.code] || err.message);
      } else {
        setErrorMsg('Sign in failed. Please check your credentials.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-space-md py-space-xl">
      {/* Brand Wordmark */}
      <div className="mb-space-2xl text-center">
        <Link to="/login" className="font-headline-md text-headline-md font-bold text-primary-container tracking-tight">
          SkillShare
        </Link>
      </div>

      {/* Sign In Card */}
      <section className="w-full max-w-[440px] bg-surface-container-lowest p-space-xl rounded-xl border border-outline-variant/60 shadow-sm">
        <h1 className="font-display-lg text-display-lg font-bold text-on-surface mb-space-lg">
          Student sign in
        </h1>

        {errorMsg && (
          <div className="mb-space-md">
            <ErrorBanner
              message={errorMsg}
              data-testid="login-error"
              onDismiss={() => setErrorMsg(null)}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-lg">
          <TextField
            id="regno"
            label="Registration number"
            helperText="Format: 2 digits, 3 letters, 4 digits."
            required
            data-testid="login-regno"
            value={regno}
            onChange={(e) => setRegno(e.target.value.toUpperCase())}
            placeholder="e.g. 25BCE1232"
          />

          <TextField
            id="email"
            label="Email"
            type="email"
            required
            data-testid="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@vitstudent.ac.in"
          />

          <TextField
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            required
            data-testid="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightAction={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="h-8 px-space-sm font-label-sm text-label-sm text-secondary hover:text-on-surface hover:bg-surface-container transition-colors rounded-lg flex items-center justify-center cursor-pointer mr-1"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            }
          />

          <Button
            type="submit"
            data-testid="login-submit"
            isLoading={loginMutation.isPending}
            className="w-full mt-space-2xs"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        {/* Bottom Navigation Links */}
        <nav className="mt-space-lg flex flex-col items-center gap-space-xs text-center border-t border-surface-container-high pt-space-md">
          <div className="font-body-sm text-body-sm text-secondary">
            New to SkillShare?{' '}
            <Link to="/signup" className="font-label-sm text-label-sm text-primary-container hover:underline ml-1">
              Create student account
            </Link>
          </div>
          <div className="flex items-center gap-space-md mt-1">
            <Link to="/admin/login" className="font-label-sm text-label-sm text-primary-container hover:underline">
              Admin sign in
            </Link>
            <span className="text-outline-variant">•</span>
            <Link to="/admin/signup" className="font-label-sm text-label-sm text-secondary hover:underline">
              Admin sign up
            </Link>
          </div>
        </nav>
      </section>
    </div>
  );
};
