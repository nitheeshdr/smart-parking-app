import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types/db';

interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  fullName: string;
  isInitialized: boolean;
  /** Applies a Supabase session: loads the role from the profiles table (never from client-editable metadata). */
  applySession: (session: Session | null) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  fullName: '',
  isInitialized: false,

  applySession: async (session) => {
    if (!session?.user) {
      set({ session: null, user: null, role: null, fullName: '', isInitialized: true });
      return;
    }
    const { data } = await supabase.from('profiles').select('role, full_name, status').eq('id', session.user.id).maybeSingle();
    if (data?.status === 'suspended') {
      await supabase.auth.signOut();
      set({ session: null, user: null, role: null, fullName: '', isInitialized: true });
      return;
    }
    set({
      session,
      user: session.user,
      role: (data?.role as UserRole | undefined) ?? 'customer',
      fullName: data?.full_name ?? session.user.email ?? '',
      isInitialized: true,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, role: null, fullName: '' });
  },
}));

export const homeRouteFor = (role: UserRole | null) =>
  role === 'admin' ? '/(admin)/dashboard' : '/(customer)/(tabs)/explore';
