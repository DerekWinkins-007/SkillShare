import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { StatCard, Skeleton, ErrorBanner } from '../components/ui';

export const StudentDashboard: React.FC = () => {
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard.my,
    queryFn: () => api.getMyDashboard(),
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-xl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter-wide">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl">
        <ErrorBanner message="Failed to load dashboard." />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-xl">
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm">
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            Dashboard
          </h1>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-success-bg border border-status-success-border text-status-success-text text-label-xs font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success-text"></span>
            <span>Active</span>
          </div>
        </div>

        <div className="flex items-center gap-space-xs">
          <Link
            to="/catalogue"
            className="h-9 px-space-md bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm rounded-lg border border-outline-variant flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
            <span>Browse Skills</span>
          </Link>
        </div>
      </div>

      {/* Metric / Stats Row: 3 Cards */}
      <section aria-label="Dashboard Overview">
        <h2 className="sr-only">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          <StatCard
            label="My Skills Offered"
            icon="school"
            value={
              <span data-testid="dashboard-my-skills-count">
                {dashboard.my_skill_count}
              </span>
            }
            subtitle={
              <Link to="/catalogue" className="text-primary-container font-label-sm hover:underline">
                Manage skills in catalogue →
              </Link>
            }
          />

          <StatCard
            label="Pending Incoming Requests"
            icon="inbox"
            value={
              <span data-testid="dashboard-pending-incoming">
                {dashboard.pending_incoming}
              </span>
            }
            subtitle={
              <Link to="/requests" className="text-primary-container font-label-sm hover:underline">
                View incoming requests →
              </Link>
            }
          />

          <StatCard
            label="Average Teaching Rating"
            icon="star"
            value={
              <span data-testid="dashboard-avg-rating">
                {dashboard.avg_rating !== null ? `${dashboard.avg_rating} / 5` : 'No ratings yet'}
              </span>
            }
            subtitle={
              <span className="text-secondary font-body-sm">
                Based on <span data-testid="dashboard-feedback-count">{dashboard.feedback_count}</span> reviews
              </span>
            }
          />
        </div>
      </section>

      {/* Dual Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter-wide items-start">
        {/* Left: Upcoming Confirmed Sessions */}
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm p-space-lg flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary-container text-[20px]">calendar_today</span>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Upcoming Confirmed Sessions
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-label-xs font-semibold tabular-nums">
              {dashboard.upcoming.length}
            </span>
          </div>

          {dashboard.upcoming.length === 0 ? (
            <div className="py-space-xl text-center">
              <p data-testid="dashboard-no-upcoming" className="font-body-sm text-body-sm text-secondary">
                No upcoming confirmed sessions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-space-sm font-semibold">Skill</th>
                    <th className="py-2.5 px-space-sm font-semibold">Counterpart</th>
                    <th className="py-2.5 px-space-sm font-semibold">Meeting Time</th>
                    <th className="py-2.5 px-space-sm font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                  {dashboard.upcoming.map((u) => (
                    <tr
                      key={u.requestid}
                      data-testid={`dashboard-upcoming-row-${u.requestid}`}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="py-3 px-space-sm font-medium text-on-surface">{u.skillname}</td>
                      <td className="py-3 px-space-sm text-secondary">{u.counterpart_name}</td>
                      <td className="py-3 px-space-sm text-secondary tabular-nums">
                        {new Date(u.meeting_time).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3 px-space-sm text-right">
                        <Link
                          to={`/requests/${u.requestid}`}
                          className="font-label-sm text-label-sm text-primary-container hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>View</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right: Feedback Due */}
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm p-space-lg flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary-container text-[20px]">rate_review</span>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Feedback Due
              </h2>
            </div>
            {dashboard.feedback_due.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-status-active-bg text-status-active-text border border-status-active-border text-label-xs font-semibold tabular-nums">
                {dashboard.feedback_due.length} pending
              </span>
            )}
          </div>

          {dashboard.feedback_due.length === 0 ? (
            <div className="py-space-xl text-center">
              <p data-testid="dashboard-no-feedback-due" className="font-body-sm text-body-sm text-secondary">
                No feedback currently due.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-container-high">
              {dashboard.feedback_due.map((f) => (
                <li
                  key={f.requestid}
                  data-testid={`dashboard-feedback-due-row-${f.requestid}`}
                  className="py-3 flex items-center justify-between gap-space-sm"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md font-medium text-on-surface truncate">
                      {f.skillname}
                    </span>
                    <span className="font-body-sm text-body-sm text-secondary">
                      Taught by {f.provider_name}
                    </span>
                  </div>
                  <Link
                    to={`/requests/${f.requestid}`}
                    className="h-8 px-space-sm bg-primary-container hover:bg-primary text-on-primary font-label-sm text-label-sm rounded-lg flex items-center gap-1 transition-colors shrink-0"
                  >
                    <span>Provide Feedback</span>
                    <span className="material-symbols-outlined text-[16px]">rate_review</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
