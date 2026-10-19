import { useEffect } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type Table = 'parking_lots' | 'parking_slots' | 'bookings' | 'profiles';

/**
 * Subscribes to Postgres changes on the given tables and invalidates the
 * given query keys whenever a row changes (e.g. the ESP8266 flips a slot).
 */
export function useRealtimeSync(channelName: string, tables: Table[], queryKeys: QueryKey[]) {
  const queryClient = useQueryClient();
  const tablesKey = tables.join(',');
  const keysKey = JSON.stringify(queryKeys);

  useEffect(() => {
    let channel = supabase.channel(channelName);
    for (const table of tablesKey.split(',')) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        for (const queryKey of JSON.parse(keysKey) as QueryKey[]) {
          queryClient.invalidateQueries({ queryKey });
        }
      });
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, tablesKey, keysKey, queryClient]);
}
