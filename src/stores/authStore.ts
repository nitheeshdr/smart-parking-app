import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type UserRole = 'customer' | 'parking_manager' | 'admin' | null;

interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole;
  isInitialized: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole) => void;
  setInitialized: (isInitialized: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  isInitialized: false,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, role: null });
  },
}));
