import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { REPORT_DEFINITIONS } from '../lib/reports';

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
    <section>
      <h1>Database System Reports</h1>

      <form onSubmit={handleRun}>
        <div>
          <label htmlFor="report-select">Select Report:</label>
          <select
            id="report-select"
            data-testid="report-select"
            value={selectedReport}
            onChange={(e) => setSelectedReport(Number(e.target.value))}
          >
            <option value={1}>1. Students by Department</option>
            <option value={2}>2. Skills and Categories</option>
            <option value={3}>3. Overall Feedback Statistics</option>
            <option value={4}>4. Requests by Status</option>
            <option value={5}>5. Feedback Received Leaderboard</option>
          </select>
        </div>

        {def.hasDeptFilter && (
          <div>
            <label htmlFor="report-dept">Department Filter (e.g. CSE, leave empty for all):</label>
            <input
              id="report-dept"
              type="text"
              data-testid="report-dept-input"
              value={deptInput}
              onChange={(e) => setDeptInput(e.target.value)}
            />
          </div>
        )}

        <button type="submit" data-testid="report-run-btn">
          Execute Report
        </button>
      </form>

      <section>
        <h2>Report Query</h2>
        <pre data-testid="report-sql-text">{def.sql}</pre>
      </section>

      <section>
        <h2>Results ({rows.length} rows)</h2>
        {isLoading ? (
          <p>Running query...</p>
        ) : error ? (
          <p role="alert">Report query failed.</p>
        ) : rows.length === 0 ? (
          <p data-testid="report-empty">No records returned.</p>
        ) : (
          <table data-testid="report-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td key={col}>{String(row[col] ?? 'NULL')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
};
