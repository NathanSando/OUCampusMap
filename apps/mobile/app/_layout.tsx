import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';
import { useReportsRealtime } from '@/hooks/useReportsRealtime';
import { AuthProvider } from '@/providers/AuthProvider';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.crimsonBright,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.crimsonBright,
  },
};

function RealtimeBridge() {
  useReportsRealtime();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Fall back to system fonts rather than blocking if the font bundle fails to load.
  if (!fontsLoaded && !fontError) return null;

  const modalHeader = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.textPrimary,
    headerTitleStyle: { fontFamily: fonts.semibold },
    headerShadowVisible: false,
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider value={navTheme}>
              <RealtimeBridge />
              <StatusBar style="light" />
              <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="building/[id]"
                  options={{ presentation: 'modal', title: 'Building', ...modalHeader }}
                />
                <Stack.Screen
                  name="report/new"
                  options={{
                    presentation: 'modal',
                    title: 'Report campus condition',
                    ...modalHeader,
                  }}
                />
                <Stack.Screen
                  name="directions"
                  options={{ title: 'Walking directions', ...modalHeader }}
                />
                <Stack.Screen
                  name="auth/sign-in"
                  options={{ presentation: 'modal', title: 'Sign in', ...modalHeader }}
                />
                <Stack.Screen
                  name="auth/sign-up"
                  options={{ presentation: 'modal', title: 'Create account', ...modalHeader }}
                />
              </Stack>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
