import {
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AudioProvider } from '@/audio/AudioProvider';
import { LiveDock } from '@/components/LiveDock';
import { C } from '@/constants/theme';
import { EegProvider } from '@/eeg/EegProvider';
import { AppProvider, useApp } from '@/store/AppStore';
import { SyncProvider } from '@/sync/SyncProvider';

SplashScreen.preventAutoHideAsync();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, card: C.surface, primary: C.focus, text: C.text } };

function Shell() {
  const { ready } = useApp();
  const [fonts] = useFonts({ Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  const loaded = ready && fonts;
  const [kb, setKb] = useState(false);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  // Give forms the full height while the on-screen keyboard is up.
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setKb(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setKb(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: C.bg } }} />
      </View>
      {!kb && <LiveDock />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <AppProvider>
            <SyncProvider>
            <EegProvider>
              <AudioProvider>
                <StatusBar style="dark" />
                <Shell />
              </AudioProvider>
            </EegProvider>
            </SyncProvider>
          </AppProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
