import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/useAuth';
import { useRealtimeSubscriptions } from '../hooks/useRealtimeSubscriptions';
import { useSyncScheduler } from '../hooks/useSyncScheduler';
import { useFeedbackPrompt } from '../hooks/useFeedbackPrompt';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { describeNotification } from '../lib/notifications';

export const Layout: React.FC = () => {
  const { me, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Mount realtime & schedulers
  useRealtimeSubscriptions();
  useSyncScheduler();
  const { promptItem, dismissPrompt } = useFeedbackPrompt();

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: () => api.listNotifications(),
    enabled: !!me && me.role === 'student',
    staleTime: 1000 * 30,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (ids: number[]) => api.markNotificationsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list });
    },
  });

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.notificationid);
    if (unreadIds.length > 0) {
      markReadMutation.mutate(unreadIds);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const submitFeedbackMutation = useMutation({
    mutationFn: (payload: { requestid: number; rating: number; comments: string }) =>
      api.submitFeedback(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.feedbackDue });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.my });
      dismissPrompt();
    },
    onError: (err: unknown) => {
      setFeedbackError(err instanceof Error ? err.message : 'Feedback submission failed');
    },
  });

  const handleFeedbackPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptItem) return;
    submitFeedbackMutation.mutate({
      requestid: promptItem.requestid,
      rating: feedbackRating,
      comments: feedbackComments,
    });
  };

  const isLinkActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const linkClass = (path: string) =>
    `h-16 inline-flex items-center font-label-md text-label-md border-b-2 transition-colors px-1 ${
      isLinkActive(path)
        ? 'text-primary-container font-semibold border-primary-container'
        : 'text-secondary hover:text-on-surface border-transparent hover:border-outline-variant'
    }`;

  return (
    <div className="min-h-screen bg-surface flex flex-col font-body-md text-body-md text-on-surface antialiased">
      {/* Header bar */}
      <header className="fixed top-0 left-0 w-full z-40 bg-surface-container-lowest border-b border-surface-container-high shadow-xs">
        <div className="h-16 max-w-[1200px] mx-auto px-margin md:px-margin-wide flex items-center justify-between gap-space-md">
          {/* Brand + Nav links */}
          <div className="flex items-center gap-space-lg lg:gap-space-xl overflow-x-auto">
            <div className="flex items-center gap-space-xs flex-shrink-0">
              <Link
                to={me?.role === 'admin' ? '/admin' : '/dashboard'}
                className="font-headline-md text-headline-md font-bold text-primary-container tracking-tight select-none"
              >
                SkillShare
              </Link>
              {me?.role === 'admin' && (
                <span className="h-5 px-space-xs flex items-center justify-center font-label-xs text-label-xs font-semibold rounded-md bg-surface-container-low text-secondary border border-surface-container-high">
                  Admin
                </span>
              )}
            </div>

            <nav data-testid="nav-bar" className="flex items-center">
              <ul className="flex items-center gap-space-md lg:gap-space-lg whitespace-nowrap">
                {me?.role === 'student' && (
                  <>
                    <li>
                      <Link to="/dashboard" data-testid="nav-dashboard" className={linkClass('/dashboard')}>
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link to="/catalogue" data-testid="nav-catalogue" className={linkClass('/catalogue')}>
                        Catalogue
                      </Link>
                    </li>
                    <li>
                      <Link to="/requests" data-testid="nav-requests" className={linkClass('/requests')}>
                        Requests
                      </Link>
                    </li>
                    <li>
                      <Link to="/proposals" data-testid="nav-proposals" className={linkClass('/proposals')}>
                        Proposals
                      </Link>
                    </li>
                    <li>
                      <Link to="/reports" data-testid="nav-reports" className={linkClass('/reports')}>
                        Reports
                      </Link>
                    </li>
                    <li>
                      <Link to="/profile/edit" data-testid="nav-profile-edit" className={linkClass('/profile/edit')}>
                        Profile
                      </Link>
                    </li>
                  </>
                )}

                {me?.role === 'admin' && (
                  <>
                    <li>
                      <Link to="/admin" data-testid="nav-admin-dashboard" className={linkClass('/admin')}>
                        Admin Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link to="/admin/categories" data-testid="nav-admin-categories" className={linkClass('/admin/categories')}>
                        Categories
                      </Link>
                    </li>
                    <li>
                      <Link to="/admin/skills" data-testid="nav-admin-skills" className={linkClass('/admin/skills')}>
                        Skills
                      </Link>
                    </li>
                    <li>
                      <Link to="/admin/requests" data-testid="nav-admin-requests" className={linkClass('/admin/requests')}>
                        Requests
                      </Link>
                    </li>
                    <li>
                      <Link to="/admin/students" data-testid="nav-admin-students" className={linkClass('/admin/students')}>
                        Students
                      </Link>
                    </li>
                    <li>
                      <Link to="/reports" data-testid="nav-admin-reports" className={linkClass('/reports')}>
                        Reports
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </nav>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-space-xs sm:gap-space-sm flex-shrink-0">
            {me?.role === 'student' && (
              <button
                type="button"
                data-testid="nav-notifications-btn"
                onClick={() => setShowNotifications((v) => !v)}
                className="relative flex items-center gap-1.5 px-space-xs sm:px-space-sm py-1.5 font-label-md text-label-md text-secondary hover:bg-surface-container-low hover:text-on-surface rounded-xl transition-colors cursor-pointer"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="hidden sm:inline">Notifications {unreadCount > 0 && `(${unreadCount})`}</span>
                {unreadCount > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-status-active-bg border border-surface-container-lowest animate-pulse"></span>
                )}
              </button>
            )}

            {me && (
              <button
                type="button"
                data-testid="nav-signout-btn"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-space-xs sm:px-space-sm py-1.5 font-label-md text-label-md text-secondary hover:bg-surface-container-low hover:text-on-surface rounded-xl transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span className="hidden md:inline">
                  Sign Out ({me.role === 'admin' ? me.display_name : me.student?.regno || me.login_email})
                </span>
                <span className="md:hidden">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications Flyout Dialog */}
      {showNotifications && (
        <dialog
          open
          data-testid="notifications-dialog"
          className="fixed top-16 right-4 sm:right-10 z-50 m-0 w-[380px] max-w-[calc(100vw-32px)] max-h-[480px] bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/60 flex flex-col overflow-hidden backdrop:bg-transparent"
        >
          {/* Panel Header */}
          <header className="h-14 px-space-md flex items-center justify-between bg-surface-container-lowest border-b border-surface-container-high">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Notifications
            </h3>
            <div className="flex items-center gap-space-xs">
              <button
                type="button"
                data-testid="notification-mark-all-read"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="font-label-sm text-label-sm text-primary-container hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-space-xs py-1 rounded-lg cursor-pointer"
              >
                Mark all as read
              </button>
              <button
                type="button"
                data-testid="notifications-close-btn"
                onClick={() => setShowNotifications(false)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </header>

          {/* Notifications Items List */}
          <ul className="divide-y divide-surface-container-high overflow-y-auto max-h-[400px] bg-surface-container-lowest">
            {notifications.length === 0 ? (
              <li data-testid="notifications-empty" className="p-space-xl text-center text-secondary font-body-sm">
                No notifications.
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.notificationid}
                  data-testid={`notification-row-${n.notificationid}`}
                  className={`p-space-md flex items-start gap-space-sm hover:bg-surface-container-low/40 transition-colors ${
                    !n.is_read ? 'bg-surface-container-lowest' : 'opacity-75'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      !n.is_read ? 'bg-primary-container' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <p className="font-body-md text-body-md text-on-surface font-medium leading-snug">
                      {describeNotification(n)}
                    </p>
                    <span className="font-body-sm text-body-sm text-secondary text-[12px]">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  {!n.is_read && (
                    <button
                      type="button"
                      data-testid={`notification-read-${n.notificationid}`}
                      onClick={() => markReadMutation.mutate([n.notificationid])}
                      className="ml-auto text-primary-container hover:underline font-label-xs text-label-xs whitespace-nowrap self-start cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </dialog>
      )}

      {/* Feedback Prompt Dialog */}
      {promptItem && (
        <dialog
          open
          data-testid="feedback-prompt-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-xs w-full h-full"
        >
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/60 p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center gap-space-xs text-status-active-text">
              <span className="material-symbols-outlined text-[24px]">grade</span>
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Session Feedback Due
              </h3>
            </div>
            <p className="font-body-md text-body-md text-secondary">
              Please provide feedback for your completed session for{' '}
              <strong className="text-on-surface">{promptItem.skillname}</strong> with{' '}
              <strong className="text-on-surface">
                {promptItem.counterpart_fname} {promptItem.counterpart_lname}
              </strong>.
            </p>

            {feedbackError && (
              <p
                role="alert"
                data-testid="feedback-prompt-error"
                className="p-space-xs bg-status-danger-bg text-status-danger-text border border-status-danger-border rounded-lg text-body-sm font-medium"
              >
                {feedbackError}
              </p>
            )}

            <form onSubmit={handleFeedbackPromptSubmit} className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="prompt-rating" className="font-label-sm text-label-sm text-secondary">
                  Rating (1 to 5):
                </label>
                <div className="relative">
                  <select
                    id="prompt-rating"
                    data-testid="feedback-rating"
                    value={feedbackRating}
                    onChange={(e) => setFeedbackRating(Number(e.target.value))}
                    className="w-full h-10 pl-space-sm pr-space-xl bg-surface-container-lowest text-on-surface font-body-md rounded-xl border border-outline-variant shadow-sm appearance-none focus:outline-none focus:border-primary-container cursor-pointer"
                  >
                    <option value={5}>5 - Excellent</option>
                    <option value={4}>4 - Very Good</option>
                    <option value={3}>3 - Good</option>
                    <option value={2}>2 - Fair</option>
                    <option value={1}>1 - Poor</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-space-sm top-1/2 -translate-y-1/2 pointer-events-none text-secondary text-[20px]">
                    expand_more
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="prompt-comments" className="font-label-sm text-label-sm text-secondary">
                  Comments (optional, max 100):
                </label>
                <textarea
                  id="prompt-comments"
                  data-testid="feedback-comments"
                  maxLength={100}
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  rows={3}
                  className="w-full p-space-sm bg-surface-container-lowest text-on-surface font-body-md rounded-xl border border-outline-variant shadow-sm focus:outline-none focus:border-primary-container resize-none"
                  placeholder="Share a few words on your learning experience..."
                />
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                <button
                  type="button"
                  data-testid="feedback-prompt-dismiss"
                  onClick={dismissPrompt}
                  className="h-10 px-space-md rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface font-label-md hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  data-testid="feedback-submit"
                  disabled={submitFeedbackMutation.isPending}
                  className="h-10 px-space-md rounded-xl bg-primary-container text-on-primary font-label-md hover:bg-primary transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Main Outlet */}
      <main className="flex-1 pt-16 min-h-[calc(100vh-64px)] bg-surface">
        <Outlet />
      </main>
    </div>
  );
};
