import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { RequestView } from '../lib/types';
import { useAuth } from '../lib/auth/useAuth';

// In-memory set of dismissed request IDs for current browser session
const dismissedInSession = new Set<number>();

export function useFeedbackPrompt(): {
  promptItem: RequestView | null;
  dismissPrompt: () => void;
} {
  const { me } = useAuth();
  const [, setDismissedCount] = useState(0);

  const { data: feedbackDue = [] } = useQuery({
    queryKey: queryKeys.requests.feedbackDue,
    queryFn: () => api.listFeedbackDue(),
    enabled: !!me && me.role === 'student' && me.profile_complete,
    staleTime: 1000 * 30,
  });

  // Oldest due item (feedbackDue is newest first, so oldest is at end, or sort by requestdate asc)
  const undismissed = feedbackDue
    .filter((req) => !dismissedInSession.has(req.requestid))
    .sort((a, b) => a.requestdate.localeCompare(b.requestdate));

  const promptItem = undismissed.length > 0 ? undismissed[0] : null;

  const dismissPrompt = () => {
    if (promptItem) {
      dismissedInSession.add(promptItem.requestid);
      setDismissedCount((c) => c + 1);
    }
  };

  return { promptItem, dismissPrompt };
}
