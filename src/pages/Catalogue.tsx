import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export const Catalogue: React.FC = () => {
  const queryClient = useQueryClient();
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
    <section>
      <h1>Skill Catalogue</h1>

      <nav>
        <ul>
          <li><Link to="/proposals">Propose New Category or Skill</Link></li>
        </ul>
      </nav>

      <section>
        <h2>My Teaching Skills ({mySkills.length})</h2>
        {mySkills.length === 0 ? (
          <p data-testid="catalogue-no-myskills">You have not added any teaching skills yet.</p>
        ) : (
          <ul>
            {mySkills.map((ms) => (
              <li key={ms.skillid} data-testid={`catalogue-myskill-row-${ms.skillid}`}>
                <span>{ms.skillname} ({ms.categoryname})</span>
                <button
                  type="button"
                  data-testid={`catalogue-myskill-remove-${ms.skillid}`}
                  onClick={() => removeSkillMutation.mutate(ms.skillid)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Search &amp; Filter</h2>
        <div>
          <label htmlFor="cat-filter">Category:</label>
          <select
            id="cat-filter"
            data-testid="catalogue-category-filter"
            value={selectedCategory ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCategory(val ? Number(val) : undefined);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.categoryid} value={c.categoryid}>
                {c.categoryname}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="search-input">Search Skill Name:</label>
          <input
            id="search-input"
            type="text"
            data-testid="catalogue-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </section>

      <section>
        <h2>Available Skills</h2>
        {isSkillsLoading ? (
          <p>Loading catalogue...</p>
        ) : skills.length === 0 ? (
          <p data-testid="catalogue-no-skills">No skills found matching criteria.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Skill Name</th>
                <th>Category</th>
                <th>Providers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((s) => {
                const isMine = mySkills.some((ms) => ms.skillid === s.skillid);
                return (
                  <tr key={s.skillid} data-testid={`catalogue-skill-row-${s.skillid}`}>
                    <td>
                      <Link to={`/skills/${s.skillid}`}>{s.skillname}</Link>
                    </td>
                    <td>{s.categoryname}</td>
                    <td>{s.provider_count}</td>
                    <td>
                      <Link to={`/skills/${s.skillid}`}>View Providers</Link>
                      {' | '}
                      {isMine ? (
                        <button
                          type="button"
                          data-testid={`catalogue-skill-remove-${s.skillid}`}
                          onClick={() => removeSkillMutation.mutate(s.skillid)}
                        >
                          Remove from My Skills
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`catalogue-skill-add-${s.skillid}`}
                          onClick={() => addSkillMutation.mutate(s.skillid)}
                        >
                          Add to My Skills
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
};
