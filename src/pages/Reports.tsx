import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { REPORT_DEFINITIONS } from '../lib/reports';
import { Button, TextField, SelectField, Skeleton, ErrorBanner } from '../components/ui';

export const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<number>(1);
  const [deptInput, setDeptInput] = useState<string>('');
  const [activeParams, setActiveParams] = useState<{ n: number; dept?: string | null }>({
    n: 1,
    dept: null,
  });

  const {
    data: rows = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.reports.report(activeParams.n, activeParams.dept),
    queryFn: () => api.runReport(activeParams.n, activeParams.dept),
  });

  const def = REPORT_DEFINITIONS[selectedReport];

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveParams({
      n: selectedReport,
      dept: def.hasDeptFilter && deptInput.trim() ? deptInput.trim() : null,
    });
  };

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
      {/* Header */}
      <div>
        <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
          Database System Reports
        </h1>
        <p className="font-body-md text-body-md text-secondary mt-1">
          Execute institutional analytics queries and inspect real-time database views
        </p>
      </div>

      {/* Query Parameters Form Card */}
      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-lg shadow-sm">
        <form onSubmit={handleRun} className="flex flex-col sm:flex-row sm:items-end gap-space-md">
          <div className="flex-1">
            <SelectField
              id="report-select"
              label="Select Report"
              data-testid="report-select"
              value={selectedReport}
              onChange={(e) => setSelectedReport(Number(e.target.value))}
            >
              <option value={1}>1. Students by Department</option>
              <option value={2}>2. Skills and Categories</option>
              <option value={3}>3. Overall Feedback Statistics</option>
              <option value={4}>4. Requests by Status</option>
              <option value={5}>5. Feedback Received Leaderboard</option>
            </SelectField>
          </div>

          {def.hasDeptFilter && (
            <div className="w-full sm:w-64">
              <TextField
                id="report-dept"
                label="Department Filter"
                helperText="e.g. CSE (leave empty for all)"
                data-testid="report-dept-input"
                value={deptInput}
                onChange={(e) => setDeptInput(e.target.value)}
                placeholder="All departments"
              />
            </div>
          )}

          <div className="pb-0.5">
            <Button
              type="submit"
              data-testid="report-run-btn"
              isLoading={isLoading}
              className="w-full sm:w-auto h-10"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              <span>Execute Report</span>
            </Button>
          </div>
        </form>
      </section>

      {/* SQL Query Preview Card */}
      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-space-md bg-surface-container-low border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-space-xs text-secondary">
            <span className="material-symbols-outlined text-[18px]">terminal</span>
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              Report Query
            </h2>
          </div>
          <span className="font-code-sm text-code-sm text-secondary uppercase tracking-wider">
            SQL
          </span>
        </div>
        <div className="p-space-md bg-neutral-900 text-neutral-100 overflow-x-auto">
          <pre
            data-testid="report-sql-text"
            className="font-mono text-code-sm text-code-sm text-neutral-100 selection:bg-primary-container"
          >
            {def.sql}
          </pre>
        </div>
      </section>

      {/* Results Section */}
      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-space-md border-b border-surface-container-high flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
            Results ({rows.length} rows)
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-label-xs font-semibold tabular-nums">
            {rows.length} records
          </span>
        </div>

        {isLoading ? (
          <div className="p-space-lg flex flex-col gap-space-sm">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="p-space-lg">
            <ErrorBanner message="Report query failed." />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-space-2xl text-center">
            <p data-testid="report-empty" className="font-body-sm text-body-sm text-secondary">
              No records returned.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table data-testid="report-table" className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider select-none">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="py-3 px-space-md font-semibold" scope="col">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                    {columns.map((col) => (
                      <td key={col} className="py-3 px-space-md font-mono text-on-surface">
                        {String(row[col] ?? 'NULL')}
                      </td>
                    ))}
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
