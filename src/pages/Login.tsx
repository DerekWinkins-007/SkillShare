import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { AppError, errorMessages } from '../lib/types';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async () => {
      await api.signIn({ identifier, password });
      return await api.getMe();
    },
    onSuccess: (me) => {
      queryClient.setQueryData(queryKeys.auth.me, me);
      if (me?.role === 'admin') {
        navigate('/admin');
      } else {
        if (!me?.profile_complete) {
          navigate('/profile/setup');
        } else {
          navigate('/dashboard');
        }
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
      <h1>SkillShare Login</h1>
      {errorMsg && <p role="alert" data-testid="login-error">{errorMsg}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="identifier">Registration Number or Email:</label>
          <input
            id="identifier"
            type="text"
            data-testid="login-identifier"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
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
          <li><Link to="/admin/signup">Admin Sign Up</Link></li>
        </ul>
      </nav>
    </section>
  );
};
