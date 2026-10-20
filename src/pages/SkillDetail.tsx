import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { AppError, errorMessages } from '../lib/types';
import { Button, StarRating, Skeleton, ErrorBanner } from '../components/ui';

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
    return (
      <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl">
        <ErrorBanner message="Invalid skill ID." />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
      {/* Back Link */}
      <nav aria-label="Breadcrumb">
        <Link
          to="/catalogue"
          className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary hover:text-primary-container transition-colors w-fit"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Catalogue</span>
        </Link>
      </nav>

      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            Skill: {skill?.skillname ?? `#${idNum}`}
          </h1>
          {skill && (
            <span className="px-3 py-1 bg-surface-container-low border border-outline-variant rounded-full text-label-sm font-medium text-secondary w-fit">
              Category: <strong className="text-on-surface font-semibold">{skill.categoryname}</strong>
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <ErrorBanner
          message={errorMsg}
          data-testid="skilldetail-error"
          onDismiss={() => setErrorMsg(null)}
        />
      )}

      {/* Content Section: Available Providers */}
      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-space-lg border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary-container text-[22px]">group</span>
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Available Providers
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-label-xs font-semibold tabular-nums">
            {providers.length}
          </span>
        </div>

        {isProvidersLoading ? (
          <div className="p-space-lg flex flex-col gap-space-md">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : providers.length === 0 ? (
          <div className="py-space-2xl text-center">
            <p data-testid="skilldetail-no-providers" className="font-body-sm text-body-sm text-secondary">
              No students currently offer this skill.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3 px-space-md font-semibold" scope="col">Provider Name</th>
                  <th className="py-3 px-space-md font-semibold" scope="col">Department</th>
                  <th className="py-3 px-space-md font-semibold" scope="col">Year</th>
                  <th className="py-3 px-space-md font-semibold" scope="col">Rating</th>
                  <th className="py-3 px-space-md font-semibold" scope="col">Reviews</th>
                  <th className="py-3 px-space-md font-semibold text-right" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                {providers.map((p) => (
                  <tr
                    key={p.studentid}
                    data-testid={`skilldetail-provider-row-${p.studentid}`}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="py-3.5 px-space-md font-medium text-on-surface whitespace-nowrap">
                      <Link
                        to={`/students/${p.studentid}`}
                        className="text-primary-container font-semibold hover:underline inline-flex items-center gap-1.5"
                      >
                        <span className="w-7 h-7 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center text-label-xs font-bold">
                          {p.fname.charAt(0)}
                        </span>
                        <span>{p.fname} {p.lname}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-space-md text-secondary whitespace-nowrap">{p.dept}</td>
                    <td className="py-3.5 px-space-md text-secondary whitespace-nowrap">Year {p.year}</td>
                    <td className="py-3.5 px-space-md whitespace-nowrap">
                      {p.avg_rating !== null ? (
                        <div className="flex items-center gap-1.5">
                          <StarRating rating={p.avg_rating} size="sm" />
                          <span className="font-semibold text-on-surface tabular-nums">
                            {p.avg_rating} / 5
                          </span>
                        </div>
                      ) : (
                        <span className="text-secondary">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-space-md text-secondary whitespace-nowrap tabular-nums">
                      {p.feedback_count}
                    </td>
                    <td className="py-3.5 px-space-md text-right whitespace-nowrap">
                      <Button
                        type="button"
                        size="sm"
                        data-testid={`skilldetail-request-btn-${p.studentid}`}
                        disabled={requestMutation.isPending}
                        isLoading={requestMutation.isPending}
                        onClick={() => {
                          setErrorMsg(null);
                          requestMutation.mutate(p.studentid);
                        }}
                      >
                        Request Session
                      </Button>
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
