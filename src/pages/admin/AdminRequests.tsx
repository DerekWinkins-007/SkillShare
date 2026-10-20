import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { StatusBadge, Skeleton } from '../../components/ui';

export const AdminRequests: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: queryKeys.admin.requests(statusFilter),
    queryFn: () => api.adminListRequests(statusFilter === 'all' ? null : statusFilter),
  });

  return (
    <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
      {/* Header row with Page Title and Status Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <p className="font-label-xs text-label-xs text-secondary uppercase tracking-widest font-semibold mb-space-2xs">
            System Administration
          </p>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight font-bold">
            Requests
          </h1>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <label htmlFor="admin-requests-filter" className="font-label-md text-label-md text-secondary whitespace-nowrap">
            Filter by Status:
          </label>
          <div className="relative min-w-[200px]">
            <select
              id="admin-requests-filter"
              data-testid="admin-requests-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 pl-space-sm pr-space-xl bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-xl border border-outline-variant shadow-sm appearance-none focus:outline-none focus:border-primary-container cursor-pointer transition-colors"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <span className="material-symbols-outlined absolute right-space-sm top-1/2 -translate-y-1/2 pointer-events-none text-secondary text-[20px]">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Table Card Container */}
      <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/60 overflow-hidden">
        {isLoading ? (
          <div className="p-space-lg flex flex-col gap-space-md">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-space-xl text-center">
            <p data-testid="admin-requests-empty" className="font-body-md text-secondary">
              No requests found.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left table-auto border-collapse">
              <thead>
                <tr className="h-11 bg-surface-container-low text-secondary font-label-xs text-label-xs tracking-wider uppercase select-none border-b border-surface-container-high">
                  <th className="px-space-md font-semibold whitespace-nowrap" scope="col">ID</th>
                  <th className="px-space-md font-semibold whitespace-nowrap" scope="col">DATE</th>
                  <th className="px-space-md font-semibold whitespace-nowrap" scope="col">STATUS</th>
                  <th className="px-space-md font-semibold whitespace-nowrap" scope="col">SKILL</th>
                  <th className="px-space-md font-semibold whitespace-nowrap" scope="col">REQUESTER</th>
                  <th className="px-space-md font-semibold whitespace-nowrap" scope="col">PROVIDER</th>
                  <th className="px-space-md font-semibold whitespace-nowrap" scope="col">MEETING TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                {requests.map((r) => (
                  <tr
                    key={r.requestid}
                    data-testid={`admin-request-row-${r.requestid}`}
                    className="h-14 hover:bg-surface-container-low/40 transition-colors"
                  >
                    <td className="px-space-md font-code-md text-secondary whitespace-nowrap">
                      #{r.requestid}
                    </td>
                    <td className="px-space-md text-secondary whitespace-nowrap">
                      {new Date(r.requestdate).toLocaleDateString()}
                    </td>
                    <td className="px-space-md whitespace-nowrap">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-space-md font-medium text-on-surface whitespace-nowrap">
                      {r.skillname}
                    </td>
                    <td className="px-space-md text-on-surface whitespace-nowrap">
                      {r.requester_name}
                    </td>
                    <td className="px-space-md text-on-surface whitespace-nowrap">
                      {r.provider_name}
                    </td>
                    <td className="px-space-md text-secondary whitespace-nowrap font-code-sm">
                      {r.meeting_time ? new Date(r.meeting_time).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && requests.length > 0 && (
          <div className="h-12 bg-surface-container-low px-space-md flex items-center justify-between text-secondary font-label-xs">
            <span>Showing {requests.length} requests</span>
            <span className="font-code-sm uppercase">Oversight Mode</span>
          </div>
        )}
      </div>
    </section>
  );
};
