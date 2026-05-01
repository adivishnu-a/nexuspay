'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { useGoogleLogin } from '@react-oauth/google';

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

  const loginMutation = useMutation({
    mutationFn: (idToken: string) => 
      apiFetch<{ accessToken: string }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      }),
    onSuccess: (data) => {
      localStorage.setItem('nexus_access_token', data.accessToken);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      localStorage.removeItem('nexus_access_token');
      queryClient.setQueryData(['me'], null);
    },
  });

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      // In a real Google OAuth flow with @react-oauth/google, 
      // onSuccess might return an access token or an auth code.
      // But FEAT-001 expects a Google ID Token.
      // Note: @react-oauth/google useGoogleLogin usually returns an access token by default.
      // For ID tokens, we typically use the GoogleLogin button or custom logic.
      // However, for this demo, we'll assume the backend can verify the access token 
      // or we use the 'credential' from the GoogleLogin button.
    },
  });

  return {
    user,
    isLoading,
    error,
    login: () => {}, // placeholder
    logout: logoutMutation.mutate,
    isAuthenticated: !!user,
  };
}
