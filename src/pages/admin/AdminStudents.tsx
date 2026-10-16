import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { Skeleton } from '../../components/ui';

export const AdminStudents: React.FC = () => {
  const { data: students = [], isLoading } = useQuery({
    queryKey: queryKeys.admin.students,
    queryFn: () => api.adminListStudents(),
  });

  return (
    <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs mb-space-2xs">
            <span className="font-code-sm text-code-sm uppercase tracking-wider text-secondary">
              Registry / Academic Directory
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
          </div>
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            Registered Students (Admin Oversight)
          </h1>
        </div>

        {/* Informational Meta Pill */}
        <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-xl border border-outline-variant/60 shadow-sm self-start md:self-auto">
          <div className="flex items-center gap-space-xs text-secondary font-label-sm">
            <span className="material-symbols-outlined text-[18px]">school</span>
            <span>Total Enrolled: <strong className="text-on-surface font-semibold">{students.length}</strong></span>
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
        ) : students.length === 0 ? (
          <div className="p-space-xl text-center">
            <p data-testid="admin-students-empty" className="font-body-md text-secondary">
              No students registered.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="h-11 bg-surface-container-low border-b border-surface-container-high text-secondary font-label-xs text-label-xs tracking-wider uppercase select-none">
                  <th className="px-space-md font-semibold whitespace-nowrap" scope="col">
                    ID
                  </th>
                  <th className="px-space-md font-semibold whitespace-nowrap" scope="col">
                    REG NO
                  </th>
                  <th className="px-space-md font-semibold whitespace-nowrap" scope="col">
                    NAME
                  </th>
                  <th className="px-space-md font-semibold whitespace-nowrap" scope="col">
                    DEPARTMENT
                  </th>
                  <th className="px-space-md font-semibold whitespace-nowrap" scope="col">
                    YEAR
                  </th>
                  <th className="px-space-md font-semibold whitespace-nowrap text-right" scope="col">
                    PROFILE COMPLETE
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                {students.map((s) => (
                  <tr
                    key={s.studentid}
                    data-testid={`admin-student-row-${s.studentid}`}
                    className="h-14 hover:bg-surface-container-low/40 transition-colors"
                  >
                    <td className="px-space-md font-code-md text-secondary whitespace-nowrap">
                      {s.studentid}
                    </td>
                    <td className="px-space-md font-code-md font-medium text-primary-container whitespace-nowrap">
                      {s.regno}
                    </td>
                    <td className="px-space-md font-medium text-on-surface whitespace-nowrap">
                      {s.fname ? `${s.fname} ${s.lname ?? ''}`.trim() : '-'}
                    </td>
                    <td className="px-space-md text-secondary whitespace-nowrap">
                      {s.dept || '-'}
                    </td>
                    <td className="px-space-md text-secondary whitespace-nowrap">
                      {s.year ?? '-'}
                    </td>
                    <td className="px-space-md text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-xs font-semibold uppercase tracking-wider border ${
                          s.profile_complete
                            ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                            : 'bg-status-neutral-bg text-status-neutral-text border-status-neutral-border'
                        }`}
                      >
                        {s.profile_complete ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && students.length > 0 && (
          <div className="h-12 bg-surface-container-low px-space-md flex items-center justify-between text-secondary font-label-xs">
            <span>Showing {students.length} registered students</span>
            <span className="font-code-sm uppercase">Campus Student Directory</span>
          </div>
        )}
      </div>
    </section>
  );
};
