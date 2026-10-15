import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

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
    return <p role="alert">Invalid student ID.</p>;
  }

  if (isProfileLoading) {
    return <p>Loading profile...</p>;
  }

  if (profileError || !profile) {
    return <p role="alert">Student profile not found.</p>;
  }

  return (
    <section>
      <h1 data-testid="publicprofile-name">{profile.fname} {profile.lname}</h1>
      <p>Department: <strong data-testid="publicprofile-dept">{profile.dept}</strong></p>
      <p>Year: <strong data-testid="publicprofile-year">{profile.year}</strong></p>
      <p>
        Average Rating:{' '}
        <strong data-testid="publicprofile-rating">
          {profile.avg_rating !== null ? `${profile.avg_rating} / 5` : 'No ratings yet'}
        </strong>{' '}
        (<span data-testid="publicprofile-feedback-count">{profile.feedback_count}</span> reviews)
      </p>
      <p>
        Sessions Taught: <strong data-testid="publicprofile-sessions-taught">{profile.sessions_taught}</strong>
      </p>

      <section>
        <h2>Skills Offered</h2>
        {profile.skills.length === 0 ? (
          <p>No skills listed.</p>
        ) : (
          <ul>
            {profile.skills.map((s) => (
              <li key={s.skillid} data-testid={`publicprofile-skill-row-${s.skillid}`}>
                <Link to={`/skills/${s.skillid}`}>
                  {s.skillname} ({s.categoryname})
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Received Feedback</h2>
        {isFeedbackLoading ? (
          <p>Loading feedback...</p>
        ) : feedbackList.length === 0 ? (
          <p data-testid="publicprofile-no-feedback">No feedback received yet.</p>
        ) : (
          <ul>
            {feedbackList.map((f) => (
              <li key={f.feedbackid} data-testid={`publicprofile-feedback-row-${f.feedbackid}`}>
                <p>
                  <strong>Rating:</strong> {f.rating} / 5 | <strong>Skill:</strong> {f.skillname} |{' '}
                  <strong>Learner:</strong> {f.giver_fname}
                </p>
                {f.comments && <p>"{f.comments}"</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
};
