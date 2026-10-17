import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { REPORT_DEFINITIONS, ReportDefinition } from '../lib/reports';
import { Button, TextField, Skeleton, ErrorBanner } from '../components/ui';

// ─────────────────────────────────────────────────────────────
// Individual report card (owns its own dept input + query)
// ─────────────────────────────────────────────────────────────
const ReportCard: React.FC<{ def: ReportDefinition }> = ({ def }) => {
  const [deptInput, setDeptInput] = useState('');
  const [activeParams, setActiveParams] = useState<{ n: number; dept?: string | null }>({
    n: def.n,
    dept: null,
  });

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: queryKeys.reports.report(activeParams.n, activeParams.dept),
    queryFn: () => api.runReport(activeParams.n, activeParams.dept),
  });

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveParams({
      n: def.n,
      dept: def.hasDeptFilter && deptInput.trim() ? deptInput.trim() : null,
    });
  };

  return (
    <section
      data-testid={`report-card-${def.n}`}
      className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Card header */}
      <div className="px-space-lg py-space-md flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-container shrink-0" />
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
            {def.title}
          </h2>
        </div>
        <span className="font-mono text-label-xs font-semibold text-secondary tracking-wider uppercase shrink-0">
          {def.badge}
        </span>
      </div>

      {/* SQL preview */}
      <div className="mx-space-lg mb-space-md bg-surface-container rounded-lg px-space-md py-space-sm overflow-x-auto">
        <pre
          data-testid={`report-sql-${def.n}`}
          className="font-mono text-code-sm text-secondary whitespace-pre-wrap"
        >
          {def.sql}
        </pre>
      </div>

      {/* Dept filter (only for report 1) */}
      {def.hasDeptFilter && (
        <form
          onSubmit={handleApply}
          className="mx-space-lg mb-space-md flex items-end gap-space-sm"
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`report-dept-${def.n}`}
              className="font-label-sm text-label-sm text-secondary font-medium"
            >
              Department
            </label>
            <TextField
              id={`report-dept-${def.n}`}
              data-testid={`report-dept-input-${def.n}`}
              value={deptInput}
              onChange={(e) => setDeptInput(e.target.value)}
              placeholder="e.g. CSE"
              className="w-52"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            data-testid={`report-apply-${def.n}`}
            isLoading={isLoading}
          >
            <span className="material-symbols-outlined text-[16px]">filter_alt</span>
            Apply
          </Button>
        </form>
      )}

      {/* Results table */}
      <div className="border-t border-outline-variant/40">
        {isLoading ? (
          <div className="p-space-lg flex flex-col gap-space-sm">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <div className="p-space-lg">
            <ErrorBanner message="Report query failed." />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-space-xl text-center">
            <p
              data-testid={`report-empty-${def.n}`}
              className="font-body-sm text-body-sm text-secondary"
            >
              No records returned.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              data-testid={`report-table-${def.n}`}
              className="w-full text-left border-collapse"
            >
              <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider select-none">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="py-3 px-space-md font-semibold" scope="col">
                      {col.replace(/_/g, '_')}
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
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// Reports page – stacked cards (frames 24 and 32)
// ─────────────────────────────────────────────────────────────
export const Reports: React.FC = () => {
  const defs = Object.values(REPORT_DEFINITIONS);

  return (
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-xl">
      {/* Header */}
      <div>
        <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
          Reports
        </h1>
        <p className="font-body-md text-body-md text-secondary mt-1">
          Execute institutional analytics queries and inspect real-time database views
        </p>
      </div>

      {/* Stacked report cards */}
      <div className="flex flex-col gap-space-xl">
        {defs.map((def) => (
          <ReportCard key={def.n} def={def} />
        ))}
      </div>
    </div>
  );
};
