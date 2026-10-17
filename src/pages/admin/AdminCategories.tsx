import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { normaliseName } from '../../lib/rules';
import { AppError, errorMessages } from '../../lib/types';
import {
  Button,
  TextField,
  StatusBadge,
  Dialog,
  ErrorBanner,
  Skeleton,
} from '../../components/ui';

export const AdminCategories: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'categories' | 'requests'>('categories');

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation state (Frame 45)
  const [deleteTargetCat, setDeleteTargetCat] = useState<{ id: number; name: string } | null>(null);

  const [reqStatusFilter, setReqStatusFilter] = useState<string>('pending');
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [queueError, setQueueError] = useState<string | null>(null);

  const { data: categories = [], isLoading: isCatLoading } = useQuery({
    queryKey: queryKeys.catalogue.categories,
    queryFn: () => api.listCategories(),
  });

  const { data: requests = [], isLoading: isReqLoading } = useQuery({
    queryKey: queryKeys.admin.categoryRequests(reqStatusFilter),
    queryFn: () => api.adminListCategoryRequests(reqStatusFilter === 'all' ? null : reqStatusFilter),
  });

  const createCatMutation = useMutation({
    mutationFn: (name: string) => api.adminCreateCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogue.categories });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      setNewCatName('');
      setFormError(null);
      setShowAddDialog(false);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setFormError(errorMessages[err.code] || err.message);
      } else {
        setFormError('Failed to create category');
      }
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: number) => api.adminDeleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogue.categories });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      setDeleteTargetCat(null);
      setFormError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setFormError(errorMessages[err.code] || err.message);
      } else {
        setFormError('Failed to delete category');
      }
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { catrequestid: number; approve: boolean; note?: string | null }) =>
      api.adminReviewCategoryRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categoryRequests'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogue.categories });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      setQueueError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setQueueError(errorMessages[err.code] || err.message);
      } else {
        setQueueError('Failed to review category request');
      }
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const norm = normaliseName(newCatName);
    if (!norm) {
      setFormError('Category name is required');
      return;
    }
    createCatMutation.mutate(norm);
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            Manage Categories
          </h1>
          <p className="font-body-md text-body-md text-secondary mt-1">
            Oversee top-level categories and review student category requests
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setShowAddDialog(true)}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Category</span>
        </Button>
      </div>

      {/* Tabs */}
      <nav aria-label="Categories Tabs" className="border-b border-surface-container-high flex items-center gap-space-xl h-12">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`h-full px-space-2xs font-label-md text-label-md transition-colors flex items-center gap-2 cursor-pointer -mb-[1px] ${
            activeTab === 'categories'
              ? 'text-primary-container font-semibold border-b-2 border-primary-container'
              : 'text-secondary hover:text-on-surface font-medium'
          }`}
        >
          <span>Existing Categories</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-label-xs font-semibold tabular-nums">
            {categories.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`h-full px-space-2xs font-label-md text-label-md transition-colors flex items-center gap-2 cursor-pointer -mb-[1px] ${
            activeTab === 'requests'
              ? 'text-primary-container font-semibold border-b-2 border-primary-container'
              : 'text-secondary hover:text-on-surface font-medium'
          }`}
        >
          <span>Category Requests Queue</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-label-xs font-semibold tabular-nums">
            {requests.length}
          </span>
        </button>
      </nav>

      {/* Errors */}
      {formError && (
        <ErrorBanner
          message={formError}
          data-testid="admin-cat-error"
          onDismiss={() => setFormError(null)}
        />
      )}
      {queueError && (
        <ErrorBanner
          message={queueError}
          data-testid="admin-catreq-error"
          onDismiss={() => setQueueError(null)}
        />
      )}

      {/* TAB 1: EXISTING CATEGORIES (Frame 26) */}
      <div className={activeTab === 'categories' ? 'flex flex-col gap-space-lg' : 'hidden'}>
        <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
          <div className="p-space-lg border-b border-surface-container-high flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Existing Categories ({categories.length})
            </h2>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setShowAddDialog(true)}
            >
              Add Category
            </Button>
          </div>

          {isCatLoading ? (
            <div className="p-space-lg flex flex-col gap-space-sm">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-space-md font-semibold" scope="col">ID</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Category Name</th>
                    <th className="py-3 px-space-md font-semibold text-right" scope="col">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                  {categories.map((c) => (
                    <tr
                      key={c.categoryid}
                      data-testid={`admin-cat-row-${c.categoryid}`}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="py-3.5 px-space-md font-mono text-secondary">
                        #{c.categoryid}
                      </td>
                      <td className="py-3.5 px-space-md font-medium text-on-surface">
                        {c.categoryname}
                      </td>
                      <td className="py-3.5 px-space-md text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid={`admin-cat-delete-${c.categoryid}`}
                          disabled={deleteCatMutation.isPending}
                          onClick={() => setDeleteTargetCat({ id: c.categoryid, name: c.categoryname })}
                          className="hover:text-error hover:border-status-danger-border"
                        >
                          Delete
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

      {/* TAB 2: CATEGORY REQUESTS QUEUE (Frame 27) */}
      <div className={activeTab === 'requests' ? 'flex flex-col gap-space-lg' : 'hidden'}>
        <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
          <div className="p-space-lg border-b border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Category Review Queue ({requests.length})
            </h2>

            <div className="flex items-center gap-space-xs">
              <label htmlFor="catreq-filter" className="font-label-sm text-label-sm text-secondary font-medium">
                Filter Status:
              </label>
              <div className="relative">
                <select
                  id="catreq-filter"
                  data-testid="admin-catreq-filter"
                  value={reqStatusFilter}
                  onChange={(e) => setReqStatusFilter(e.target.value)}
                  className="h-9 px-space-sm pr-8 bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-on-surface appearance-none focus:outline-none focus:border-primary-container cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-secondary text-[18px] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {isReqLoading ? (
            <div className="p-space-lg flex flex-col gap-space-sm">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : requests.length === 0 ? (
            <div className="py-space-2xl text-center">
              <p data-testid="admin-catreq-empty" className="font-body-sm text-body-sm text-secondary">
                No category requests in queue.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-space-md font-semibold" scope="col">ID</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Proposed Name</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Proposer</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Reason</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Status</th>
                    <th className="py-3 px-space-md font-semibold text-right" scope="col">Review Note / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                  {requests.map((r) => (
                    <tr
                      key={r.catrequestid}
                      data-testid={`admin-catreq-row-${r.catrequestid}`}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="py-3.5 px-space-md font-mono text-secondary">
                        #{r.catrequestid}
                      </td>
                      <td className="py-3.5 px-space-md font-semibold text-on-surface">
                        {r.proposed_name}
                      </td>
                      <td className="py-3.5 px-space-md text-secondary">
                        {r.proposer_name} ({r.proposer_regno})
                      </td>
                      <td className="py-3.5 px-space-md text-secondary max-w-xs truncate">
                        {r.reason || '-'}
                      </td>
                      <td className="py-3.5 px-space-md">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-3.5 px-space-md text-right">
                        {r.status === 'pending' ? (
                          <div className="inline-flex items-center gap-space-xs justify-end flex-wrap">
                            <input
                              type="text"
                              placeholder="Review note (optional)"
                              data-testid={`admin-catreq-note-${r.catrequestid}`}
                              maxLength={200}
                              value={reviewNotes[r.catrequestid] ?? ''}
                              onChange={(e) =>
                                setReviewNotes({ ...reviewNotes, [r.catrequestid]: e.target.value })
                              }
                              className="h-8 px-space-sm bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface w-44 focus:outline-none focus:border-primary-container"
                            />
                            <Button
                              type="button"
                              size="sm"
                              data-testid={`admin-catreq-approve-${r.catrequestid}`}
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({
                                  catrequestid: r.catrequestid,
                                  approve: true,
                                  note: reviewNotes[r.catrequestid] || null,
                                })
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              data-testid={`admin-catreq-reject-${r.catrequestid}`}
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({
                                  catrequestid: r.catrequestid,
                                  approve: false,
                                  note: reviewNotes[r.catrequestid] || null,
                                })
                              }
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-secondary italic">{r.review_note || '-'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* DIALOG: CREATE CATEGORY (Frame 44) */}
      <Dialog
        isOpen={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setFormError(null);
        }}
        title="Add Category"
        description="Create a new high-level skill category for the institution."
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-space-md">
          <TextField
            id="new-cat-name"
            label="Category Name"
            required
            maxLength={30}
            data-testid="admin-cat-name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g. Design & Multimedia"
          />

          <div className="flex items-center justify-end gap-space-sm pt-space-xs">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddDialog(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="admin-cat-submit"
              disabled={createCatMutation.isPending}
              isLoading={createCatMutation.isPending}
            >
              Create Category
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DIALOG: DELETE CATEGORY CONFIRMATION (Frame 45) */}
      <Dialog
        isOpen={deleteTargetCat !== null}
        onClose={() => setDeleteTargetCat(null)}
        title="Delete this category?"
        description={`"${deleteTargetCat?.name ?? ''}" will be permanently removed. Any skills in this category will also be affected.`}
      >
        <div className="flex items-center justify-end gap-space-sm pt-space-xs">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDeleteTargetCat(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            data-testid="admin-cat-delete-confirm"
            disabled={deleteCatMutation.isPending}
            isLoading={deleteCatMutation.isPending}
            onClick={() => deleteTargetCat && deleteCatMutation.mutate(deleteTargetCat.id)}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
