import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';

export const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => api.getAdminStats(),
  });

  if (isLoading) {
    return <p>Loading administrative statistics...</p>;
  }

  if (error || !stats) {
    return <p role="alert">Failed to load admin statistics.</p>;
  }

  return (
    <section>
      <h1>Admin Dashboard</h1>

      <section>
        <h2>System Aggregates</h2>
        <ul>
          <li>
            Total Students: <strong data-testid="admin-stat-students">{stats.total_students}</strong>
          </li>
          <li>
            Total Categories: <strong data-testid="admin-stat-categories">{stats.total_categories}</strong>
          </li>
          <li>
            Total Skills: <strong data-testid="admin-stat-skills">{stats.total_skills}</strong>
          </li>
          <li>
            Platform Average Rating:{' '}
            <strong data-testid="admin-stat-avg-rating">
              {stats.avg_rating !== null ? `${stats.avg_rating} / 5` : 'No ratings yet'}
            </strong>
          </li>
          <li>
            Pending Category Requests: <strong>{stats.pending_category_requests}</strong> (
            <Link to="/admin/categories">Review Queue</Link>)
          </li>
          <li>
            Pending Skill Proposals: <strong>{stats.pending_skill_proposals}</strong> (
            <Link to="/admin/skills">Review Queue</Link>)
          </li>
        </ul>
      </section>

      <section>
        <h2>Requests by Status</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats.requests_by_status).map(([status, count]) => (
              <tr key={status}>
                <td>{status}</td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <nav>
        <ul>
          <li><Link to="/admin/categories">Manage Categories &amp; Review Queue</Link></li>
          <li><Link to="/admin/skills">Manage Skills &amp; Review Queue</Link></li>
          <li><Link to="/admin/requests">View All Skill Requests</Link></li>
          <li><Link to="/admin/students">View Registered Students</Link></li>
          <li><Link to="/reports">Run System Reports</Link></li>
        </ul>
      </nav>
    </section>
  );
};
