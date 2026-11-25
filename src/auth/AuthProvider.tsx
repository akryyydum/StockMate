import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiError, authApi, User } from './authApi';

const REFRESH_TOKEN_KEY = 'stockmate.refresh-token';

type Credentials = {
  accessToken: string;
  refreshToken: string;
};

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  startupError: string | null;
  login: (email: string, password: string) => Promise<void>;
  updateCredentials: (
    currentPassword: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

async function saveRefreshToken(token: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  }
}

async function clearRefreshToken(): Promise<void> {
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startupError, setStartupError] = useState<string | null>(null);

  const acceptSession = useCallback(async (session: Credentials & { user: User }) => {
    await saveRefreshToken(session.refreshToken);
    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
    setUser(session.user);
    setStartupError(null);
  }, []);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        const refreshToken = await readRefreshToken();
        if (refreshToken) {
          const session = await authApi.refresh(refreshToken);
          if (active) {
            await acceptSession(session);
          }
        }
      } catch (error) {
        if (active) {
          if (error instanceof ApiError && error.status === 401) {
            try {
              await clearRefreshToken();
              setRefreshToken(null);
            } catch (storageError) {
              setStartupError(
                storageError instanceof Error
                  ? storageError.message
                  : 'Unable to clear the expired session from this device.',
              );
              return;
            }
          }
          setStartupError(
            error instanceof Error ? error.message : 'Unable to restore your session.',
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    void restoreSession();
    return () => {
      active = false;
    };
  }, [acceptSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login(email, password);
      await acceptSession(session);
    },
    [acceptSession],
  );

  const updateCredentials = useCallback(
    async (currentPassword: string, email: string, password: string) => {
      if (!accessToken) {
        throw new Error('Sign in before updating your credentials.');
      }
      const session = await authApi.updateCredentials(
        accessToken,
        currentPassword,
        email,
        password,
      );
      await acceptSession(session);
    },
    [accessToken, acceptSession],
  );

  const logout = useCallback(async () => {
    let logoutError: unknown;
    try {
      const tokenToRevoke = refreshToken ?? (await readRefreshToken());
      await authApi.logout(tokenToRevoke);
    } catch (error) {
      logoutError = error;
    }
    try {
      await clearRefreshToken();
    } catch (error) {
      logoutError ??= error;
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    }
    if (logoutError) {
      setStartupError(
        `Signed out on this device, but the server could not revoke the session: ${
          logoutError instanceof Error ? logoutError.message : 'request failed'
        }`,
      );
      throw logoutError;
    }
  }, [refreshToken]);

  const value = useMemo(
    () => ({ user, accessToken, isLoading, startupError, login, updateCredentials, logout }),
    [user, accessToken, isLoading, startupError, login, updateCredentials, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
