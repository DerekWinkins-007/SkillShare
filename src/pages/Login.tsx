import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { AppError, errorMessages } from '../lib/types';

export const Login: React.FC = () => {
  const [regno, setRegno] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <section>
      <h1>Student Login</h1>
      {errorMsg && <p role="alert" data-testid="login-error">{errorMsg}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="regno">Registration Number:</label>
          <input
            id="regno"
            type="text"
            data-testid="login-regno"
            required
            value={regno}
            onChange={(e) => setRegno(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="email">Email Address:</label>
          <input
            id="email"
            type="email"
            data-testid="login-email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            data-testid="login-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" data-testid="login-submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <nav>
        <ul>
          <li><Link to="/signup">Student Sign Up</Link></li>
          <li><Link to="/admin/login">Admin Login</Link></li>
          <li><Link to="/admin/signup">Admin Sign Up</Link></li>
        </ul>
      </nav>
    </section>
  );
};
