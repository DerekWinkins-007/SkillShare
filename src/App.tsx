import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth/AuthContext';
import {
  SignedOutOnly,
  RequireStudent,
  RequireAdmin,
  RequireAnyAuth,
} from './components/Guards';
import { Layout } from './components/Layout';

// Pages
import { Login } from './pages/Login';
import { StudentSignup } from './pages/StudentSignup';
import { AdminSignup } from './pages/AdminSignup';
import { ProfileSetup } from './pages/ProfileSetup';
import { ProfileEdit } from './pages/ProfileEdit';
import { PublicProfile } from './pages/PublicProfile';
import { StudentDashboard } from './pages/StudentDashboard';
import { Catalogue } from './pages/Catalogue';
import { SkillDetail } from './pages/SkillDetail';
import { RequestsList } from './pages/RequestsList';
import { RequestDetail } from './pages/RequestDetail';
import { StudentProposals } from './pages/StudentProposals';
import { Reports } from './pages/Reports';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminSkills } from './pages/admin/AdminSkills';
import { AdminRequests } from './pages/admin/AdminRequests';
import { AdminStudents } from './pages/admin/AdminStudents';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Signed-out routes */}
            <Route
              path="/login"
              element={
                <SignedOutOnly>
                  <Login />
                </SignedOutOnly>
              }
            />
            <Route
              path="/signup"
              element={
                <SignedOutOnly>
                  <StudentSignup />
                </SignedOutOnly>
              }
            />
            <Route
              path="/admin/signup"
              element={
                <SignedOutOnly>
                  <AdminSignup />
                </SignedOutOnly>
              }
            />

            {/* Authenticated routes wrapped in Layout */}
            <Route element={<Layout />}>
              {/* Profile setup: accessible to student with incomplete profile */}
              <Route
                path="/profile/setup"
                element={
                  <RequireStudent>
                    <ProfileSetup />
                  </RequireStudent>
                }
              />
              <Route
                path="/profile/edit"
                element={
                  <RequireStudent>
                    <ProfileEdit />
                  </RequireStudent>
                }
              />

              {/* Student routes */}
              <Route
                path="/dashboard"
                element={
                  <RequireStudent>
                    <StudentDashboard />
                  </RequireStudent>
                }
              />
              <Route
                path="/catalogue"
                element={
                  <RequireStudent>
                    <Catalogue />
                  </RequireStudent>
                }
              />
              <Route
                path="/skills/:skillid"
                element={
                  <RequireStudent>
                    <SkillDetail />
                  </RequireStudent>
                }
              />
              <Route
                path="/requests"
                element={
                  <RequireStudent>
                    <RequestsList />
                  </RequireStudent>
                }
              />
              <Route
                path="/requests/:requestid"
                element={
                  <RequireStudent>
                    <RequestDetail />
                  </RequireStudent>
                }
              />
              <Route
                path="/students/:studentid"
                element={
                  <RequireStudent>
                    <PublicProfile />
                  </RequireStudent>
                }
              />
              <Route
                path="/proposals"
                element={
                  <RequireStudent>
                    <StudentProposals />
                  </RequireStudent>
                }
              />

              {/* Shared reports route (student and admin) */}
              <Route
                path="/reports"
                element={
                  <RequireAnyAuth>
                    <Reports />
                  </RequireAnyAuth>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <AdminDashboard />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <RequireAdmin>
                    <AdminCategories />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/skills"
                element={
                  <RequireAdmin>
                    <AdminSkills />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/requests"
                element={
                  <RequireAdmin>
                    <AdminRequests />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/students"
                element={
                  <RequireAdmin>
                    <AdminStudents />
                  </RequireAdmin>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};
