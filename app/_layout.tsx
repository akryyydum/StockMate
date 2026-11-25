import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { Animated, StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import { AuthProvider } from '../src/auth/AuthProvider';
import { ThemeProvider, useAppTheme } from '../src/ThemeProvider';
import { StartupLoadingAnimation } from '../src/components/LoadingAnimation';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      console.error('Could not load Poppins fonts; using the platform fallback.', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return <StartupLoadingAnimation label="Preparing StockMate" />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const { mode, palette, transitionOpacity } = useAppTheme();
  return (
    <View style={[styles.app, { backgroundColor: palette.background }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Animated.View style={[styles.stack, { opacity: transitionOpacity }]}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  stack: { flex: 1 },
});
