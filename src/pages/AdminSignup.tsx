import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { passwordRules } from '../lib/rules';
import { AppError, errorMessages } from '../lib/types';

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
    <section>
      <h1>Administrator Sign Up</h1>
      {errorMsg && <p role="alert" data-testid="adminsignup-error">{errorMsg}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="display_name">Display Name:</label>
          <input
            id="display_name"
            type="text"
            data-testid="adminsignup-display-name"
            required
            maxLength={60}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="email">Email Address:</label>
          <input
            id="email"
            type="email"
            data-testid="adminsignup-email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">Password (min 8 chars, letter + number):</label>
          <input
            id="password"
            type="password"
            data-testid="adminsignup-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirm_password">Confirm Password:</label>
          <input
            id="confirm_password"
            type="password"
            data-testid="adminsignup-confirm-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="keyphrase">Admin Keyphrase:</label>
          <input
            id="keyphrase"
            type="password"
            data-testid="adminsignup-keyphrase"
            required
            value={keyphrase}
            onChange={(e) => setKeyphrase(e.target.value)}
          />
        </div>
        <button type="submit" data-testid="adminsignup-submit" disabled={signupMutation.isPending}>
          {signupMutation.isPending ? 'Registering...' : 'Register as Administrator'}
        </button>
      </form>
      <nav>
        <p>Already have an account? <Link to="/login">Sign In</Link></p>
      </nav>
    </section>
  );
};
