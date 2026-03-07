import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { RunProvider } from '@/src/context/RunContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <RunProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
          <Stack.Screen name="class-select"  options={{ headerShown: false }} />
          <Stack.Screen name="map"           options={{ headerShown: false }} />
          <Stack.Screen name="battle"        options={{ headerShown: false }} />
          <Stack.Screen name="reward"        options={{ headerShown: false }} />
          <Stack.Screen name="shop"          options={{ headerShown: false }} />
          <Stack.Screen name="modal"         options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </RunProvider>
  );
}
