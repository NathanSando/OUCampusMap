import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { queryKeys } from './useCampusData';

/**
 * Subscribes to changes on the `reports` table so new reports appear on every device
 * without a refresh (design doc §9.2). Realtime payloads carry raw PostGIS values,
 * so we simply refetch the lat/lng view on any change.
 */
export function useReportsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel('reports-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      })
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [queryClient]);
}
