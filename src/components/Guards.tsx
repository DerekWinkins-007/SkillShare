import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth/useAuth';

export const SignedOutOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { me, isLoading } = useAuth();

  if (isLoading) {
    return null; // Render nothing while loading (no flicker redirects)
  }

  if (me) {
    if (me.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const RequireStudent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { me, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!me) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (me.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // If student profile is incomplete and not on /profile/setup or /profile/edit, redirect to /profile/setup
  const allowedIncomplete = ['/profile/setup', '/profile/edit'];
  if (!me.profile_complete && !allowedIncomplete.includes(location.pathname)) {
    return <Navigate to="/profile/setup" replace />;
  }

  return <>{children}</>;
};

export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { me, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!me) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (me.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const RequireAnyAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { me, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!me) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
