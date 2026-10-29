import { useEffect } from 'react';
import { AppState } from 'react-native';
import { focusManager, QueryClient, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

type Row = { id?: string | number } & Record<string, unknown>;
type Payload = { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: Row; old: Row };

/** Merge a changed row into a cached array (same id -> merged, new id -> appended for INSERT). */
function patchList<T extends { id: string }>(list: T[] | undefined, p: Payload, filter?: (row: T) => boolean): T[] | undefined {
  if (!list) return list;
  const row = p.new as unknown as T;
  if (p.eventType === 'DELETE') return list.filter((x) => x.id !== (p.old.id as string));
  if (filter && !filter(row)) return list;
  if (list.some((x) => x.id === row.id)) return list.map((x) => (x.id === row.id ? { ...x, ...row } : x));
  return p.eventType === 'INSERT' ? [...list, row] : list;
}

function applySlot(qc: QueryClient, p: Payload) {
  const lotId = (p.new.parking_lot_id ?? p.old.parking_lot_id) as string | undefined;
  type Slot = { id: string; parking_lot_id: string };
  // Per-lot slot lists (customer lot screen / admin lot screen)
  for (const key of ['slots', 'lot_slots']) {
    qc.setQueriesData<Slot[]>({ queryKey: [key], predicate: (q) => q.queryKey[1] === lotId }, (old) => patchList(old, p));
  }
  // Multi-lot lists (admin overview): only update rows we already have
  qc.setQueriesData<Slot[]>({ queryKey: ['staff_slots'] }, (old) =>
    old && p.eventType !== 'INSERT' ? patchList(old, p) : old,
  );
}

function applyLot(qc: QueryClient, p: Payload) {
  type Lot = { id: string };
  const id = (p.new.id ?? p.old.id) as string;
  qc.setQueriesData<Lot[]>({ queryKey: ['lots'] }, (old) => patchList(old, p));
  qc.setQueriesData<Lot[]>({ queryKey: ['all_lots'] }, (old) => patchList(old, p));
  qc.setQueriesData<Lot>({ queryKey: ['lot'], predicate: (q) => q.queryKey[1] === id }, (old) => (old && p.eventType !== 'DELETE' ? { ...old, ...(p.new as object) } : old));
}

/**
 * One realtime subscription for the whole app. Changes pushed by the ESP8266 (slots, gate, lots)
 * are written straight into the query cache, so screens update the instant the event arrives,
 * then a debounced refetch reconciles anything that was missed.
 */
export function LiveSync() {
  const qc = useQueryClient();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reconcile = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        for (const key of ['lots', 'all_lots', 'lot', 'slots', 'lot_slots', 'staff_slots', 'gate']) qc.invalidateQueries({ queryKey: [key] });
      }, 2000);
    };

    const channel = supabase
      .channel('live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, (p) => { applySlot(qc, p as unknown as Payload); reconcile(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_lots' }, (p) => { applyLot(qc, p as unknown as Payload); reconcile(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_system' }, (p) => {
        const row = (p as unknown as Payload).new;
        if (row?.id !== undefined) qc.setQueryData(['gate'], row);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        for (const key of ['my_bookings', 'booking', 'all_bookings', 'staff_bookings', 'busy']) qc.invalidateQueries({ queryKey: [key] });
      })
      .subscribe();

    // Coming back to the foreground: realtime may have been asleep, so refetch everything once.
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
      if (state === 'active') qc.invalidateQueries();
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return null;
}
