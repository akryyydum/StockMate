import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { getThemeColors, ThemeColors, ThemeMode } from './theme';

type ThemeContextValue = {
  mode: ThemeMode;
  palette: ThemeColors;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'stockmate-theme-mode';

async function readMode(): Promise<ThemeMode | null> {
  const value = Platform.OS === 'web'
    ? localStorage.getItem(STORAGE_KEY)
    : await SecureStore.getItemAsync(STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

async function saveMode(mode: ThemeMode) {
  if (Platform.OS === 'web') {
    localStorage.setItem(STORAGE_KEY, mode);
  } else {
    await SecureStore.setItemAsync(STORAGE_KEY, mode);
  }
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    let active = true;
    readMode()
      .then((savedMode) => {
        if (active && savedMode) setMode(savedMode);
      })
      .catch((error: unknown) => {
        console.error('Unable to restore the saved appearance preference.', error);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    palette: getThemeColors(mode),
    toggleMode: () => {
      const nextMode = mode === 'light' ? 'dark' : 'light';
      setMode(nextMode);
      saveMode(nextMode).catch((error: unknown) => {
        console.error('Unable to save the appearance preference.', error);
      });
    },
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useAppTheme must be used within ThemeProvider.');
  }
  return theme;
}
