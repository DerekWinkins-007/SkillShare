import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { Button, TextField, Skeleton } from '../components/ui';

export const Catalogue: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'browse' | 'myskills'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.catalogue.categories,
    queryFn: () => api.listCategories(),
  });

  const { data: skills = [], isLoading: isSkillsLoading } = useQuery({
    queryKey: queryKeys.catalogue.skills({ categoryid: selectedCategory, search: searchTerm }),
    queryFn: () => api.listSkills({ categoryid: selectedCategory, search: searchTerm }),
  });

  const { data: mySkills = [] } = useQuery({
    queryKey: queryKeys.catalogue.mySkills,
    queryFn: () => api.listMySkills(),
  });

  const addSkillMutation = useMutation({
    mutationFn: (skillid: number) => api.addMySkill(skillid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogue.mySkills });
      queryClient.invalidateQueries({ queryKey: ['catalogue', 'skills'] });
    },
  });

  const removeSkillMutation = useMutation({
    mutationFn: (skillid: number) => api.removeMySkill(skillid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogue.mySkills });
      queryClient.invalidateQueries({ queryKey: ['catalogue', 'skills'] });
    },
  });

  return (
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl flex flex-col gap-space-lg">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            Skill Catalogue
          </h1>
          <p className="font-body-md text-body-md text-secondary mt-1">
            Browse peer skills, offer your own expertise, or propose new subjects.
          </p>
        </div>
        <nav aria-label="Catalogue Actions" className="flex items-center gap-space-xs shrink-0">
          <Link
            to="/proposals"
            className="h-10 px-space-md bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-on-surface font-label-md text-label-md rounded-lg transition-colors flex items-center justify-center font-medium shadow-xs"
          >
            Propose New Category or Skill
          </Link>
        </nav>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-surface-container-high flex items-center gap-space-xl h-12">
        <button
          type="button"
          onClick={() => setActiveTab('browse')}
          className={`h-full px-space-2xs font-label-md text-label-md transition-colors flex items-center gap-2 cursor-pointer -mb-[1px] ${
            activeTab === 'browse'
              ? 'text-primary-container font-semibold border-b-2 border-primary-container'
              : 'text-secondary hover:text-on-surface font-medium'
          }`}
        >
          <span>Browse</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('myskills')}
          className={`h-full px-space-2xs font-label-md text-label-md transition-colors flex items-center gap-2 cursor-pointer -mb-[1px] ${
            activeTab === 'myskills'
              ? 'text-primary-container font-semibold border-b-2 border-primary-container'
              : 'text-secondary hover:text-on-surface font-medium'
          }`}
        >
          <span>My Teaching Skills</span>
          <span
            className={`px-2 py-0.5 rounded-full text-label-xs font-semibold tabular-nums ${
              activeTab === 'myskills'
                ? 'bg-primary-fixed text-on-primary-fixed'
                : 'bg-surface-container text-secondary'
            }`}
          >
            {mySkills.length}
          </span>
        </button>
      </div>

      {/* TAB 1: BROWSE CATALOGUE */}
      <div className={activeTab === 'browse' ? 'flex flex-col md:flex-row items-start gap-gutter-wide' : 'hidden'}>
        {/* Left Column: Categories Sidebar */}
        <aside className="w-full md:w-[260px] shrink-0 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-md shadow-sm">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-space-sm">
              Categories
            </h2>

            {/* Hidden label for select dropdown testid */}
            <div className="mb-space-sm">
              <label htmlFor="cat-filter" className="sr-only">Category Filter</label>
              <select
                id="cat-filter"
                data-testid="catalogue-category-filter"
                value={selectedCategory ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCategory(val ? Number(val) : undefined);
                }}
                className="w-full h-9 px-space-sm bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.categoryid} value={c.categoryid}>
                    {c.categoryname}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedCategory(undefined)}
                className={`h-9 px-space-sm rounded-lg font-label-sm text-label-sm flex items-center justify-between text-left transition-colors cursor-pointer ${
                  selectedCategory === undefined
                    ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                    : 'text-secondary hover:bg-surface-container-low hover:text-on-surface font-medium'
                }`}
              >
                <span>All Categories</span>
                {selectedCategory === undefined && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                )}
              </button>

              {categories.map((c) => {
                const isSelected = selectedCategory === c.categoryid;
                return (
                  <button
                    key={c.categoryid}
                    type="button"
                    onClick={() => setSelectedCategory(c.categoryid)}
                    className={`h-9 px-space-sm rounded-lg font-label-sm text-label-sm flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                        : 'text-secondary hover:bg-surface-container-low hover:text-on-surface font-medium'
                    }`}
                  >
                    <span className="truncate">{c.categoryname}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Column: Search & Available Skills Table */}
        <section className="flex-1 w-full min-w-0 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-md shadow-sm">
            <TextField
              id="search-input"
              label="Search Skill Name"
              placeholder="Search by skill name or topic..."
              leftIcon="search"
              data-testid="catalogue-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
            <div className="p-space-md border-b border-surface-container-high flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Available Skills
              </h2>
              <span className="font-body-sm text-body-sm text-secondary tabular-nums">
                {skills.length} skills found
              </span>
            </div>

            {isSkillsLoading ? (
              <div className="p-space-lg flex flex-col gap-space-md">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : skills.length === 0 ? (
              <div className="py-space-2xl text-center">
                <p data-testid="catalogue-no-skills" className="font-body-sm text-body-sm text-secondary">
                  No skills found matching criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-space-md font-semibold">Skill Name</th>
                      <th className="py-3 px-space-md font-semibold">Category</th>
                      <th className="py-3 px-space-md font-semibold">Providers</th>
                      <th className="py-3 px-space-md font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm">
                    {skills.map((s) => {
                      const isMine = mySkills.some((ms) => ms.skillid === s.skillid);
                      return (
                        <tr
                          key={s.skillid}
                          data-testid={`catalogue-skill-row-${s.skillid}`}
                          className="hover:bg-surface-container-low/50 transition-colors"
                        >
                          <td className="py-3.5 px-space-md font-medium text-on-surface">
                            <Link
                              to={`/skills/${s.skillid}`}
                              className="text-primary-container font-semibold hover:underline"
                            >
                              {s.skillname}
                            </Link>
                          </td>
                          <td className="py-3.5 px-space-md text-secondary">{s.categoryname}</td>
                          <td className="py-3.5 px-space-md text-secondary tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-secondary">group</span>
                              {s.provider_count}
                            </span>
                          </td>
                          <td className="py-3.5 px-space-md text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-space-sm justify-end">
                              <Link
                                to={`/skills/${s.skillid}`}
                                className="font-label-sm text-label-sm text-primary-container hover:underline"
                              >
                                View Providers
                              </Link>
                              <span className="text-outline-variant">•</span>
                              {isMine ? (
                                <button
                                  type="button"
                                  data-testid={`catalogue-skill-remove-${s.skillid}`}
                                  onClick={() => removeSkillMutation.mutate(s.skillid)}
                                  className="h-8 px-space-sm bg-surface-container-lowest border border-outline-variant hover:bg-status-danger-bg hover:text-error hover:border-status-danger-border text-on-surface font-label-sm text-label-sm rounded-lg transition-colors cursor-pointer"
                                >
                                  Remove from My Skills
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  data-testid={`catalogue-skill-add-${s.skillid}`}
                                  onClick={() => addSkillMutation.mutate(s.skillid)}
                                  className="h-8 px-space-sm bg-primary-container hover:bg-primary text-on-primary font-label-sm text-label-sm rounded-lg transition-colors cursor-pointer shadow-2xs"
                                >
                                  Add to My Skills
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* TAB 2: MY TEACHING SKILLS (kept in DOM with hidden/block toggling for test reliability) */}
      <section className={activeTab === 'myskills' ? 'flex flex-col gap-space-md' : 'hidden'}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div>
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              My Teaching Skills ({mySkills.length})
            </h2>
            <p className="font-body-sm text-body-sm text-secondary">
              Skills you offer to teach other students across campus
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setActiveTab('browse')}
            className="self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add More Skills</span>
          </Button>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-lg shadow-sm">
          {mySkills.length === 0 ? (
            <div className="py-space-2xl text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-secondary mb-space-sm">
                school
              </span>
              <p data-testid="catalogue-no-myskills" className="font-body-sm text-body-sm text-secondary">
                You have not added any teaching skills yet.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab('browse')}
                className="mt-space-md"
              >
                Browse catalogue to add skills
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-surface-container-high">
              {mySkills.map((ms) => (
                <div
                  key={ms.skillid}
                  data-testid={`catalogue-myskill-row-${ms.skillid}`}
                  className="py-3.5 flex items-center justify-between gap-space-md"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
                      {ms.skillname}
                    </span>
                    <span className="font-body-sm text-body-sm text-secondary">
                      Category: {ms.categoryname}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid={`catalogue-myskill-remove-${ms.skillid}`}
                    onClick={() => removeSkillMutation.mutate(ms.skillid)}
                    className="hover:text-error hover:border-status-danger-border shrink-0"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
