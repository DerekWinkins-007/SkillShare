import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { isValidRegno, passwordRules } from '../lib/rules';
import { AppError, errorMessages } from '../lib/types';

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
      <section>
        <h1>Confirmation Required</h1>
        <p data-testid="signup-confirmation-msg">
          Please check your email to confirm your account before logging in.
        </p>
        <Link to="/login">Go to Login</Link>
      </section>
    );
  }

  return (
    <section>
      <h1>Student Sign Up</h1>
      {errorMsg && <p role="alert" data-testid="signup-error">{errorMsg}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="regno">Registration Number (e.g. 25BCE1232):</label>
          <input
            id="regno"
            type="text"
            data-testid="signup-regno"
            required
            value={regno}
            onChange={(e) => setRegno(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label htmlFor="email">Email Address:</label>
          <input
            id="email"
            type="email"
            data-testid="signup-email"
            required
            maxLength={50}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">Password (min 8 chars, letter + number):</label>
          <input
            id="password"
            type="password"
            data-testid="signup-password"
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
            data-testid="signup-confirm-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button type="submit" data-testid="signup-submit" disabled={signupMutation.isPending}>
          {signupMutation.isPending ? 'Signing up...' : 'Sign Up'}
        </button>
      </form>
      <nav>
        <p>Already have an account? <Link to="/login">Sign In</Link></p>
      </nav>
    </section>
  );
};
