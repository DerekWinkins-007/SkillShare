import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { normaliseName } from '../../lib/rules';
import { AppError, errorMessages } from '../../lib/types';

export const AdminSkills: React.FC = () => {
  const queryClient = useQueryClient();

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCatId, setNewSkillCatId] = useState<number | ''>('');
  const [formError, setFormError] = useState<string | null>(null);

  const [propStatusFilter, setPropStatusFilter] = useState<string>('pending');
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [queueError, setQueueError] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.catalogue.categories,
    queryFn: () => api.listCategories(),
  });

  const { data: skills = [], isLoading: isSkillsLoading } = useQuery({
    queryKey: queryKeys.catalogue.skills(),
    queryFn: () => api.listSkills(),
  });

  const { data: proposals = [], isLoading: isPropLoading } = useQuery({
    queryKey: queryKeys.admin.skillProposals(propStatusFilter),
    queryFn: () => api.adminListSkillProposals(propStatusFilter === 'all' ? null : propStatusFilter),
  });

  const createSkillMutation = useMutation({
    mutationFn: (payload: { name: string; categoryid: number }) => api.adminCreateSkill(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogue', 'skills'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      setNewSkillName('');
      setNewSkillCatId('');
      setFormError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setFormError(errorMessages[err.code] || err.message);
      } else {
        setFormError('Failed to create skill');
      }
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: (id: number) => api.adminDeleteSkill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogue', 'skills'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      setFormError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setFormError(errorMessages[err.code] || err.message);
      } else {
        setFormError('Failed to delete skill');
      }
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { skillproposalid: number; approve: boolean; note?: string | null }) =>
      api.adminReviewSkillProposal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'skillProposals'] });
      queryClient.invalidateQueries({ queryKey: ['catalogue', 'skills'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      setQueueError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setQueueError(errorMessages[err.code] || err.message);
      } else {
        setQueueError('Failed to review skill proposal');
      }
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const norm = normaliseName(newSkillName);
    if (!norm) {
      setFormError('Skill name is required');
      return;
    }
    if (!newSkillCatId) {
      setFormError('Category is required');
      return;
    }
    createSkillMutation.mutate({ name: norm, categoryid: Number(newSkillCatId) });
  };

  return (
    <section>
      <h1>Manage Skills</h1>

      {/* Create Skill Form */}
      <section>
        <h2>Create Skill</h2>
        {formError && <p role="alert" data-testid="admin-skill-error">{formError}</p>}
        <form onSubmit={handleCreateSubmit}>
          <div>
            <label htmlFor="new-skill-name">Skill Name (max 30 chars):</label>
            <input
              id="new-skill-name"
              type="text"
              data-testid="admin-skill-name"
              required
              maxLength={30}
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="new-skill-cat">Category:</label>
            <select
              id="new-skill-cat"
              data-testid="admin-skill-cat"
              required
              value={newSkillCatId}
              onChange={(e) => setNewSkillCatId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.categoryid} value={c.categoryid}>
                  {c.categoryname}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" data-testid="admin-skill-submit" disabled={createSkillMutation.isPending}>
            {createSkillMutation.isPending ? 'Creating...' : 'Create Skill'}
          </button>
        </form>
      </section>

      {/* Existing Skills Table */}
      <section>
        <h2>Existing Skills ({skills.length})</h2>
        {isSkillsLoading ? (
          <p>Loading skills...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Skill Name</th>
                <th>Category</th>
                <th>Providers</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((s) => (
                <tr key={s.skillid} data-testid={`admin-skill-row-${s.skillid}`}>
                  <td>{s.skillid}</td>
                  <td>{s.skillname}</td>
                  <td>{s.categoryname}</td>
                  <td>{s.provider_count}</td>
                  <td>
                    <button
                      type="button"
                      data-testid={`admin-skill-delete-${s.skillid}`}
                      disabled={deleteSkillMutation.isPending}
                      onClick={() => deleteSkillMutation.mutate(s.skillid)}
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

      {/* Skill Proposals Review Queue */}
      <section>
        <h2>Skill Proposals Queue</h2>
        {queueError && <p role="alert" data-testid="admin-skillprop-error">{queueError}</p>}

        <div>
          <label htmlFor="skillprop-filter">Filter Status:</label>
          <select
            id="skillprop-filter"
            data-testid="admin-skillprop-filter"
            value={propStatusFilter}
            onChange={(e) => setPropStatusFilter(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>

        {isPropLoading ? (
          <p>Loading queue...</p>
        ) : proposals.length === 0 ? (
          <p data-testid="admin-skillprop-empty">No skill proposals in queue.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Proposed Name</th>
                <th>Category</th>
                <th>Proposer</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Review Note / Action</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.skillproposalid} data-testid={`admin-skillprop-row-${p.skillproposalid}`}>
                  <td>#{p.skillproposalid}</td>
                  <td>{p.proposed_name}</td>
                  <td>{p.categoryname}</td>
                  <td>{p.proposer_name} ({p.proposer_regno})</td>
                  <td>{p.reason || '-'}</td>
                  <td>{p.status}</td>
                  <td>
                    {p.status === 'pending' ? (
                      <div>
                        <input
                          type="text"
                          placeholder="Review note (optional)"
                          data-testid={`admin-skillprop-note-${p.skillproposalid}`}
                          maxLength={200}
                          value={reviewNotes[p.skillproposalid] ?? ''}
                          onChange={(e) =>
                            setReviewNotes({ ...reviewNotes, [p.skillproposalid]: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          data-testid={`admin-skillprop-approve-${p.skillproposalid}`}
                          onClick={() =>
                            reviewMutation.mutate({
                              skillproposalid: p.skillproposalid,
                              approve: true,
                              note: reviewNotes[p.skillproposalid] || null,
                            })
                          }
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          data-testid={`admin-skillprop-reject-${p.skillproposalid}`}
                          onClick={() =>
                            reviewMutation.mutate({
                              skillproposalid: p.skillproposalid,
                              approve: false,
                              note: reviewNotes[p.skillproposalid] || null,
                            })
                          }
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span>{p.review_note || '-'}</span>
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
