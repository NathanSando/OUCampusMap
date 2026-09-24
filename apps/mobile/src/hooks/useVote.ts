import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from './useCampusData';

/** Voting requires sign-in; signed-out users are sent to sign in first. */
export function useVote() {
  const { session, available } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, vote }: { id: string; vote: 1 | -1 }) => api.vote(id, vote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
    onError: (err) =>
      Alert.alert('Vote not counted', err instanceof Error ? err.message : 'Try again.'),
  });

  const vote = (id: string, value: 1 | -1) => {
    if (!available) {
      Alert.alert('Accounts unavailable', 'Voting needs the app connected to Supabase.');
      return;
    }
    if (!session) {
      router.push({ pathname: '/auth/sign-in', params: { reason: 'vote' } });
      return;
    }
    mutation.mutate({ id, vote: value });
  };

  return { vote, pendingId: mutation.isPending ? mutation.variables?.id : undefined };
}
