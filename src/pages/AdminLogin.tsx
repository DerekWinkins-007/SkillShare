import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { AppError, errorMessages } from '../lib/types';
import { Button, TextField, ErrorBanner } from '../components/ui';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const trimmedEmail = email.trim().toLowerCase();
      await api.signInAdmin({ email: trimmedEmail, password });
      return await api.getMe();
    },
    onSuccess: (me) => {
      queryClient.setQueryData(queryKeys.auth.me, me);
      navigate('/admin');
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

      {/* Admin Sign In Card */}
      <section className="w-full max-w-[440px] bg-surface-container-lowest p-space-xl rounded-xl border border-outline-variant/60 shadow-sm">
        <h1 className="font-display-lg text-display-lg font-bold text-on-surface mb-space-lg">
          Admin sign in
        </h1>

        {errorMsg && (
          <div className="mb-space-md">
            <ErrorBanner
              message={errorMsg}
              data-testid="adminlogin-error"
              onDismiss={() => setErrorMsg(null)}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          <TextField
            id="admin-email"
            label="Email"
            type="email"
            required
            data-testid="adminlogin-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@vit.ac.in"
          />

          <TextField
            id="admin-password"
            label="Password"
            type="password"
            required
            data-testid="adminlogin-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            data-testid="adminlogin-submit"
            isLoading={loginMutation.isPending}
            className="w-full mt-space-2xs"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        {/* Bottom Navigational Links */}
        <nav className="mt-space-lg flex flex-col items-center gap-space-xs text-center border-t border-surface-container-high pt-space-md">
          <p className="font-body-sm text-body-sm text-secondary">
            Need an admin account?{' '}
            <Link to="/admin/signup" className="text-primary-container font-medium hover:underline ml-1">
              Create admin account
            </Link>
          </p>
          <Link to="/login" className="font-body-sm text-body-sm text-primary-container font-medium hover:underline text-center">
            Student sign in
          </Link>
        </nav>
      </section>
    </div>
  );
};
