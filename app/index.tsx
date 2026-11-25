import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AuthScreen } from '../src/components/AuthScreen';
import { useAuth } from '../src/auth/AuthProvider';
import { LoadingAnimation } from '../src/components/LoadingAnimation';
import { useAppTheme } from '../src/ThemeProvider';

export default function IndexScreen() {
  const { isLoading, user } = useAuth();
  const { palette } = useAppTheme();

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: palette.background }]}>
        <LoadingAnimation label="Checking your session" size={42} />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/home" />;
  }

  return <AuthScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
