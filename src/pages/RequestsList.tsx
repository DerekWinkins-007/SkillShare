import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export const RequestsList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'provider' | 'requester'>('provider');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: queryKeys.requests.myRequests(activeTab, statusFilter),
    queryFn: () => api.listMyRequests(activeTab, statusFilter === 'all' ? null : statusFilter),
  });

  return (
    <section>
      <h1>Skill Requests</h1>

      <nav>
        <button
          type="button"
          data-testid="requests-tab-received"
          aria-selected={activeTab === 'provider'}
          onClick={() => setActiveTab('provider')}
        >
          Received Requests (I am Provider)
        </button>
        <button
          type="button"
          data-testid="requests-tab-sent"
          aria-selected={activeTab === 'requester'}
          onClick={() => setActiveTab('requester')}
        >
          Sent Requests (I am Requester)
        </button>
      </nav>

      <div>
        <label htmlFor="status-filter">Filter by Status:</label>
        <select
          id="status-filter"
          data-testid="requests-status-filter"
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

      <section>
        <h2>{activeTab === 'provider' ? 'Received' : 'Sent'} Requests ({requests.length})</h2>
        {isLoading ? (
          <p>Loading requests...</p>
        ) : requests.length === 0 ? (
          <p data-testid="requests-empty">No requests found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Skill</th>
                <th>Counterpart</th>
                <th>Status</th>
                <th>Meeting Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.requestid} data-testid={`request-row-${r.requestid}`}>
                  <td>#{r.requestid}</td>
                  <td>{r.skillname}</td>
                  <td>{r.counterpart_fname} {r.counterpart_lname}</td>
                  <td>{r.status}</td>
                  <td>
                    {r.meeting_time ? new Date(r.meeting_time).toLocaleString() : 'Not scheduled'}
                  </td>
                  <td>
                    <Link to={`/requests/${r.requestid}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
};
