import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { normaliseName } from '../lib/rules';
import { AppError, errorMessages } from '../lib/types';
import {
  Button,
  TextField,
  SelectField,
  StatusBadge,
  Dialog,
  ErrorBanner,
} from '../components/ui';

export const StudentProposals: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'category' | 'skill'>('category');

  // Dialog open states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showSkillDialog, setShowSkillDialog] = useState(false);

  const [catName, setCatName] = useState('');
  const [catReason, setCatReason] = useState('');
  const [catError, setCatError] = useState<string | null>(null);

  const [skillName, setSkillName] = useState('');
  const [skillCategoryId, setSkillCategoryId] = useState<number | ''>('');
  const [skillReason, setSkillReason] = useState('');
  const [skillError, setSkillError] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.catalogue.categories,
    queryFn: () => api.listCategories(),
  });

  const { data: myCatRequests = [] } = useQuery({
    queryKey: queryKeys.proposals.myCategoryRequests,
    queryFn: () => api.listMyCategoryRequests(),
  });

  const { data: mySkillProposals = [] } = useQuery({
    queryKey: queryKeys.proposals.mySkillProposals,
    queryFn: () => api.listMySkillProposals(),
  });

  const submitCategoryMutation = useMutation({
    mutationFn: async () => {
      const norm = normaliseName(catName);
      if (!norm || norm.length > 30) throw new AppError('VALIDATION', 'Name 1 to 30 characters');
      return await api.submitCategoryRequest({ proposed_name: norm, reason: catReason || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.myCategoryRequests });
      setCatName('');
      setCatReason('');
      setCatError(null);
      setShowCategoryDialog(false);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setCatError(errorMessages[err.code] || err.message);
      } else {
        setCatError('Submission failed');
      }
    },
  });

  const submitSkillMutation = useMutation({
    mutationFn: async () => {
      const norm = normaliseName(skillName);
      if (!norm || norm.length > 30) throw new AppError('VALIDATION', 'Name 1 to 30 characters');
      if (!skillCategoryId) throw new AppError('VALIDATION', 'Category is required');
      return await api.submitSkillProposal({
        proposed_name: norm,
        categoryid: Number(skillCategoryId),
        reason: skillReason || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.mySkillProposals });
      setSkillName('');
      setSkillReason('');
      setSkillCategoryId('');
      setSkillError(null);
      setShowSkillDialog(false);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setSkillError(errorMessages[err.code] || err.message);
      } else {
        setSkillError('Submission failed');
      }
    },
  });

  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCategoryMutation.mutate();
  };

  const handleSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSkillMutation.mutate();
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            Proposals
          </h1>
          <p className="font-body-md text-body-md text-secondary mt-1">
            Request new curriculum categories or propose skills for administrative review
          </p>
        </div>

        <div className="flex items-center gap-space-xs flex-wrap">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowCategoryDialog(true)}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Request New Category</span>
          </Button>

          <Button
            type="button"
            onClick={() => setShowSkillDialog(true)}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Propose New Skill</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav aria-label="Proposals Tabs" className="border-b border-surface-container-high flex items-center gap-space-xl h-12">
        <button
          type="button"
          onClick={() => setActiveTab('category')}
          className={`h-full px-space-2xs font-label-md text-label-md transition-colors flex items-center gap-2 cursor-pointer -mb-[1px] ${
            activeTab === 'category'
              ? 'text-primary-container font-semibold border-b-2 border-primary-container'
              : 'text-secondary hover:text-on-surface font-medium'
          }`}
        >
          <span>Category Requests</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-label-xs font-semibold tabular-nums">
            {myCatRequests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('skill')}
          className={`h-full px-space-2xs font-label-md text-label-md transition-colors flex items-center gap-2 cursor-pointer -mb-[1px] ${
            activeTab === 'skill'
              ? 'text-primary-container font-semibold border-b-2 border-primary-container'
              : 'text-secondary hover:text-on-surface font-medium'
          }`}
        >
          <span>Skill Proposals</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-label-xs font-semibold tabular-nums">
            {mySkillProposals.length}
          </span>
        </button>
      </nav>

      {/* TAB 1: CATEGORY REQUESTS */}
      <div className={activeTab === 'category' ? 'flex flex-col gap-space-lg' : 'hidden'}>
        <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
          <div className="p-space-lg border-b border-surface-container-high flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              My Category Requests ({myCatRequests.length})
            </h2>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setShowCategoryDialog(true)}
            >
              Request a New Category
            </Button>
          </div>

          {myCatRequests.length === 0 ? (
            <div className="py-space-2xl text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-secondary mb-space-sm">
                category
              </span>
              <p className="font-body-sm text-body-sm text-secondary">
                No category requests submitted.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-space-md font-semibold" scope="col">Proposed Name</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Status</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Review Note</th>
                    <th className="py-3 px-space-md font-semibold text-right" scope="col">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                  {myCatRequests.map((cr) => (
                    <tr
                      key={cr.catrequestid}
                      data-testid={`catproposal-row-${cr.catrequestid}`}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="py-3.5 px-space-md font-semibold text-on-surface">
                        {cr.proposed_name}
                      </td>
                      <td className="py-3.5 px-space-md">
                        <StatusBadge status={cr.status} />
                      </td>
                      <td className="py-3.5 px-space-md text-secondary">
                        {cr.review_note || '-'}
                      </td>
                      <td className="py-3.5 px-space-md text-right text-secondary tabular-nums">
                        {new Date(cr.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* TAB 2: SKILL PROPOSALS */}
      <div className={activeTab === 'skill' ? 'flex flex-col gap-space-lg' : 'hidden'}>
        <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
          <div className="p-space-lg border-b border-surface-container-high flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              My Skill Proposals ({mySkillProposals.length})
            </h2>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowSkillDialog(true)}
            >
              Propose a New Skill
            </Button>
          </div>

          {mySkillProposals.length === 0 ? (
            <div className="py-space-2xl text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-secondary mb-space-sm">
                school
              </span>
              <p className="font-body-sm text-body-sm text-secondary">
                No skill proposals submitted.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-space-md font-semibold" scope="col">Proposed Name</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Status</th>
                    <th className="py-3 px-space-md font-semibold" scope="col">Review Note</th>
                    <th className="py-3 px-space-md font-semibold text-right" scope="col">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                  {mySkillProposals.map((sp) => (
                    <tr
                      key={sp.skillproposalid}
                      data-testid={`skillproposal-row-${sp.skillproposalid}`}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="py-3.5 px-space-md font-semibold text-on-surface">
                        {sp.proposed_name}
                      </td>
                      <td className="py-3.5 px-space-md">
                        <StatusBadge status={sp.status} />
                      </td>
                      <td className="py-3.5 px-space-md text-secondary">
                        {sp.review_note || '-'}
                      </td>
                      <td className="py-3.5 px-space-md text-right text-secondary tabular-nums">
                        {new Date(sp.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* DIALOG 1: REQUEST NEW CATEGORY (Frame 34) */}
      <Dialog
        isOpen={showCategoryDialog}
        onClose={() => {
          setShowCategoryDialog(false);
          setCatError(null);
        }}
        title="Request a New Category"
        description="Propose a top-level subject category for the SkillShare directory."
      >
        {catError && (
          <div className="mb-space-md">
            <ErrorBanner
              message={catError}
              data-testid="catproposal-error"
              onDismiss={() => setCatError(null)}
            />
          </div>
        )}

        <form onSubmit={handleCatSubmit} className="flex flex-col gap-space-md">
          <TextField
            id="cat-name"
            label="Proposed Category Name"
            required
            maxLength={30}
            data-testid="catproposal-name"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="e.g. Graphic Design"
          />

          <TextField
            id="cat-reason"
            label="Reason (optional, max 200 chars)"
            maxLength={200}
            data-testid="catproposal-reason"
            value={catReason}
            onChange={(e) => setCatReason(e.target.value)}
            placeholder="Why should this category be added?"
          />

          <div className="flex items-center justify-end gap-space-sm pt-space-xs">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCategoryDialog(false);
                setCatError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="catproposal-submit"
              disabled={submitCategoryMutation.isPending}
              isLoading={submitCategoryMutation.isPending}
            >
              Submit Category Request
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DIALOG 2: PROPOSE NEW SKILL (Frame 35) */}
      <Dialog
        isOpen={showSkillDialog}
        onClose={() => {
          setShowSkillDialog(false);
          setSkillError(null);
        }}
        title="Propose a New Skill"
        description="Submit a specific topic or skill to add under an existing category."
      >
        {skillError && (
          <div className="mb-space-md">
            <ErrorBanner
              message={skillError}
              data-testid="skillproposal-error"
              onDismiss={() => setSkillError(null)}
            />
          </div>
        )}

        <form onSubmit={handleSkillSubmit} className="flex flex-col gap-space-md">
          <TextField
            id="skill-name"
            label="Proposed Skill Name"
            required
            maxLength={30}
            data-testid="skillproposal-name"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            placeholder="e.g. Blender 3D Modelling"
          />

          <SelectField
            id="skill-cat"
            label="Category"
            required
            data-testid="skillproposal-cat"
            value={skillCategoryId}
            onChange={(e) => setSkillCategoryId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.categoryid} value={c.categoryid}>
                {c.categoryname}
              </option>
            ))}
          </SelectField>

          <TextField
            id="skill-reason"
            label="Reason (optional, max 200 chars)"
            maxLength={200}
            data-testid="skillproposal-reason"
            value={skillReason}
            onChange={(e) => setSkillReason(e.target.value)}
            placeholder="Describe what learners will gain..."
          />

          <div className="flex items-center justify-end gap-space-sm pt-space-xs">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowSkillDialog(false);
                setSkillError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="skillproposal-submit"
              disabled={submitSkillMutation.isPending}
              isLoading={submitSkillMutation.isPending}
            >
              Submit Skill Proposal
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
