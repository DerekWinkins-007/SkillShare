import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';

export const AdminRequests: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: queryKeys.admin.requests(statusFilter),
    queryFn: () => api.adminListRequests(statusFilter === 'all' ? null : statusFilter),
  });

  return (
    <section>
      <h1>All Skill Requests (Admin Oversight)</h1>

      <div>
        <label htmlFor="admin-requests-filter">Filter by Status:</label>
        <select
          id="admin-requests-filter"
          data-testid="admin-requests-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {isLoading ? (
        <p>Loading requests...</p>
      ) : requests.length === 0 ? (
        <p data-testid="admin-requests-empty">No requests found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Status</th>
              <th>Skill</th>
              <th>Requester</th>
              <th>Provider</th>
              <th>Meeting Time</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.requestid} data-testid={`admin-request-row-${r.requestid}`}>
                <td>#{r.requestid}</td>
                <td>{new Date(r.requestdate).toLocaleDateString()}</td>
                <td>{r.status}</td>
                <td>{r.skillname}</td>
                <td>{r.requester_name}</td>
                <td>{r.provider_name}</td>
                <td>{r.meeting_time ? new Date(r.meeting_time).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
