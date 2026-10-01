import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

import '../global.css';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { session, isInitialized, setSession, setUser, setRole, setInitialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Initial session fetch
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        let role = session.user.user_metadata?.role;
        if (!role) {
          try {
            const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
            if (data?.role) role = data.role;
          } catch (e) {}
        }
        setRole(role || 'customer');
      } else {
        setRole(null);
      }
      setInitialized(true);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        let role = session.user.user_metadata?.role;
        if (!role) {
          try {
            const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
            if (data?.role) role = data.role;
          } catch (e) {}
        }
        setRole(role || 'customer');
      } else {
        setRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const rootSegment = segments[0];
    const inAuthGroup = rootSegment === '(auth)';
    const isAtRoot = !rootSegment || (rootSegment as string) === 'index';
    const role = useAuthStore.getState().role || 'customer';

    if (!session) {
      if (!inAuthGroup) {
        // Redirect to the login page
        router.replace('/(auth)/login');
      }
    } else if (session) {
      // Redirect logged-in users away from auth screens or root index screen
      if (inAuthGroup || isAtRoot) {
        if (role === 'customer') {
          router.replace('/(customer)/(tabs)/explore');
        } else if (role === 'parking_manager') {
          router.replace('/(manager)/(tabs)/dashboard');
        } else if (role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else {
          router.replace('/(customer)/(tabs)/explore');
        }
      } else {
        // Route protection logic
        if (rootSegment === '(customer)' && role !== 'customer') {
          router.replace(role === 'parking_manager' ? '/(manager)/(tabs)/dashboard' : '/(admin)/dashboard');
        } else if (rootSegment === '(manager)' && role !== 'parking_manager') {
          router.replace(role === 'customer' ? '/(customer)/(tabs)/explore' : '/(admin)/dashboard');
        } else if (rootSegment === '(admin)' && role !== 'admin') {
          router.replace(role === 'customer' ? '/(customer)/(tabs)/explore' : '/(manager)/(tabs)/dashboard');
        }
      }
    }
  }, [session, isInitialized, segments]);

  if (!isInitialized) {
    return null; // Or a splash screen
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <HeroUINativeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(customer)" options={{ headerShown: false }} />
            <Stack.Screen name="(manager)" options={{ headerShown: false }} />
            <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="dark" />
        </HeroUINativeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
