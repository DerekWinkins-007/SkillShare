import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { allowedActions, canGiveFeedback, validateSlot, Duration } from '../lib/rules';
import { now } from '../lib/clock';
import { AppError, errorMessages, Mode } from '../lib/types';
import {
  Button,
  TextField,
  TextareaField,
  SelectField,
  StatusBadge,
  Dialog,
  ErrorBanner,
  Skeleton,
} from '../components/ui';

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

  // Reject & Decline confirmation state (Frames 41 & 42)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

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
      setShowRejectConfirm(false);
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
      setShowDeclineConfirm(false);
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
    return (
      <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl">
        <ErrorBanner message="Invalid request ID." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (reqError || !request) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl">
        <ErrorBanner message="Request not found or access denied." />
      </div>
    );
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
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
      {/* Back Link */}
      <nav aria-label="Breadcrumb">
        <Link
          to="/requests"
          className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary hover:text-primary-container transition-colors w-fit"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Requests</span>
        </Link>
      </nav>

      {/* Header Card */}
      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container-high">
          <div>
            <span className="font-code-sm text-code-sm text-secondary font-medium">
              REQUEST #{request.requestid}
            </span>
            <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
              Request #{request.requestid}: {request.skillname}
            </h1>
          </div>
          <div className="flex items-center gap-space-xs">
            <StatusBadge status={request.status} data-testid="request-detail-status" />
          </div>
        </div>

        {actionError && (
          <ErrorBanner
            message={actionError}
            data-testid="request-error"
            onDismiss={() => setActionError(null)}
          />
        )}

        {/* Status & Role Summary Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-secondary">My Role</span>
            <strong className="font-body-md text-body-md text-on-surface font-semibold">
              {request.my_role === 'requester' ? 'Requester (Learner)' : 'Provider (Teacher)'}
            </strong>
          </div>

          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-secondary">Counterpart</span>
            <Link
              to={`/students/${request.counterpart_studentid}`}
              className="font-body-md text-body-md text-primary-container font-semibold hover:underline"
            >
              {request.counterpart_fname} {request.counterpart_lname}
            </Link>
            <span className="font-body-sm text-body-sm text-secondary">
              {request.counterpart_dept}, Year {request.counterpart_year}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-secondary">Created Date</span>
            <span className="font-body-md text-body-md text-on-surface">
              {new Date(request.requestdate).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>

          {request.cancel_reason && (
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-error font-medium">Cancellation Reason</span>
              <strong className="font-body-md text-body-md text-on-surface">
                {request.cancel_reason}
              </strong>
            </div>
          )}
        </div>
      </section>

      {/* Available Actions Bar */}
      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-md shadow-sm flex flex-col gap-space-xs">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
          Available Actions
        </h2>

        {actions.length === 0 && !feedbackAllowed ? (
          <p className="font-body-sm text-body-sm text-secondary py-1">
            No actions available for this request.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-space-sm pt-2">
            {actions.includes('accept') && (
              <Button
                type="button"
                data-testid="request-action-accept"
                onClick={() => setShowSlotForm(true)}
              >
                <span className="material-symbols-outlined text-[18px]">event</span>
                <span>Accept &amp; Propose Slot</span>
              </Button>
            )}

            {actions.includes('reject') && (
              <Button
                type="button"
                variant="danger"
                data-testid="request-action-reject"
                disabled={respondMutation.isPending}
                onClick={() => setShowRejectConfirm(true)}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                <span>Reject Request</span>
              </Button>
            )}

            {actions.includes('agree') && (
              <Button
                type="button"
                data-testid="request-action-agree"
                disabled={slotAgreeMutation.isPending}
                isLoading={slotAgreeMutation.isPending}
                onClick={() => slotAgreeMutation.mutate(true)}
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                <span>Agree to Slot</span>
              </Button>
            )}

            {actions.includes('decline') && (
              <Button
                type="button"
                variant="outline"
                data-testid="request-action-decline"
                disabled={slotAgreeMutation.isPending}
                onClick={() => setShowDeclineConfirm(true)}
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                <span>Decline Slot</span>
              </Button>
            )}

            {actions.includes('cancel') && (
              <Button
                type="button"
                variant="outline"
                data-testid="request-action-cancel"
                onClick={() => setShowCancelForm(true)}
                className="hover:text-error hover:border-status-danger-border"
              >
                <span className="material-symbols-outlined text-[18px]">block</span>
                <span>Cancel Session</span>
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Meeting Slot Information */}
      {request.meeting_time && (
        <section
          data-testid="request-detail-meeting"
          className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md"
        >
          <div className="flex items-center gap-space-xs pb-space-sm border-b border-surface-container-high">
            <span className="material-symbols-outlined text-primary-container text-[20px]">schedule</span>
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              Meeting Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            <div>
              <span className="font-label-sm text-label-sm text-secondary">Date &amp; Time</span>
              <p className="font-body-md text-body-md text-on-surface font-semibold">
                {new Date(request.meeting_time).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>

            <div>
              <span className="font-label-sm text-label-sm text-secondary">Duration</span>
              <p className="font-body-md text-body-md text-on-surface font-semibold">
                {request.duration_minutes} minutes
              </p>
            </div>

            <div>
              <span className="font-label-sm text-label-sm text-secondary">Mode</span>
              <p className="font-body-md text-body-md text-on-surface capitalize font-semibold">
                {request.mode}
              </p>
            </div>

            {request.mode === 'offline' && (
              <div>
                <span className="font-label-sm text-label-sm text-secondary">Location</span>
                <p className="font-body-md text-body-md text-on-surface font-semibold">
                  {request.location}
                </p>
              </div>
            )}

            {request.mode === 'online' && (
              <div>
                <span className="font-label-sm text-label-sm text-secondary">Meeting Link</span>
                <p className="font-body-md text-body-md text-on-surface font-semibold truncate">
                  {request.meeting_link ? (
                    <a
                      href={request.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-container hover:underline"
                    >
                      {request.meeting_link}
                    </a>
                  ) : (
                    'None provided'
                  )}
                </p>
              </div>
            )}

            {request.cancel_deadline && (
              <div>
                <span className="font-label-sm text-label-sm text-secondary">Cancellation Deadline</span>
                <p className="font-body-md text-body-md text-secondary">
                  {new Date(request.cancel_deadline).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Contact Details (Available only when confirmed or completed) */}
      {isConfirmedOrCompleted && contact && (
        <section
          data-testid="request-contact-section"
          className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md"
        >
          <div className="flex items-center gap-space-xs pb-space-sm border-b border-surface-container-high">
            <span className="material-symbols-outlined text-primary-container text-[20px]">contacts</span>
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              Counterpart Contact Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            <div>
              <span className="font-label-sm text-label-sm text-secondary">Full Name</span>
              <p className="font-body-md text-body-md text-on-surface font-semibold">
                {contact.fname} {contact.lname}
              </p>
              <span className="font-body-sm text-body-sm text-secondary">
                {contact.dept} (Year {contact.year})
              </span>
            </div>

            <div>
              <span className="font-label-sm text-label-sm text-secondary">Phone 1</span>
              <p className="font-body-md text-body-md text-on-surface">
                <strong data-testid="request-contact-phone1">{contact.phone1}</strong>
              </p>
              {contact.phone2 && (
                <p className="font-body-sm text-body-sm text-secondary mt-1">
                  Phone 2: <strong data-testid="request-contact-phone2">{contact.phone2}</strong>
                </p>
              )}
            </div>

            <div>
              <span className="font-label-sm text-label-sm text-secondary">Primary Email</span>
              <p className="font-body-md text-body-md text-on-surface truncate">
                <strong data-testid="request-contact-email1">{contact.email1}</strong>
              </p>
              {contact.email2 && (
                <p className="font-body-sm text-body-sm text-secondary mt-1 truncate">
                  Email 2: <strong data-testid="request-contact-email2">{contact.email2}</strong>
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Feedback Section for Requester on Completed */}
      {feedbackAllowed && (
        <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center gap-space-xs pb-space-sm border-b border-surface-container-high">
            <span className="material-symbols-outlined text-primary-container text-[20px]">rate_review</span>
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              Submit Session Feedback
            </h2>
          </div>

          <form onSubmit={handleFeedbackSubmit} className="flex flex-col gap-space-md max-w-lg">
            <SelectField
              id="detail-feedback-rating"
              label="Rating (1 to 5)"
              data-testid="feedback-rating"
              value={feedbackRating}
              onChange={(e) => setFeedbackRating(Number(e.target.value))}
            >
              <option value={5}>5 - Excellent session</option>
              <option value={4}>4 - Very good</option>
              <option value={3}>3 - Average</option>
              <option value={2}>2 - Below expectations</option>
              <option value={1}>1 - Poor experience</option>
            </SelectField>

            <TextareaField
              id="detail-feedback-comments"
              label="Comments (optional, max 100)"
              maxChars={100}
              data-testid="feedback-comments"
              value={feedbackComments}
              onChange={(e) => setFeedbackComments(e.target.value)}
              placeholder="Share your experience..."
            />

            <Button
              type="submit"
              data-testid="feedback-submit"
              disabled={feedbackMutation.isPending}
              isLoading={feedbackMutation.isPending}
              className="self-start"
            >
              Submit Feedback
            </Button>
          </form>
        </section>
      )}

      {/* Slot Proposal Form Dialog (Frames 38 & 39) */}
      <Dialog
        isOpen={showSlotForm}
        onClose={() => setShowSlotForm(false)}
        title="Propose Meeting Slot"
        description="Choose a date, duration, and whether the session will be in person or online."
      >
        <form onSubmit={handleProposeSlotSubmit} className="flex flex-col gap-space-md">
          <TextField
            id="slot-time"
            label="Meeting Date &amp; Time"
            type="datetime-local"
            required
            data-testid="slot-time"
            value={slotTime}
            onChange={(e) => setSlotTime(e.target.value)}
          />

          <SelectField
            id="slot-duration"
            label="Duration"
            data-testid="slot-duration"
            value={slotDuration}
            onChange={(e) => setSlotDuration(Number(e.target.value) as Duration)}
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
          </SelectField>

          <SelectField
            id="slot-mode"
            label="Mode"
            data-testid="slot-mode"
            value={slotMode}
            onChange={(e) => setSlotMode(e.target.value as Mode)}
          >
            <option value="online">Online (Video link)</option>
            <option value="offline">Offline (Campus location)</option>
          </SelectField>

          {slotMode === 'offline' && (
            <TextField
              id="slot-location"
              label="Location"
              helperText="Campus building, library discussion room, etc."
              required
              maxLength={150}
              data-testid="slot-location"
              value={slotLocation}
              onChange={(e) => setSlotLocation(e.target.value)}
              placeholder="e.g. Central Library 2nd Floor Room B"
            />
          )}

          {slotMode === 'online' && (
            <TextField
              id="slot-link"
              label="Meeting Link (optional)"
              type="url"
              maxLength={200}
              data-testid="slot-link"
              value={slotLink}
              onChange={(e) => setSlotLink(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          )}

          <div className="flex items-center justify-end gap-space-sm pt-space-xs">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowSlotForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="slot-submit"
              disabled={respondMutation.isPending}
              isLoading={respondMutation.isPending}
            >
              Submit Proposed Slot
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Cancel Form Dialog (Frame 40) */}
      <Dialog
        isOpen={showCancelForm}
        onClose={() => setShowCancelForm(false)}
        title="Cancel Session Request"
        description="Please provide a brief reason for cancellation so your peer is informed."
      >
        <form onSubmit={handleCancelSubmit} className="flex flex-col gap-space-md">
          <TextareaField
            id="cancel-reason"
            label="Reason for cancellation"
            required
            maxChars={200}
            data-testid="cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Schedule conflict with exams..."
          />

          <div className="flex items-center justify-end gap-space-sm pt-space-xs">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCancelForm(false)}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="danger"
              data-testid="cancel-submit"
              disabled={cancelMutation.isPending}
              isLoading={cancelMutation.isPending}
            >
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Reject Request Confirmation Dialog (Frame 41) */}
      <Dialog
        isOpen={showRejectConfirm}
        onClose={() => setShowRejectConfirm(false)}
        title="Reject this request?"
        description="The requester will be notified."
      >
        <div className="flex items-center justify-end gap-space-sm pt-space-md">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowRejectConfirm(false)}
            disabled={respondMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={respondMutation.isPending}
            isLoading={respondMutation.isPending}
            onClick={() => respondMutation.mutate({ accept: false })}
          >
            Reject request
          </Button>
        </div>
      </Dialog>

      {/* Decline Slot Confirmation Dialog (Frame 42) */}
      <Dialog
        isOpen={showDeclineConfirm}
        onClose={() => setShowDeclineConfirm(false)}
        title="Decline this slot?"
        description="The request will be closed."
      >
        <div className="flex items-center justify-end gap-space-sm pt-space-md">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowDeclineConfirm(false)}
            disabled={slotAgreeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="hover:text-error hover:border-status-danger-border"
            disabled={slotAgreeMutation.isPending}
            isLoading={slotAgreeMutation.isPending}
            onClick={() => slotAgreeMutation.mutate(false)}
          >
            Decline slot
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

