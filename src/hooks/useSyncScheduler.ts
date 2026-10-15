import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth/useAuth';
import { queryKeys } from '../lib/queryKeys';

export function useSyncScheduler(): void {
  const { me } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!me || me.role !== 'student') return;

    const runSync = async () => {
      try {
        const res = await api.syncCompletedRequests();
        if (res.completed > 0 || res.expired > 0) {
          queryClient.invalidateQueries({ queryKey: queryKeys.requests.myRequests('requester') });
          queryClient.invalidateQueries({ queryKey: queryKeys.requests.myRequests('provider') });
          queryClient.invalidateQueries({ queryKey: queryKeys.requests.feedbackDue });
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list });
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.my });
        }
      } catch (err) {
        console.error('syncCompletedRequests failed:', err);
      }
    };

    // On mount / sign-in
    runSync();

    // Every 60s while tab is visible
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        runSync();
      }
    }, 60000);

    // On visibilitychange to visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [me, queryClient]);
}
