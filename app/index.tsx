import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthScreen } from '../src/components/AuthScreen';
import { useAuth } from '../src/auth/AuthProvider';

export default function IndexScreen() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1f6947" />
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
    backgroundColor: '#f5f7f2',
  },
});
