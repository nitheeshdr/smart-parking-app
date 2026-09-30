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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user?.user_metadata?.role) {
        setRole(session.user.user_metadata.role);
      }
      setInitialized(true);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user?.user_metadata?.role) {
        setRole(session.user.user_metadata.role);
      } else if (!session) {
        setRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const role = useAuthStore.getState().role;

    if (!session) {
      if (!inAuthGroup) {
        // Redirect to the login page
        router.replace('/(auth)/login');
      }
    } else if (session && role) {
      // Redirect logged-in users away from the auth screens
      if (inAuthGroup) {
        if (role === 'customer') {
          router.replace('/(customer)/(tabs)/explore');
        } else if (role === 'parking_manager') {
          router.replace('/(manager)/(tabs)/dashboard');
        } else if (role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else {
           // fallback
           router.replace('/(customer)/(tabs)/explore');
        }
      } else {
        // Route protection logic
        const currentGroup = segments[0];
        if (currentGroup === '(customer)' && role !== 'customer') {
          router.replace(role === 'parking_manager' ? '/(manager)/(tabs)/dashboard' : '/(admin)/dashboard');
        } else if (currentGroup === '(manager)' && role !== 'parking_manager') {
          router.replace(role === 'customer' ? '/(customer)/(tabs)/explore' : '/(admin)/dashboard');
        } else if (currentGroup === '(admin)' && role !== 'admin') {
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
          <StatusBar style="auto" />
        </HeroUINativeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
