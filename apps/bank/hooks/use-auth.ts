'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  hasAccount: boolean;
  hasVpa: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: () => apiFetch<UserProfile>('/auth/me'),
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      localStorage.removeItem('nexus_access_token');
      queryClient.setQueryData(['me'], null);
    },
  });

  return {
    user,
    isLoading,
    error,
    logout: logoutMutation.mutate,
    isAuthenticated: !!user,
  };
}
