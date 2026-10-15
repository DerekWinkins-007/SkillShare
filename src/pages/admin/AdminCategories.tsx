import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { normaliseName } from '../../lib/rules';
import { AppError, errorMessages } from '../../lib/types';

export const AdminCategories: React.FC = () => {
  const queryClient = useQueryClient();

  const [newCatName, setNewCatName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

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
    <section>
      <h1>Manage Categories</h1>

      {/* Create Category Form */}
      <section>
        <h2>Create Category</h2>
        {formError && <p role="alert" data-testid="admin-cat-error">{formError}</p>}
        <form onSubmit={handleCreateSubmit}>
          <div>
            <label htmlFor="new-cat-name">Category Name (max 30 chars):</label>
            <input
              id="new-cat-name"
              type="text"
              data-testid="admin-cat-name"
              required
              maxLength={30}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
          </div>
          <button type="submit" data-testid="admin-cat-submit" disabled={createCatMutation.isPending}>
            {createCatMutation.isPending ? 'Creating...' : 'Create Category'}
          </button>
        </form>
      </section>

      {/* Existing Categories Table */}
      <section>
        <h2>Existing Categories ({categories.length})</h2>
        {isCatLoading ? (
          <p>Loading categories...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Category Name</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.categoryid} data-testid={`admin-cat-row-${c.categoryid}`}>
                  <td>{c.categoryid}</td>
                  <td>{c.categoryname}</td>
                  <td>
                    <button
                      type="button"
                      data-testid={`admin-cat-delete-${c.categoryid}`}
                      disabled={deleteCatMutation.isPending}
                      onClick={() => deleteCatMutation.mutate(c.categoryid)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Category Requests Review Queue */}
      <section>
        <h2>Category Review Queue</h2>
        {queueError && <p role="alert" data-testid="admin-catreq-error">{queueError}</p>}

        <div>
          <label htmlFor="catreq-filter">Filter Status:</label>
          <select
            id="catreq-filter"
            data-testid="admin-catreq-filter"
            value={reqStatusFilter}
            onChange={(e) => setReqStatusFilter(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>

        {isReqLoading ? (
          <p>Loading queue...</p>
        ) : requests.length === 0 ? (
          <p data-testid="admin-catreq-empty">No category requests in queue.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Proposed Name</th>
                <th>Proposer</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Review Note / Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.catrequestid} data-testid={`admin-catreq-row-${r.catrequestid}`}>
                  <td>#{r.catrequestid}</td>
                  <td>{r.proposed_name}</td>
                  <td>{r.proposer_name} ({r.proposer_regno})</td>
                  <td>{r.reason || '-'}</td>
                  <td>{r.status}</td>
                  <td>
                    {r.status === 'pending' ? (
                      <div>
                        <input
                          type="text"
                          placeholder="Review note (optional)"
                          data-testid={`admin-catreq-note-${r.catrequestid}`}
                          maxLength={200}
                          value={reviewNotes[r.catrequestid] ?? ''}
                          onChange={(e) =>
                            setReviewNotes({ ...reviewNotes, [r.catrequestid]: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          data-testid={`admin-catreq-approve-${r.catrequestid}`}
                          onClick={() =>
                            reviewMutation.mutate({
                              catrequestid: r.catrequestid,
                              approve: true,
                              note: reviewNotes[r.catrequestid] || null,
                            })
                          }
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          data-testid={`admin-catreq-reject-${r.catrequestid}`}
                          onClick={() =>
                            reviewMutation.mutate({
                              catrequestid: r.catrequestid,
                              approve: false,
                              note: reviewNotes[r.catrequestid] || null,
                            })
                          }
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span>{r.review_note || '-'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
};
