import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { normaliseName } from '../lib/rules';
import { AppError, errorMessages } from '../lib/types';

export const StudentProposals: React.FC = () => {
  const queryClient = useQueryClient();

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
    <section>
      <h1>Proposals</h1>

      {/* Category Request Form */}
      <section>
        <h2>Propose a New Category</h2>
        {catError && <p role="alert" data-testid="catproposal-error">{catError}</p>}
        <form onSubmit={handleCatSubmit}>
          <div>
            <label htmlFor="cat-name">Proposed Category Name (max 30 chars):</label>
            <input
              id="cat-name"
              type="text"
              data-testid="catproposal-name"
              required
              maxLength={30}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="cat-reason">Reason (optional, max 200 chars):</label>
            <input
              id="cat-reason"
              type="text"
              data-testid="catproposal-reason"
              maxLength={200}
              value={catReason}
              onChange={(e) => setCatReason(e.target.value)}
            />
          </div>
          <button type="submit" data-testid="catproposal-submit" disabled={submitCategoryMutation.isPending}>
            {submitCategoryMutation.isPending ? 'Submitting...' : 'Submit Category Request'}
          </button>
        </form>
      </section>

      {/* Skill Proposal Form */}
      <section>
        <h2>Propose a New Skill</h2>
        {skillError && <p role="alert" data-testid="skillproposal-error">{skillError}</p>}
        <form onSubmit={handleSkillSubmit}>
          <div>
            <label htmlFor="skill-name">Proposed Skill Name (max 30 chars):</label>
            <input
              id="skill-name"
              type="text"
              data-testid="skillproposal-name"
              required
              maxLength={30}
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="skill-cat">Category:</label>
            <select
              id="skill-cat"
              data-testid="skillproposal-cat"
              required
              value={skillCategoryId}
              onChange={(e) => setSkillCategoryId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.categoryid} value={c.categoryid}>
                  {c.categoryname}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="skill-reason">Reason (optional, max 200 chars):</label>
            <input
              id="skill-reason"
              type="text"
              data-testid="skillproposal-reason"
              maxLength={200}
              value={skillReason}
              onChange={(e) => setSkillReason(e.target.value)}
            />
          </div>
          <button type="submit" data-testid="skillproposal-submit" disabled={submitSkillMutation.isPending}>
            {submitSkillMutation.isPending ? 'Submitting...' : 'Submit Skill Proposal'}
          </button>
        </form>
      </section>

      {/* My Category Requests */}
      <section>
        <h2>My Category Requests ({myCatRequests.length})</h2>
        {myCatRequests.length === 0 ? (
          <p>No category requests submitted.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Proposed Name</th>
                <th>Status</th>
                <th>Review Note</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {myCatRequests.map((cr) => (
                <tr key={cr.catrequestid} data-testid={`catproposal-row-${cr.catrequestid}`}>
                  <td>{cr.proposed_name}</td>
                  <td>{cr.status}</td>
                  <td>{cr.review_note || '-'}</td>
                  <td>{new Date(cr.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* My Skill Proposals */}
      <section>
        <h2>My Skill Proposals ({mySkillProposals.length})</h2>
        {mySkillProposals.length === 0 ? (
          <p>No skill proposals submitted.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Proposed Name</th>
                <th>Status</th>
                <th>Review Note</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {mySkillProposals.map((sp) => (
                <tr key={sp.skillproposalid} data-testid={`skillproposal-row-${sp.skillproposalid}`}>
                  <td>{sp.proposed_name}</td>
                  <td>{sp.status}</td>
                  <td>{sp.review_note || '-'}</td>
                  <td>{new Date(sp.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
};
