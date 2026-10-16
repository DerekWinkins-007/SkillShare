import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { passwordRules } from '../lib/rules';
import { AppError, errorMessages } from '../lib/types';
import { Button, TextField, ErrorBanner } from '../components/ui';

export const AdminSignup: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [keyphrase, setKeyphrase] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signupMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = displayName.trim();
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedName || trimmedName.length > 60) {
        throw new AppError('VALIDATION', 'Display name must be 1 to 60 characters');
      }
      if (!trimmedEmail || trimmedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        throw new AppError('VALIDATION', 'Valid email address is required (max 254 chars)');
      }
      if (!passwordRules(password)) {
        throw new AppError('VALIDATION', 'Password must be 8-72 characters with at least one letter and one number');
      }
      if (password !== confirmPassword) {
        throw new AppError('VALIDATION', 'Passwords do not match');
      }
      if (!keyphrase || keyphrase.trim() === '') {
        throw new AppError('INVALID_KEYPHRASE');
      }

      await api.signUpAdmin({
        display_name: trimmedName,
        email: trimmedEmail,
        password,
        keyphrase,
      });

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
        setErrorMsg('Admin registration failed');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    signupMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-space-md py-space-xl">
      {/* Brand Wordmark */}
      <div className="mb-space-2xl text-center">
        <Link to="/login" className="font-headline-md text-headline-md font-bold text-primary-container tracking-tight">
          SkillShare
        </Link>
      </div>

      {/* Admin Sign Up Card */}
      <section className="w-full max-w-[440px] bg-surface-container-lowest p-space-xl rounded-xl border border-outline-variant/60 shadow-sm">
        <div className="mb-space-lg text-center">
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            Create admin account
          </h1>
          <p className="font-body-sm text-body-sm text-secondary mt-space-2xs">
            Administrative privileges and verification required
          </p>
        </div>

        {errorMsg && (
          <div className="mb-space-md">
            <ErrorBanner
              message={errorMsg}
              data-testid="adminsignup-error"
              onDismiss={() => setErrorMsg(null)}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          <TextField
            id="display_name"
            label="Display name"
            required
            maxLength={60}
            data-testid="adminsignup-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Dr. John Doe"
          />

          <TextField
            id="email"
            label="Email"
            type="email"
            required
            maxLength={254}
            data-testid="adminsignup-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@vit.ac.in"
          />

          <TextField
            id="password"
            label="Password"
            type="password"
            helperText="At least 8 characters, with a letter and a number."
            required
            data-testid="adminsignup-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <TextField
            id="confirm_password"
            label="Re-enter password"
            type="password"
            required
            data-testid="adminsignup-confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <TextField
            id="keyphrase"
            label="Admin keyphrase"
            type="password"
            required
            data-testid="adminsignup-keyphrase"
            value={keyphrase}
            onChange={(e) => setKeyphrase(e.target.value)}
            placeholder="Enter institutional keyphrase"
          />

          <Button
            type="submit"
            data-testid="adminsignup-submit"
            isLoading={signupMutation.isPending}
            className="w-full mt-space-2xs"
          >
            {signupMutation.isPending ? 'Registering...' : 'Create admin account'}
          </Button>
        </form>

        {/* Bottom Navigational Links */}
        <nav className="mt-space-lg flex flex-col items-center gap-space-xs text-center border-t border-surface-container-high pt-space-md">
          <div className="font-body-sm text-body-sm text-secondary">
            Already have an account?{' '}
            <Link to="/admin/login" className="font-medium text-primary-container hover:underline ml-1">
              Admin sign in
            </Link>
          </div>
          <Link to="/login" className="font-body-sm text-body-sm font-medium text-primary-container hover:underline">
            Student sign in
          </Link>
        </nav>
      </section>
    </div>
  );
};
