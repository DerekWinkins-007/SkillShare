import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { allowedActions, canGiveFeedback, validateSlot, Duration } from '../lib/rules';
import { now } from '../lib/clock';
import { AppError, errorMessages, Mode } from '../lib/types';

export const RequestDetail: React.FC = () => {
  const { requestid } = useParams<{ requestid: string }>();
  const idNum = Number(requestid);
  const queryClient = useQueryClient();

  const [actionError, setActionError] = useState<string | null>(null);

  // Slot modal / form state
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotTime, setSlotTime] = useState('');
  const [slotDuration, setSlotDuration] = useState<Duration>(30);
  const [slotMode, setSlotMode] = useState<Mode>('online');
  const [slotLocation, setSlotLocation] = useState('');
  const [slotLink, setSlotLink] = useState('');

  // Cancel form state
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Feedback form state
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState('');

  const {
    data: request,
    isLoading,
    error: reqError,
  } = useQuery({
    queryKey: queryKeys.requests.detail(idNum),
    queryFn: () => api.getRequest(idNum),
    enabled: !isNaN(idNum) && idNum > 0,
  });

  const isConfirmedOrCompleted = request?.status === 'confirmed' || request?.status === 'completed';

  const { data: contact } = useQuery({
    queryKey: queryKeys.requests.contact(idNum),
    queryFn: () => api.getContactDetails(idNum),
    enabled: isConfirmedOrCompleted,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.requests.detail(idNum) });
    queryClient.invalidateQueries({ queryKey: queryKeys.requests.contact(idNum) });
    queryClient.invalidateQueries({ queryKey: queryKeys.requests.myRequests('requester') });
    queryClient.invalidateQueries({ queryKey: queryKeys.requests.myRequests('provider') });
    queryClient.invalidateQueries({ queryKey: queryKeys.requests.feedbackDue });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.my });
  };

  const respondMutation = useMutation({
    mutationFn: (payload: { accept: boolean; slot?: { meeting_time: string; duration_minutes: Duration; mode: Mode; location: string | null; meeting_link: string | null } }) =>
      api.respondToRequest({ requestid: idNum, accept: payload.accept, slot: payload.slot }),
    onSuccess: () => {
      invalidateAll();
      setShowSlotForm(false);
      setActionError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setActionError(errorMessages[err.code] || err.message);
      } else {
        setActionError('Action failed');
      }
    },
  });

  const slotAgreeMutation = useMutation({
    mutationFn: (agree: boolean) => api.respondToSlot({ requestid: idNum, agree }),
    onSuccess: () => {
      invalidateAll();
      setActionError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setActionError(errorMessages[err.code] || err.message);
      } else {
        setActionError('Action failed');
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => api.cancelRequest({ requestid: idNum, reason }),
    onSuccess: () => {
      invalidateAll();
      setShowCancelForm(false);
      setCancelReason('');
      setActionError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setActionError(errorMessages[err.code] || err.message);
      } else {
        setActionError('Action failed');
      }
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: (payload: { rating: number; comments: string }) =>
      api.submitFeedback({ requestid: idNum, rating: payload.rating, comments: payload.comments }),
    onSuccess: () => {
      invalidateAll();
      setActionError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setActionError(errorMessages[err.code] || err.message);
      } else {
        setActionError('Feedback submission failed');
      }
    },
  });

  if (isNaN(idNum) || idNum <= 0) {
    return <p role="alert">Invalid request ID.</p>;
  }

  if (isLoading) {
    return <p>Loading request details...</p>;
  }

  if (reqError || !request) {
    return <p role="alert">Request not found or access denied.</p>;
  }

  const actions = allowedActions(request, now());
  const feedbackAllowed = canGiveFeedback(request);

  const handleProposeSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!slotTime) {
      setActionError('Meeting time is required');
      return;
    }

    const meetingDate = new Date(slotTime);
    if (isNaN(meetingDate.getTime())) {
      setActionError('Invalid meeting time');
      return;
    }

    const isoTime = meetingDate.toISOString();
    try {
      validateSlot(
        {
          meeting_time: isoTime,
          duration_minutes: slotDuration,
          mode: slotMode,
          location: slotMode === 'offline' ? slotLocation : null,
          meeting_link: slotMode === 'online' ? slotLink : null,
        },
        now()
      );
    } catch (err: unknown) {
      if (err instanceof AppError) {
        setActionError(errorMessages[err.code] || err.message);
        return;
      }
    }

    respondMutation.mutate({
      accept: true,
      slot: {
        meeting_time: isoTime,
        duration_minutes: slotDuration,
        mode: slotMode,
        location: slotMode === 'offline' ? slotLocation : null,
        meeting_link: slotMode === 'online' ? slotLink : null,
      },
    });
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setActionError('Cancellation reason is required');
      return;
    }
    cancelMutation.mutate(cancelReason.trim());
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    feedbackMutation.mutate({
      rating: feedbackRating,
      comments: feedbackComments,
    });
  };

  return (
    <section>
      <h1>Request #{request.requestid}: {request.skillname}</h1>
      {actionError && <p role="alert" data-testid="request-error">{actionError}</p>}

      <section>
        <h2>Status &amp; Role</h2>
        <p>Status: <strong data-testid="request-detail-status">{request.status}</strong></p>
        <p>My Role: <strong>{request.my_role === 'requester' ? 'Requester (Learner)' : 'Provider (Teacher)'}</strong></p>
        <p>
          Counterpart:{' '}
          <Link to={`/students/${request.counterpart_studentid}`}>
            {request.counterpart_fname} {request.counterpart_lname}
          </Link>{' '}
          ({request.counterpart_dept}, Year {request.counterpart_year})
        </p>
        <p>Created: {new Date(request.requestdate).toLocaleString()}</p>
        {request.cancel_reason && (
          <p>Cancellation Reason: <strong>{request.cancel_reason}</strong></p>
        )}
      </section>

      {/* Meeting Slot Info */}
      {request.meeting_time && (
        <section data-testid="request-detail-meeting">
          <h2>Meeting Details</h2>
          <ul>
            <li>Date &amp; Time: {new Date(request.meeting_time).toLocaleString()}</li>
            <li>Duration: {request.duration_minutes} minutes</li>
            <li>Mode: {request.mode}</li>
            {request.mode === 'offline' && <li>Location: {request.location}</li>}
            {request.mode === 'online' && (
              <li>
                Link:{' '}
                {request.meeting_link ? (
                  <a href={request.meeting_link} target="_blank" rel="noreferrer">
                    {request.meeting_link}
                  </a>
                ) : (
                  'None provided'
                )}
              </li>
            )}
            {request.cancel_deadline && (
              <li>Cancellation Deadline: {new Date(request.cancel_deadline).toLocaleString()}</li>
            )}
          </ul>
        </section>
      )}

      {/* Contact Details (Available only when confirmed or completed) */}
      {isConfirmedOrCompleted && contact && (
        <section data-testid="request-contact-section">
          <h2>Counterpart Contact Information</h2>
          <ul>
            <li>Name: {contact.fname} {contact.lname}</li>
            <li>Department: {contact.dept} (Year {contact.year})</li>
            <li>Phone 1: <strong data-testid="request-contact-phone1">{contact.phone1}</strong></li>
            {contact.phone2 && <li>Phone 2: <strong data-testid="request-contact-phone2">{contact.phone2}</strong></li>}
            <li>Email 1: <strong data-testid="request-contact-email1">{contact.email1}</strong></li>
            {contact.email2 && <li>Email 2: <strong data-testid="request-contact-email2">{contact.email2}</strong></li>}
          </ul>
        </section>
      )}

      {/* Allowed Actions */}
      <section>
        <h2>Available Actions</h2>
        {actions.length === 0 && !feedbackAllowed && (
          <p>No actions available for this request.</p>
        )}

        {actions.includes('accept') && (
          <button
            type="button"
            data-testid="request-action-accept"
            onClick={() => setShowSlotForm(true)}
          >
            Accept &amp; Propose Slot
          </button>
        )}

        {actions.includes('reject') && (
          <button
            type="button"
            data-testid="request-action-reject"
            onClick={() => respondMutation.mutate({ accept: false })}
          >
            Reject Request
          </button>
        )}

        {actions.includes('agree') && (
          <button
            type="button"
            data-testid="request-action-agree"
            onClick={() => slotAgreeMutation.mutate(true)}
          >
            Agree to Slot
          </button>
        )}

        {actions.includes('decline') && (
          <button
            type="button"
            data-testid="request-action-decline"
            onClick={() => slotAgreeMutation.mutate(false)}
          >
            Decline Slot
          </button>
        )}

        {actions.includes('cancel') && (
          <button
            type="button"
            data-testid="request-action-cancel"
            onClick={() => setShowCancelForm(true)}
          >
            Cancel Session
          </button>
        )}
      </section>

      {/* Slot Proposal Form Dialog */}
      {showSlotForm && (
        <dialog open>
          <h3>Propose Meeting Slot</h3>
          <form onSubmit={handleProposeSlotSubmit}>
            <div>
              <label htmlFor="slot-time">Meeting Date &amp; Time:</label>
              <input
                id="slot-time"
                type="datetime-local"
                data-testid="slot-time"
                required
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="slot-duration">Duration (minutes):</label>
              <select
                id="slot-duration"
                data-testid="slot-duration"
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value) as Duration)}
              >
                <option value={30}>30</option>
                <option value={45}>45</option>
                <option value={60}>60</option>
                <option value={90}>90</option>
              </select>
            </div>
            <div>
              <label htmlFor="slot-mode">Mode:</label>
              <select
                id="slot-mode"
                data-testid="slot-mode"
                value={slotMode}
                onChange={(e) => setSlotMode(e.target.value as Mode)}
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            {slotMode === 'offline' && (
              <div>
                <label htmlFor="slot-location">Location (required for offline):</label>
                <input
                  id="slot-location"
                  type="text"
                  data-testid="slot-location"
                  required
                  maxLength={150}
                  value={slotLocation}
                  onChange={(e) => setSlotLocation(e.target.value)}
                />
              </div>
            )}

            {slotMode === 'online' && (
              <div>
                <label htmlFor="slot-link">Meeting Link (optional):</label>
                <input
                  id="slot-link"
                  type="url"
                  data-testid="slot-link"
                  maxLength={200}
                  value={slotLink}
                  onChange={(e) => setSlotLink(e.target.value)}
                />
              </div>
            )}

            <button type="submit" data-testid="slot-submit" disabled={respondMutation.isPending}>
              {respondMutation.isPending ? 'Submitting...' : 'Submit Proposed Slot'}
            </button>
            <button type="button" onClick={() => setShowSlotForm(false)}>
              Cancel
            </button>
          </form>
        </dialog>
      )}

      {/* Cancel Form Dialog */}
      {showCancelForm && (
        <dialog open>
          <h3>Cancel Request</h3>
          <form onSubmit={handleCancelSubmit}>
            <div>
              <label htmlFor="cancel-reason">Reason for cancellation (1-200 chars):</label>
              <textarea
                id="cancel-reason"
                data-testid="cancel-reason"
                required
                maxLength={200}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <button type="submit" data-testid="cancel-submit" disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
            <button type="button" onClick={() => setShowCancelForm(false)}>
              Back
            </button>
          </form>
        </dialog>
      )}

      {/* Feedback Form for Requester on Completed */}
      {feedbackAllowed && (
        <section>
          <h2>Submit Session Feedback</h2>
          <form onSubmit={handleFeedbackSubmit}>
            <div>
              <label htmlFor="detail-feedback-rating">Rating (1 to 5):</label>
              <select
                id="detail-feedback-rating"
                data-testid="feedback-rating"
                value={feedbackRating}
                onChange={(e) => setFeedbackRating(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={4}>4</option>
                <option value={3}>3</option>
                <option value={2}>2</option>
                <option value={1}>1</option>
              </select>
            </div>
            <div>
              <label htmlFor="detail-feedback-comments">Comments (optional, max 100):</label>
              <textarea
                id="detail-feedback-comments"
                data-testid="feedback-comments"
                maxLength={100}
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
              />
            </div>
            <button type="submit" data-testid="feedback-submit" disabled={feedbackMutation.isPending}>
              {feedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </section>
      )}

      <nav>
        <Link to="/requests">Back to Requests List</Link>
      </nav>
    </section>
  );
};
