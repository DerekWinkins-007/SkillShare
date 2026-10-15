import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { queryKeys } from '../queryKeys';
import { AuthContext } from './context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: me = null, isLoading } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api.getMe(),
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    const unsubscribe = api.onAuthChange((updatedMe) => {
      queryClient.setQueryData(queryKeys.auth.me, updatedMe);
      queryClient.invalidateQueries();
    });
    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  const signOut = async () => {
    await api.signOut();
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ me, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
