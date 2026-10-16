import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { StatCard, StatusBadge, Skeleton, ErrorBanner } from '../../components/ui';

export const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => api.getAdminStats(),
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl">
        <ErrorBanner message="Failed to load admin statistics." />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-primary-container font-label-xs uppercase tracking-wider font-semibold">
            <span className="w-2 h-2 rounded-full bg-primary-container"></span>
            <span>Administrative Console</span>
          </div>
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight mt-1">
            Admin Dashboard
          </h1>
        </div>

        <nav aria-label="Admin Quick Links" className="flex items-center gap-space-xs flex-wrap">
          <Link
            to="/admin/categories"
            className="h-9 px-space-sm bg-surface-container-low hover:bg-surface-container border border-outline-variant rounded-lg font-label-sm text-on-surface flex items-center gap-1 transition-colors"
          >
            <span>Review Queue</span>
            {(stats.pending_category_requests + stats.pending_skill_proposals > 0) && (
              <span className="px-1.5 py-0.2 rounded-full bg-status-active-bg text-status-active-text text-label-xs font-semibold tabular-nums">
                {stats.pending_category_requests + stats.pending_skill_proposals}
              </span>
            )}
          </Link>
          <Link
            to="/reports"
            className="h-9 px-space-sm bg-primary-container hover:bg-primary text-on-primary rounded-lg font-label-sm flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">bar_chart</span>
            <span>Reports</span>
          </Link>
        </nav>
      </div>

      {/* System Aggregates: 4 Metric Cards */}
      <section aria-label="System Aggregates">
        <h2 className="sr-only">System Aggregates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <StatCard
            label="Total Students"
            icon="people"
            value={<strong data-testid="admin-stat-students">{stats.total_students}</strong>}
            subtitle={
              <Link to="/admin/students" className="text-primary-container font-label-sm hover:underline">
                View student directory →
              </Link>
            }
          />

          <StatCard
            label="Total Categories"
            icon="category"
            value={<strong data-testid="admin-stat-categories">{stats.total_categories}</strong>}
            subtitle={
              <div className="text-secondary font-body-sm">
                Pending Requests: <strong>{stats.pending_category_requests}</strong> (
                <Link to="/admin/categories" className="text-primary-container hover:underline">Review Queue</Link>)
              </div>
            }
          />

          <StatCard
            label="Total Skills"
            icon="school"
            value={<strong data-testid="admin-stat-skills">{stats.total_skills}</strong>}
            subtitle={
              <div className="text-secondary font-body-sm">
                Pending Proposals: <strong>{stats.pending_skill_proposals}</strong> (
                <Link to="/admin/skills" className="text-primary-container hover:underline">Review Queue</Link>)
              </div>
            }
          />

          <StatCard
            label="Platform Average Rating"
            icon="star"
            value={
              <strong data-testid="admin-stat-avg-rating">
                {stats.avg_rating !== null ? `${stats.avg_rating} / 5` : 'No ratings yet'}
              </strong>
            }
            subtitle="Campus teaching quality"
          />
        </div>
      </section>

      {/* Dual Section: Requests Breakdown & Navigation Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-wide items-start">
        {/* Requests by Status Table */}
        <section className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
          <div className="p-space-lg border-b border-surface-container-high flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Requests by Status
            </h2>
            <Link
              to="/admin/requests"
              className="font-label-sm text-label-sm text-primary-container hover:underline"
            >
              View all requests →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3 px-space-md font-semibold" scope="col">Status</th>
                  <th className="py-3 px-space-md font-semibold text-right" scope="col">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                {Object.entries(stats.requests_by_status).map(([status, count]) => (
                  <tr key={status} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3 px-space-md">
                      <StatusBadge status={status} />
                    </td>
                    <td className="py-3 px-space-md text-right font-mono font-semibold text-on-surface tabular-nums">
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Admin Actions */}
        <aside className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
            Management Modules
          </h2>
          <nav>
            <ul className="flex flex-col gap-space-xs font-label-md text-label-md">
              <li>
                <Link
                  to="/admin/categories"
                  className="p-space-sm rounded-lg hover:bg-surface-container-low text-on-surface flex items-center justify-between transition-colors border border-outline-variant/40"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">category</span>
                    <span>Manage Categories</span>
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-secondary">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/skills"
                  className="p-space-sm rounded-lg hover:bg-surface-container-low text-on-surface flex items-center justify-between transition-colors border border-outline-variant/40"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">school</span>
                    <span>Manage Skills</span>
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-secondary">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/requests"
                  className="p-space-sm rounded-lg hover:bg-surface-container-low text-on-surface flex items-center justify-between transition-colors border border-outline-variant/40"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">swap_horiz</span>
                    <span>View All Skill Requests</span>
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-secondary">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/students"
                  className="p-space-sm rounded-lg hover:bg-surface-container-low text-on-surface flex items-center justify-between transition-colors border border-outline-variant/40"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">badge</span>
                    <span>View Registered Students</span>
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-secondary">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/reports"
                  className="p-space-sm rounded-lg hover:bg-surface-container-low text-on-surface flex items-center justify-between transition-colors border border-outline-variant/40"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">analytics</span>
                    <span>Run System Reports</span>
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-secondary">chevron_right</span>
                </Link>
              </li>
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
};
