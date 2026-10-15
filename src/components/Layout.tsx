import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
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

  return (
    <div>
      <nav data-testid="nav-bar">
        <ul>
          {me?.role === 'student' && (
            <>
              <li><Link to="/dashboard" data-testid="nav-dashboard">Dashboard</Link></li>
              <li><Link to="/catalogue" data-testid="nav-catalogue">Catalogue</Link></li>
              <li><Link to="/requests" data-testid="nav-requests">Requests</Link></li>
              <li><Link to="/proposals" data-testid="nav-proposals">Proposals</Link></li>
              <li><Link to="/reports" data-testid="nav-reports">Reports</Link></li>
              <li><Link to="/profile/edit" data-testid="nav-profile-edit">Profile</Link></li>
              <li>
                <button
                  type="button"
                  data-testid="nav-notifications-btn"
                  onClick={() => setShowNotifications((v) => !v)}
                >
                  Notifications {unreadCount > 0 && `(${unreadCount})`}
                </button>
              </li>
            </>
          )}

          {me?.role === 'admin' && (
            <>
              <li><Link to="/admin" data-testid="nav-admin-dashboard">Admin Dashboard</Link></li>
              <li><Link to="/admin/categories" data-testid="nav-admin-categories">Categories</Link></li>
              <li><Link to="/admin/skills" data-testid="nav-admin-skills">Skills</Link></li>
              <li><Link to="/admin/requests" data-testid="nav-admin-requests">Requests</Link></li>
              <li><Link to="/admin/students" data-testid="nav-admin-students">Students</Link></li>
              <li><Link to="/reports" data-testid="nav-admin-reports">Reports</Link></li>
            </>
          )}

          {me && (
            <li>
              <button
                type="button"
                data-testid="nav-signout-btn"
                onClick={handleSignOut}
              >
                Sign Out ({me.role === 'admin' ? me.display_name : me.student?.regno || me.login_email})
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* Notifications Dialog */}
      {showNotifications && (
        <dialog open data-testid="notifications-dialog">
          <header>
            <h3>Notifications</h3>
            <button
              type="button"
              data-testid="notification-mark-all-read"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
            <button
              type="button"
              data-testid="notifications-close-btn"
              onClick={() => setShowNotifications(false)}
            >
              Close
            </button>
          </header>
          <ul>
            {notifications.length === 0 ? (
              <li data-testid="notifications-empty">No notifications.</li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.notificationid}
                  data-testid={`notification-row-${n.notificationid}`}
                >
                  <span>{describeNotification(n)}</span> - <span>{new Date(n.created_at).toLocaleString()}</span>
                  {!n.is_read && (
                    <button
                      type="button"
                      data-testid={`notification-read-${n.notificationid}`}
                      onClick={() => markReadMutation.mutate([n.notificationid])}
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
        <dialog open data-testid="feedback-prompt-dialog">
          <h3>Session Feedback Due</h3>
          <p>
            Please provide feedback for your completed session for {promptItem.skillname} with{' '}
            {promptItem.counterpart_fname} {promptItem.counterpart_lname}.
          </p>
          {feedbackError && <p role="alert" data-testid="feedback-prompt-error">{feedbackError}</p>}
          <form onSubmit={handleFeedbackPromptSubmit}>
            <div>
              <label htmlFor="prompt-rating">Rating (1 to 5):</label>
              <select
                id="prompt-rating"
                data-testid="feedback-rating"
                value={feedbackRating}
                onChange={(e) => setFeedbackRating(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={4}>4</option>
                <option value={3}>3</option>
                <option value={2}>2</option>
                <option value={1}>1</option>
              </select>
            </div>
            <div>
              <label htmlFor="prompt-comments">Comments (optional, max 100):</label>
              <textarea
                id="prompt-comments"
                data-testid="feedback-comments"
                maxLength={100}
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
              />
            </div>
            <button type="submit" data-testid="feedback-submit">
              Submit Feedback
            </button>
            <button
              type="button"
              data-testid="feedback-prompt-dismiss"
              onClick={dismissPrompt}
            >
              Dismiss
            </button>
          </form>
        </dialog>
      )}

      <main>
        <Outlet />
      </main>
    </div>
  );
};
