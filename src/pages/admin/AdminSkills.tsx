import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { normaliseName } from '../../lib/rules';
import { AppError, errorMessages } from '../../lib/types';
import {
  Button,
  TextField,
  SelectField,
  StatusBadge,
  Dialog,
  ErrorBanner,
  Skeleton,
} from '../../components/ui';

export const AdminSkills: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'skills' | 'proposals'>('skills');

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
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
      setShowAddDialog(false);
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
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            Manage Skills
          </h1>
          <p className="font-body-md text-body-md text-secondary mt-1">
            Manage available skills catalogue and review submitted student proposals
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setShowAddDialog(true)}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Skill</span>
        </Button>
      </div>

      {/* Tabs */}
      <nav aria-label="Skills Tabs" className="border-b border-surface-container-high flex items-center gap-space-xl h-12">
        <button
          type="button"
          onClick={() => setActiveTab('skills')}
          className={`h-full px-space-2xs font-label-md text-label-md transition-colors flex items-center gap-2 cursor-pointer -mb-[1px] ${
            activeTab === 'skills'
              ? 'text-primary-container font-semibold border-b-2 border-primary-container'
              : 'text-secondary hover:text-on-surface font-medium'
          }`}
        >
          <span>Existing Skills</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-label-xs font-semibold tabular-nums">
            {skills.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('proposals')}
          className={`h-full px-space-2xs font-label-md text-label-md transition-colors flex items-center gap-2 cursor-pointer -mb-[1px] ${
            activeTab === 'proposals'
              ? 'text-primary-container font-semibold border-b-2 border-primary-container'
              : 'text-secondary hover:text-on-surface font-medium'
          }`}
        >
          <span>Skill Proposals Queue</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-label-xs font-semibold tabular-nums">
            {proposals.length}
          </span>
        </button>
      </nav>

      {/* Errors */}
      {formError && (
        <ErrorBanner
          message={formError}
          data-testid="admin-skill-error"
          onDismiss={() => setFormError(null)}
        />
      )}
      {queueError && (
        <ErrorBanner
          message={queueError}
          data-testid="admin-skillprop-error"
          onDismiss={() => setQueueError(null)}
        />
      )}

      {/* TAB 1: EXISTING SKILLS (Frame 28) */}
      <div className={activeTab === 'skills' ? 'flex flex-col gap-space-lg' : 'hidden'}>
        <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
          <div className="p-space-lg border-b border-surface-container-high flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Existing Skills ({skills.length})
            </h2>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setShowAddDialog(true)}
            >
              Add Skill
            </Button>
          </div>

          {isSkillsLoading ? (
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
                    <th className="py-3 px-space-md font-semibold" scope="col">Skill Name</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Category</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Providers</th>
                    <th className="py-3 px-space-md font-semibold text-right" scope="col">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                  {skills.map((s) => (
                    <tr
                      key={s.skillid}
                      data-testid={`admin-skill-row-${s.skillid}`}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="py-3.5 px-space-md font-mono text-secondary">
                        #{s.skillid}
                      </td>
                      <td className="py-3.5 px-space-md font-semibold text-on-surface">
                        {s.skillname}
                      </td>
                      <td className="py-3.5 px-space-md text-secondary">
                        {s.categoryname}
                      </td>
                      <td className="py-3.5 px-space-md text-secondary tabular-nums">
                        {s.provider_count}
                      </td>
                      <td className="py-3.5 px-space-md text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid={`admin-skill-delete-${s.skillid}`}
                          disabled={deleteSkillMutation.isPending}
                          onClick={() => deleteSkillMutation.mutate(s.skillid)}
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

      {/* TAB 2: SKILL PROPOSALS QUEUE (Frame 29) */}
      <div className={activeTab === 'proposals' ? 'flex flex-col gap-space-lg' : 'hidden'}>
        <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
          <div className="p-space-lg border-b border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Skill Proposals Queue ({proposals.length})
            </h2>

            <div className="flex items-center gap-space-xs">
              <label htmlFor="skillprop-filter" className="font-label-sm text-label-sm text-secondary font-medium">
                Filter Status:
              </label>
              <div className="relative">
                <select
                  id="skillprop-filter"
                  data-testid="admin-skillprop-filter"
                  value={propStatusFilter}
                  onChange={(e) => setPropStatusFilter(e.target.value)}
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

          {isPropLoading ? (
            <div className="p-space-lg flex flex-col gap-space-sm">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : proposals.length === 0 ? (
            <div className="py-space-2xl text-center">
              <p data-testid="admin-skillprop-empty" className="font-body-sm text-body-sm text-secondary">
                No skill proposals in queue.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-space-md font-semibold" scope="col">ID</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Proposed Name</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Category</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Proposer</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Reason</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Status</th>
                    <th className="py-3 px-space-md font-semibold text-right" scope="col">Review Note / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                  {proposals.map((p) => (
                    <tr
                      key={p.skillproposalid}
                      data-testid={`admin-skillprop-row-${p.skillproposalid}`}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="py-3.5 px-space-md font-mono text-secondary">
                        #{p.skillproposalid}
                      </td>
                      <td className="py-3.5 px-space-md font-semibold text-on-surface">
                        {p.proposed_name}
                      </td>
                      <td className="py-3.5 px-space-md text-secondary">
                        {p.categoryname}
                      </td>
                      <td className="py-3.5 px-space-md text-secondary">
                        {p.proposer_name} ({p.proposer_regno})
                      </td>
                      <td className="py-3.5 px-space-md text-secondary max-w-xs truncate">
                        {p.reason || '-'}
                      </td>
                      <td className="py-3.5 px-space-md">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3.5 px-space-md text-right">
                        {p.status === 'pending' ? (
                          <div className="inline-flex items-center gap-space-xs justify-end flex-wrap">
                            <input
                              type="text"
                              placeholder="Review note (optional)"
                              data-testid={`admin-skillprop-note-${p.skillproposalid}`}
                              maxLength={200}
                              value={reviewNotes[p.skillproposalid] ?? ''}
                              onChange={(e) =>
                                setReviewNotes({ ...reviewNotes, [p.skillproposalid]: e.target.value })
                              }
                              className="h-8 px-space-sm bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface w-44 focus:outline-none focus:border-primary-container"
                            />
                            <Button
                              type="button"
                              size="sm"
                              data-testid={`admin-skillprop-approve-${p.skillproposalid}`}
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({
                                  skillproposalid: p.skillproposalid,
                                  approve: true,
                                  note: reviewNotes[p.skillproposalid] || null,
                                })
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              data-testid={`admin-skillprop-reject-${p.skillproposalid}`}
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({
                                  skillproposalid: p.skillproposalid,
                                  approve: false,
                                  note: reviewNotes[p.skillproposalid] || null,
                                })
                              }
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-secondary italic">{p.review_note || '-'}</span>
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

      {/* DIALOG: CREATE SKILL (Frame 46) */}
      <Dialog
        isOpen={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setFormError(null);
        }}
        title="Add Skill"
        description="Add a new skill under an approved subject category."
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-space-md">
          <TextField
            id="new-skill-name"
            label="Skill Name"
            required
            maxLength={30}
            data-testid="admin-skill-name"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="e.g. Data Structures & Algorithms"
          />

          <SelectField
            id="new-skill-cat"
            label="Category"
            required
            data-testid="admin-skill-cat"
            value={newSkillCatId}
            onChange={(e) => setNewSkillCatId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.categoryid} value={c.categoryid}>
                {c.categoryname}
              </option>
            ))}
          </SelectField>

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
              data-testid="admin-skill-submit"
              disabled={createSkillMutation.isPending}
              isLoading={createSkillMutation.isPending}
            >
              Create Skill
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
