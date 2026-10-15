import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export const StudentDashboard: React.FC = () => {
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard.my,
    queryFn: () => api.getMyDashboard(),
  });

  if (isLoading) {
    return <p>Loading dashboard...</p>;
  }

  if (error || !dashboard) {
    return <p role="alert">Failed to load dashboard.</p>;
  }

  return (
    <section>
      <h1>Student Dashboard</h1>

      <section>
        <h2>Overview</h2>
        <ul>
          <li>
            My Skills Offered: <strong data-testid="dashboard-my-skills-count">{dashboard.my_skill_count}</strong>
          </li>
          <li>
            Pending Incoming Requests: <strong data-testid="dashboard-pending-incoming">{dashboard.pending_incoming}</strong>
          </li>
          <li>
            Average Teaching Rating:{' '}
            <strong data-testid="dashboard-avg-rating">
              {dashboard.avg_rating !== null ? `${dashboard.avg_rating} / 5` : 'No ratings yet'}
            </strong>{' '}
            (<span data-testid="dashboard-feedback-count">{dashboard.feedback_count}</span> reviews)
          </li>
        </ul>
      </section>

      <section>
        <h2>Upcoming Confirmed Sessions</h2>
        {dashboard.upcoming.length === 0 ? (
          <p data-testid="dashboard-no-upcoming">No upcoming confirmed sessions.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Skill</th>
                <th>Counterpart</th>
                <th>Meeting Time</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.upcoming.map((u) => (
                <tr key={u.requestid} data-testid={`dashboard-upcoming-row-${u.requestid}`}>
                  <td>{u.skillname}</td>
                  <td>{u.counterpart_name}</td>
                  <td>{new Date(u.meeting_time).toLocaleString()}</td>
                  <td>
                    <Link to={`/requests/${u.requestid}`}>View Request</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Feedback Due</h2>
        {dashboard.feedback_due.length === 0 ? (
          <p data-testid="dashboard-no-feedback-due">No feedback currently due.</p>
        ) : (
          <ul>
            {dashboard.feedback_due.map((f) => (
              <li key={f.requestid} data-testid={`dashboard-feedback-due-row-${f.requestid}`}>
                <span>{f.skillname} with {f.provider_name}</span> -{' '}
                <Link to={`/requests/${f.requestid}`}>Provide Feedback</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
};
