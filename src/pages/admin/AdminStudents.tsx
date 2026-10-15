import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';

export const AdminStudents: React.FC = () => {
  const { data: students = [], isLoading } = useQuery({
    queryKey: queryKeys.admin.students,
    queryFn: () => api.adminListStudents(),
  });

  return (
    <section>
      <h1>Registered Students (Admin Oversight)</h1>

      {isLoading ? (
        <p>Loading students...</p>
      ) : students.length === 0 ? (
        <p data-testid="admin-students-empty">No students registered.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Reg No</th>
              <th>Name</th>
              <th>Department</th>
              <th>Year</th>
              <th>Profile Complete</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.studentid} data-testid={`admin-student-row-${s.studentid}`}>
                <td>{s.studentid}</td>
                <td>{s.regno}</td>
                <td>{s.fname ? `${s.fname} ${s.lname ?? ''}`.trim() : '-'}</td>
                <td>{s.dept || '-'}</td>
                <td>{s.year ?? '-'}</td>
                <td>{s.profile_complete ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
