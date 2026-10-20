import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { StatCard, StarRating, Skeleton, ErrorBanner } from '../components/ui';

export const PublicProfile: React.FC = () => {
  const { studentid } = useParams<{ studentid: string }>();
  const idNum = Number(studentid);

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useQuery({
    queryKey: queryKeys.profile.public(idNum),
    queryFn: () => api.getPublicProfile(idNum),
    enabled: !isNaN(idNum) && idNum > 0,
  });

  const { data: feedbackList = [], isLoading: isFeedbackLoading } = useQuery({
    queryKey: queryKeys.profile.feedbackReceived(idNum),
    queryFn: () => api.listFeedbackReceived(idNum),
    enabled: !isNaN(idNum) && idNum > 0,
  });

  if (isNaN(idNum) || idNum <= 0) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl">
        <ErrorBanner message="Invalid student ID." />
      </div>
    );
  }

  if (isProfileLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl">
        <ErrorBanner message="Student profile not found." />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
      {/* Back to Catalogue */}
      <Link
        to="/catalogue"
        className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary hover:text-primary-container transition-colors w-fit"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        <span>Back to catalogue</span>
      </Link>

      {/* Header Profile Card */}
      <section className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-space-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <h1 data-testid="publicprofile-name" className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
              {profile.fname} {profile.lname}
            </h1>
            <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 font-body-sm text-body-sm text-secondary">
              <div className="flex items-center gap-1">
                <span className="font-medium text-secondary">Department:</span>
                <strong data-testid="publicprofile-dept" className="text-on-surface font-semibold">{profile.dept}</strong>
              </div>
              <span className="hidden sm:inline text-outline-variant">•</span>
              <div className="flex items-center gap-1">
                <span className="font-medium text-secondary">Year:</span>
                <strong data-testid="publicprofile-year" className="text-on-surface font-semibold">{profile.year}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Row of Three Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <StatCard
          label="Average Rating"
          icon="star"
          value={
            <div className="flex items-baseline gap-2">
              <strong data-testid="publicprofile-rating" className="font-display-lg text-display-lg font-bold text-on-surface">
                {profile.avg_rating !== null ? `${profile.avg_rating} / 5` : 'No ratings yet'}
              </strong>
            </div>
          }
          subtitle={
            profile.avg_rating !== null ? (
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={profile.avg_rating} size="sm" />
                <span className="text-secondary font-body-sm">
                  (<span data-testid="publicprofile-feedback-count">{profile.feedback_count}</span> reviews)
                </span>
              </div>
            ) : (
              <span className="text-secondary font-body-sm">
                <span data-testid="publicprofile-feedback-count">{profile.feedback_count}</span> reviews
              </span>
            )
          }
        />

        <StatCard
          label="Feedback Received"
          icon="chat_bubble_outline"
          value={profile.feedback_count}
          subtitle="Community reviews"
        />

        <StatCard
          label="Sessions Taught"
          icon="school"
          value={<strong data-testid="publicprofile-sessions-taught">{profile.sessions_taught}</strong>}
          subtitle="Completed sessions"
        />
      </div>

      {/* Skills Offered Section */}
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
          <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            Skills Offered ({profile.skills.length})
          </h2>
        </div>

        {profile.skills.length === 0 ? (
          <p className="font-body-sm text-body-sm text-secondary py-space-sm">
            No skills listed.
          </p>
        ) : (
          <div className="flex flex-wrap gap-space-xs">
            {profile.skills.map((s) => (
              <Link
                key={s.skillid}
                to={`/skills/${s.skillid}`}
                data-testid={`publicprofile-skill-row-${s.skillid}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container border border-outline-variant rounded-full text-label-sm font-medium text-on-surface transition-colors shadow-2xs"
              >
                <span>{s.skillname}</span>
                <span className="text-secondary text-label-xs font-normal">({s.categoryname})</span>
                <span className="material-symbols-outlined text-[16px] text-primary-container">arrow_forward</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Received Feedback Section */}
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
          <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            Received Feedback
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-label-xs font-semibold tabular-nums">
            {feedbackList.length}
          </span>
        </div>

        {isFeedbackLoading ? (
          <div className="py-space-md flex flex-col gap-space-sm">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="py-space-xl text-center">
            <p data-testid="publicprofile-no-feedback" className="font-body-sm text-body-sm text-secondary">
              No feedback received yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-container-high">
            {feedbackList.map((f) => (
              <div
                key={f.feedbackid}
                data-testid={`publicprofile-feedback-row-${f.feedbackid}`}
                className="py-space-md flex flex-col sm:flex-row sm:items-start justify-between gap-space-md"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-space-sm">
                    <StarRating rating={f.rating} size="sm" />
                    <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                      {f.rating} / 5
                    </span>
                  </div>
                  {f.comments && (
                    <p className="font-body-md text-body-md text-on-surface italic">
                      "{f.comments}"
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:items-end text-secondary font-body-sm text-body-sm shrink-0">
                  <span className="font-medium text-on-surface">{f.skillname}</span>
                  <span>Learner: {f.giver_fname}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
