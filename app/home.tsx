import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import { colors, fontFamilies } from '../src/theme';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!user) {
    return <Redirect href="/" />;
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
    } catch (error) {
      console.error('Sign-out could not be completed on the server.', error);
    } finally {
      router.replace('/');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <Image source={require('../assets/icon.png')} style={styles.brandIcon} />
          <View>
            <Text style={styles.brand}>StockMate</Text>
            <Text style={styles.tagline}>Your Inventory, Your Control.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.pill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>ACCOUNT READY</Text>
          </View>
          <Text style={styles.heading}>Good to have you, {user.name.split(' ')[0]}.</Text>
          <Text style={styles.description}>
            Your StockMate account is ready. This is your starting point for a more organized stock day.
          </Text>

          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>SIGNED IN AS</Text>
            <Text style={styles.accountEmail}>{user.email}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handleLogout()}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            {busy ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.buttonText}>Sign out</Text>
            )}
          </Pressable>
        </View>
        <Text style={styles.footer}>Private by design. Your credentials stay protected.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.boneWhite },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 25 },
  brandIcon: { width: 43, height: 43, borderRadius: 13 },
  brand: { color: colors.ink, fontSize: 17, fontFamily: fontFamilies.bold },
  tagline: { color: colors.muted, fontSize: 10, fontFamily: fontFamilies.regular },
  card: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 23,
    padding: 27,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: '#fff3d4',
  },
  pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.dirtyOrange },
  pillText: {
    color: colors.dirtyOrange,
    fontSize: 9,
    letterSpacing: 0.8,
    fontFamily: fontFamilies.bold,
  },
  heading: {
    color: colors.ink,
    fontSize: 27,
    lineHeight: 37,
    fontFamily: fontFamilies.bold,
    marginTop: 16,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: fontFamilies.regular,
    marginTop: 8,
    marginBottom: 24,
  },
  accountRow: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: 17,
    marginBottom: 22,
  },
  accountLabel: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: fontFamilies.semiBold,
    marginBottom: 5,
  },
  accountEmail: { color: colors.ink, fontSize: 14, fontFamily: fontFamilies.medium },
  button: {
    minHeight: 51,
    borderRadius: 12,
    backgroundColor: colors.pumpkinOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.86 },
  buttonText: { color: colors.ink, fontSize: 14, fontFamily: fontFamilies.bold },
  footer: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: fontFamilies.regular,
    marginTop: 22,
  },
});
