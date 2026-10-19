import { supabase } from '../lib/supabase';

/** Calls a SECURITY DEFINER function that returns {status:'success'|'error', message?, ...}. */
export async function rpc<T extends Record<string, unknown> = Record<string, unknown>>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  const res = data as { status?: string; message?: string } | null;
  if (!res || res.status === 'error') throw new Error(res?.message ?? 'Request failed.');
  return res as unknown as T;
}

/** Unwraps a Supabase query result, throwing on error. */
export function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}
