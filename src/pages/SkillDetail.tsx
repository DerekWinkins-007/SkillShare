import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { AppError, errorMessages } from '../lib/types';

export const SkillDetail: React.FC = () => {
  const { skillid } = useParams<{ skillid: string }>();
  const idNum = Number(skillid);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: skills = [] } = useQuery({
    queryKey: queryKeys.catalogue.skills(),
    queryFn: () => api.listSkills(),
    enabled: !isNaN(idNum) && idNum > 0,
  });

  const skill = skills.find((s) => s.skillid === idNum);

  const { data: providers = [], isLoading: isProvidersLoading } = useQuery({
    queryKey: queryKeys.catalogue.skillProviders(idNum),
    queryFn: () => api.listSkillProviders(idNum),
    enabled: !isNaN(idNum) && idNum > 0,
  });

  const requestMutation = useMutation({
    mutationFn: (providerStudentId: number) =>
      api.createRequest({ provider_studentid: providerStudentId, skillid: idNum }),
    onSuccess: (newRequestId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.myRequests('requester') });
      navigate(`/requests/${newRequestId}`);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setErrorMsg(errorMessages[err.code] || err.message);
      } else {
        setErrorMsg('Failed to send request');
      }
    },
  });

  if (isNaN(idNum) || idNum <= 0) {
    return <p role="alert">Invalid skill ID.</p>;
  }

  return (
    <section>
      <h1>Skill: {skill?.skillname ?? `#${idNum}`}</h1>
      {skill && <p>Category: <strong>{skill.categoryname}</strong></p>}

      {errorMsg && <p role="alert" data-testid="skilldetail-error">{errorMsg}</p>}

      <section>
        <h2>Available Providers</h2>
        {isProvidersLoading ? (
          <p>Loading providers...</p>
        ) : providers.length === 0 ? (
          <p data-testid="skilldetail-no-providers">No students currently offer this skill.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Provider Name</th>
                <th>Department</th>
                <th>Year</th>
                <th>Rating</th>
                <th>Reviews</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.studentid} data-testid={`skilldetail-provider-row-${p.studentid}`}>
                  <td>
                    <Link to={`/students/${p.studentid}`}>
                      {p.fname} {p.lname}
                    </Link>
                  </td>
                  <td>{p.dept}</td>
                  <td>{p.year}</td>
                  <td>{p.avg_rating !== null ? `${p.avg_rating} / 5` : 'N/A'}</td>
                  <td>{p.feedback_count}</td>
                  <td>
                    <button
                      type="button"
                      data-testid={`skilldetail-request-btn-${p.studentid}`}
                      disabled={requestMutation.isPending}
                      onClick={() => {
                        setErrorMsg(null);
                        requestMutation.mutate(p.studentid);
                      }}
                    >
                      Request Session
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <nav>
        <Link to="/catalogue">Back to Catalogue</Link>
      </nav>
    </section>
  );
};
