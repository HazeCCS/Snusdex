import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/store';
import AuthScreen from '@/components/auth/AuthScreen';
import { Session } from '@supabase/supabase-js';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const setAuth = useStore(s => s.setAuth);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const username =
          session.user.user_metadata?.username ||
          session.user.email?.split('@')[0] || '';
        setAuth(session.user.id, session.user.email ?? null, username);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        const username =
          session.user.user_metadata?.username ||
          session.user.email?.split('@')[0] || '';
        setAuth(session.user.id, session.user.email ?? null, username);
      } else {
        setAuth(null, null, '');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session !== undefined) {
      SplashScreen.hideAsync();
    }
  }, [session]);

  if (session === undefined) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (!session) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <AuthScreen onAuthenticated={() => {}} />
      </GestureHandlerRootView>
    );
  }

  // Check if user needs username setup (Google OAuth without username)
  const needsUsername = session.user && !session.user.user_metadata?.username;
  if (needsUsername) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <AuthScreen initialView="username" onAuthenticated={() => {}} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
