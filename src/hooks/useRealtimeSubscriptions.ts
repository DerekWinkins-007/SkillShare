import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth/useAuth';
import { queryKeys } from '../lib/queryKeys';

export function useRealtimeSubscriptions(): void {
  const { me } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!me) return;

    if (me.role === 'student' && me.student) {
      const studentid = me.student.studentid;
      const unsubscribe = api.subscribeMyNotifications(studentid, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list });
        queryClient.invalidateQueries({ queryKey: queryKeys.requests.myRequests('requester') });
        queryClient.invalidateQueries({ queryKey: queryKeys.requests.myRequests('provider') });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.my });
      });
      return () => {
        unsubscribe();
      };
    } else if (me.role === 'admin') {
      const unsubscribe = api.subscribeAdminQueues(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'categoryRequests'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'skillProposals'] });
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      });
      return () => {
        unsubscribe();
      };
    }
  }, [me, queryClient]);
}
