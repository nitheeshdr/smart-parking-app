import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { homeRouteFor, useAuthStore } from '../stores/authStore';
import { LiveSync } from '../lib/live-sync';

import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnReconnect: true } },
});

const GROUP_FOR_ROLE = { customer: '(customer)', admin: '(admin)' } as const;

export default function RootLayout() {
  const { session, role, isInitialized, applySession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Keep the store in sync with Supabase auth.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'TOKEN_REFRESHED') return;
      queryClient.clear();
      // Defer: Supabase forbids awaiting other Supabase calls inside this callback.
      setTimeout(() => applySession(next), 0);
    });
    return () => subscription.unsubscribe();
  }, [applySession]);

  // Route by auth state + role.
  useEffect(() => {
    if (!isInitialized) return;
    const group = segments[0] as string | undefined;
    const inAuth = group === '(auth)';
    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }
    const allowed = GROUP_FOR_ROLE[role ?? 'customer'];
    if (inAuth || !group || group === 'index' || group !== allowed) {
      router.replace(homeRouteFor(role) as never);
    }
  }, [session, role, isInitialized, segments, router]);

  if (!isInitialized) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <HeroUINativeProvider>
            {session ? <LiveSync /> : null}
            <Stack screenOptions={{ headerShown: false }} />
            <StatusBar style="dark" />
          </HeroUINativeProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
