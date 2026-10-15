export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  profile: {
    public: (studentid: number) => ['profile', 'public', studentid] as const,
    feedbackReceived: (studentid: number) => ['profile', 'feedbackReceived', studentid] as const,
  },
  catalogue: {
    categories: ['catalogue', 'categories'] as const,
    skills: (params?: { categoryid?: number; search?: string }) =>
      ['catalogue', 'skills', params?.categoryid ?? null, params?.search ?? null] as const,
    skillProviders: (skillid: number) => ['catalogue', 'providers', skillid] as const,
    mySkills: ['catalogue', 'mySkills'] as const,
  },
  proposals: {
    myCategoryRequests: ['proposals', 'myCategoryRequests'] as const,
    mySkillProposals: ['proposals', 'mySkillProposals'] as const,
  },
  admin: {
    categoryRequests: (status?: string | null) => ['admin', 'categoryRequests', status ?? 'all'] as const,
    skillProposals: (status?: string | null) => ['admin', 'skillProposals', status ?? 'all'] as const,
    students: ['admin', 'students'] as const,
    requests: (status?: string | null) => ['admin', 'requests', status ?? 'all'] as const,
    stats: ['admin', 'stats'] as const,
  },
  requests: {
    myRequests: (role: 'requester' | 'provider', status?: string | null) =>
      ['requests', 'my', role, status ?? 'all'] as const,
    detail: (requestid: number) => ['requests', 'detail', requestid] as const,
    contact: (requestid: number) => ['requests', 'contact', requestid] as const,
    feedbackDue: ['requests', 'feedbackDue'] as const,
  },
  dashboard: {
    my: ['dashboard', 'my'] as const,
  },
  notifications: {
    list: ['notifications', 'list'] as const,
  },
  reports: {
    report: (n: number, dept?: string | null) => ['reports', n, dept ?? 'all'] as const,
  },
};
