import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { AppError, errorMessages } from '../lib/types';

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
    <section>
      <h1>Administrator Login</h1>
      {errorMsg && <p role="alert" data-testid="adminlogin-error">{errorMsg}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="admin-email">Admin Email:</label>
          <input
            id="admin-email"
            type="email"
            data-testid="adminlogin-email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="admin-password">Password:</label>
          <input
            id="admin-password"
            type="password"
            data-testid="adminlogin-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" data-testid="adminlogin-submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Signing in...' : 'Sign In as Administrator'}
        </button>
      </form>
      <nav>
        <ul>
          <li><Link to="/login">Student Login</Link></li>
          <li><Link to="/admin/signup">Admin Sign Up</Link></li>
        </ul>
      </nav>
    </section>
  );
};
