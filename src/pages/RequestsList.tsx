import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { StatusBadge, Skeleton } from '../components/ui';

export const RequestsList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'provider' | 'requester'>('provider');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: queryKeys.requests.myRequests(activeTab, statusFilter),
    queryFn: () => api.listMyRequests(activeTab, statusFilter === 'all' ? null : statusFilter),
  });

  return (
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            Skill Requests
          </h1>
          <p className="font-body-md text-body-md text-secondary mt-1">
            Manage your incoming and outgoing peer learning session requests
          </p>
        </div>
      </div>

      {/* Tabs Row */}
      <nav aria-label="Requests Tabs" className="border-b border-surface-container-high flex items-center gap-space-xl h-12">
        <button
          type="button"
          data-testid="requests-tab-received"
          aria-selected={activeTab === 'provider'}
          onClick={() => setActiveTab('provider')}
          className={`h-full px-space-2xs font-label-md text-label-md transition-colors flex items-center gap-2 cursor-pointer -mb-[1px] ${
            activeTab === 'provider'
              ? 'text-primary-container font-semibold border-b-2 border-primary-container'
              : 'text-secondary hover:text-on-surface font-medium'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">inbox</span>
          <span>Received Requests (I am Provider)</span>
        </button>
        <button
          type="button"
          data-testid="requests-tab-sent"
          aria-selected={activeTab === 'requester'}
          onClick={() => setActiveTab('requester')}
          className={`h-full px-space-2xs font-label-md text-label-md transition-colors flex items-center gap-2 cursor-pointer -mb-[1px] ${
            activeTab === 'requester'
              ? 'text-primary-container font-semibold border-b-2 border-primary-container'
              : 'text-secondary hover:text-on-surface font-medium'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">outbox</span>
          <span>Sent Requests (I am Requester)</span>
        </button>
      </nav>

      {/* Filter and Count Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-md shadow-sm">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
          {activeTab === 'provider' ? 'Received' : 'Sent'} Requests ({requests.length})
        </h2>

        <div className="flex items-center gap-space-xs">
          <label htmlFor="status-filter" className="font-label-sm text-label-sm text-secondary font-medium whitespace-nowrap">
            Filter by Status:
          </label>
          <div className="relative">
            <select
              id="status-filter"
              data-testid="requests-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-space-sm pr-8 bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface appearance-none focus:outline-none focus:border-primary-container cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-secondary text-[18px] pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Content Table Card */}
      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-space-lg flex flex-col gap-space-md">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-space-2xl text-center flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-[36px] text-secondary mb-space-sm">
              inbox
            </span>
            <p data-testid="requests-empty" className="font-body-sm text-body-sm text-secondary">
              No requests found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3 px-space-md font-semibold" scope="col">ID</th>
                  <th className="py-3 px-space-md font-semibold" scope="col">Skill</th>
                  <th className="py-3 px-space-md font-semibold" scope="col">Counterpart</th>
                  <th className="py-3 px-space-md font-semibold" scope="col">Status</th>
                  <th className="py-3 px-space-md font-semibold" scope="col">Meeting Time</th>
                  <th className="py-3 px-space-md font-semibold text-right" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                {requests.map((r) => (
                  <tr
                    key={r.requestid}
                    data-testid={`request-row-${r.requestid}`}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="py-3.5 px-space-md font-mono text-secondary">
                      #{r.requestid}
                    </td>
                    <td className="py-3.5 px-space-md font-medium text-on-surface">
                      <Link
                        to={`/requests/${r.requestid}`}
                        className="text-primary-container font-semibold hover:underline"
                      >
                        {r.skillname}
                      </Link>
                    </td>
                    <td className="py-3.5 px-space-md text-secondary">
                      {r.counterpart_fname} {r.counterpart_lname}
                    </td>
                    <td className="py-3.5 px-space-md">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3.5 px-space-md text-secondary tabular-nums">
                      {r.meeting_time ? new Date(r.meeting_time).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }) : (
                        <span className="text-secondary/70 italic">Not scheduled</span>
                      )}
                    </td>
                    <td className="py-3.5 px-space-md text-right whitespace-nowrap">
                      <Link
                        to={`/requests/${r.requestid}`}
                        className="h-8 px-space-sm bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm rounded-lg border border-outline-variant inline-flex items-center gap-1 transition-colors"
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
    </div>
  );
};
