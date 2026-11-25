import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import { InventoryDashboard } from '../src/components/InventoryDashboard';
import { UserManagement } from '../src/components/UserManagement';
import { colors, fontFamilies } from '../src/theme';

type Section = 'inventory' | 'users';

export default function HomeScreen() {
  const { user, accessToken, updateCredentials, logout } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;
  const [section, setSection] = useState<Section>('inventory');
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!user || !accessToken) {
    return <Redirect href="/" />;
  }
  const signedInUser = user;

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
    } catch (logoutError) {
      console.error('Sign-out could not be completed on the server.', logoutError);
    } finally {
      router.replace('/');
      setBusy(false);
    }
  }

  async function handleCredentialUpdate() {
    setError(null);
    if (email.trim().toLowerCase() === signedInUser.email.toLowerCase()) {
      setError('Enter a different email address to secure this account.');
      return;
    }
    if (password.length < 12) {
      setError('Use at least 12 characters for the new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await updateCredentials(currentPassword, email.trim(), password);
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update credentials.');
    } finally {
      setBusy(false);
    }
  }

  function navigate(nextSection: Section) {
    setSection(nextSection);
    setMenuOpen(false);
  }

  if (signedInUser.mustChangeCredentials) {
    return (
      <SafeAreaView style={styles.gatePage}>
        <ScrollView contentContainerStyle={styles.gateScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.gateCard}>
            <Brand />
            <View style={styles.gatePill}>
              <View style={styles.gatePillDot} />
              <Text style={styles.gatePillText}>SECURE YOUR NEW ACCOUNT</Text>
            </View>
            <Text style={styles.gateTitle}>Change your sign-in details.</Text>
            <Text style={styles.gateDescription}>
              This first-use admin account must use a new email address and password before you can
              continue.
            </Text>
            <Field label="Current temporary password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            <Field label="New email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Field label="New password (12+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
            <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <PrimaryButton title="Update email and password" busy={busy} onPress={() => void handleCredentialUpdate()} />
            <Text style={styles.gateHint}>Changing your credentials signs out any other active sessions.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.app, !isDesktop && styles.mobileApp]}>
      {isDesktop ? (
        <Sidebar user={signedInUser} section={section} onNavigate={navigate} onLogout={() => void handleLogout()} busy={busy} />
      ) : (
        <MobileHeader user={signedInUser} onOpenMenu={() => setMenuOpen(true)} />
      )}

      <View style={styles.main}>
        <View style={styles.topbar}>
          <View>
            <Text style={styles.topbarEyebrow}>STOCKMATE CAFÉ</Text>
            <Text style={styles.topbarTitle}>
              {section === 'inventory' ? 'Inventory overview' : 'Team access'}
            </Text>
          </View>
          <View style={styles.topbarUser}>
            <View style={styles.topbarAvatar}>
              <Text style={styles.topbarAvatarText}>
                {signedInUser.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.topbarName}>{signedInUser.name}</Text>
              <Text style={styles.topbarRole}>
                {signedInUser.role === 'superadmin' ? 'Superadmin' : 'Admin'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {section === 'inventory' ? (
            <InventoryDashboard accessToken={accessToken} />
          ) : (
            <UserManagement accessToken={accessToken} role={signedInUser.role} />
          )}
          <Text style={styles.footer}>StockMate · Your Inventory, Your Control.</Text>
        </ScrollView>
      </View>

      {!isDesktop ? (
        <Modal
          animationType="slide"
          onRequestClose={() => setMenuOpen(false)}
          transparent
          visible={menuOpen}
        >
          <View style={styles.mobileMenuBackdrop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close navigation"
              onPress={() => setMenuOpen(false)}
              style={styles.menuDismiss}
            />
            <View style={styles.mobileMenu}>
              <Sidebar
                user={signedInUser}
                section={section}
                onNavigate={navigate}
                onLogout={() => void handleLogout()}
                busy={busy}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.brand, compact && styles.brandCompact]}>
      <Image source={require('../assets/icon.png')} style={styles.brandIcon} />
      <View>
        <Text style={styles.brandName}>StockMate</Text>
        <Text style={styles.brandTagline}>Your Inventory, Your Control.</Text>
      </View>
    </View>
  );
}

function MobileHeader({
  user,
  onOpenMenu,
}: {
  user: { name: string };
  onOpenMenu: () => void;
}) {
  return (
    <View style={styles.mobileHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open navigation" onPress={onOpenMenu} style={styles.menuButton}>
        <Text style={styles.menuButtonText}>☰</Text>
      </Pressable>
      <Brand compact />
      <View style={styles.mobileUser}>
        <Text style={styles.mobileUserText}>{user.name.slice(0, 1).toUpperCase()}</Text>
      </View>
    </View>
  );
}

function Sidebar({
  user,
  section,
  onNavigate,
  onLogout,
  busy,
}: {
  user: { name: string; email: string; role: 'admin' | 'superadmin' };
  section: Section;
  onNavigate: (section: Section) => void;
  onLogout: () => void;
  busy: boolean;
}) {
  return (
    <View style={styles.sidebar}>
      <Brand />
      <Text style={styles.navCaption}>WORKSPACE</Text>
      <NavButton
        icon="▦"
        label="Inventory"
        selected={section === 'inventory'}
        onPress={() => onNavigate('inventory')}
      />
      <NavButton
        icon="♙"
        label="User management"
        selected={section === 'users'}
        onPress={() => onNavigate('users')}
      />
      <View style={styles.sidebarBottom}>
        <View style={styles.sidebarProfile}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text numberOfLines={1} style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileRole}>{user.role === 'superadmin' ? 'SUPERADMIN' : 'ADMIN'}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.profileEmail}>{user.email}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
        >
          {busy ? <ActivityIndicator size="small" color={colors.dirtyOrange} /> : <Text style={styles.logoutText}>↪  Sign out</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function NavButton({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navButton,
        selected && styles.navSelected,
        pressed && styles.navPressed,
      ]}
    >
      <Text style={[styles.navIcon, selected && styles.navIconSelected]}>{icon}</Text>
      <Text style={[styles.navText, selected && styles.navTextSelected]}>{label}</Text>
      {selected ? <View style={styles.navIndicator} /> : null}
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function PrimaryButton({
  title,
  busy,
  onPress,
}: {
  title: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
    >
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, flexDirection: 'row', backgroundColor: colors.boneWhite },
  mobileApp: { flexDirection: 'column' },
  sidebar: {
    width: 248,
    flexShrink: 0,
    paddingHorizontal: 17,
    paddingTop: 22,
    paddingBottom: 15,
    backgroundColor: colors.paper,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginBottom: 34 },
  brandCompact: { marginBottom: 0 },
  brandIcon: { width: 37, height: 37, borderRadius: 13 },
  brandName: { color: colors.ink, fontSize: 14, fontFamily: fontFamilies.bold },
  brandTagline: { color: colors.muted, fontSize: 8, fontFamily: fontFamilies.regular, marginTop: 1 },
  navCaption: { color: colors.muted, fontSize: 8, letterSpacing: 1.1, fontFamily: fontFamilies.semiBold, marginBottom: 9, paddingHorizontal: 10 },
  navButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 11, borderRadius: 10, marginBottom: 4, overflow: 'hidden' },
  navSelected: { backgroundColor: '#fff0e5' },
  navPressed: { opacity: 0.78 },
  navIcon: { width: 19, textAlign: 'center', color: colors.muted, fontSize: 15 },
  navIconSelected: { color: colors.pumpkinOrange },
  navText: { flex: 1, color: colors.muted, fontSize: 10, fontFamily: fontFamilies.medium },
  navTextSelected: { color: colors.dirtyOrange, fontFamily: fontFamilies.semiBold },
  navIndicator: { width: 3, height: 24, borderRadius: 2, position: 'absolute', right: 0, backgroundColor: colors.pumpkinOrange },
  sidebarBottom: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 15 },
  sidebarProfile: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  profileAvatar: { width: 31, height: 31, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbf2cf' },
  profileAvatarText: { color: colors.dirtyOrange, fontSize: 11, fontFamily: fontFamilies.bold },
  profileCopy: { flex: 1 },
  profileName: { color: colors.ink, fontSize: 9, fontFamily: fontFamilies.semiBold },
  profileRole: { color: colors.muted, fontSize: 7, letterSpacing: 0.6, fontFamily: fontFamilies.medium, marginTop: 3 },
  profileEmail: { color: colors.muted, fontSize: 8, fontFamily: fontFamilies.regular, marginTop: 9, paddingLeft: 40 },
  logoutButton: { minHeight: 36, justifyContent: 'center', marginTop: 10, paddingHorizontal: 10, borderRadius: 8 },
  logoutPressed: { backgroundColor: colors.boneWhite },
  logoutText: { color: colors.muted, fontSize: 9, fontFamily: fontFamilies.medium },
  main: { flex: 1, minWidth: 0 },
  topbar: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 26, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.paper },
  topbarEyebrow: { color: colors.muted, fontSize: 7, letterSpacing: 1.1, fontFamily: fontFamilies.semiBold },
  topbarTitle: { color: colors.ink, fontSize: 15, fontFamily: fontFamilies.semiBold, marginTop: 3 },
  topbarUser: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  topbarAvatar: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbf2cf' },
  topbarAvatarText: { color: colors.dirtyOrange, fontSize: 11, fontFamily: fontFamilies.bold },
  topbarName: { color: colors.ink, fontSize: 9, fontFamily: fontFamilies.semiBold },
  topbarRole: { color: colors.muted, fontSize: 8, fontFamily: fontFamilies.regular, marginTop: 2 },
  contentScroll: { flex: 1 },
  content: { width: '100%', maxWidth: 1500, alignSelf: 'center', padding: 25, gap: 17 },
  footer: { color: colors.muted, fontSize: 8, textAlign: 'center', fontFamily: fontFamilies.regular, marginTop: 2 },
  mobileHeader: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.paper },
  menuButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#fff0e5' },
  menuButtonText: { color: colors.dirtyOrange, fontSize: 16 },
  mobileUser: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', backgroundColor: '#fbf2cf' },
  mobileUserText: { color: colors.dirtyOrange, fontSize: 10, fontFamily: fontFamilies.bold },
  mobileMenuBackdrop: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(33, 29, 26, 0.36)' },
  menuDismiss: { flex: 1 },
  mobileMenu: { width: 260, maxWidth: '84%', backgroundColor: colors.paper },
  gatePage: { flex: 1, backgroundColor: colors.boneWhite },
  gateScroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  gateCard: { width: '100%', maxWidth: 500, alignSelf: 'center', padding: 25, borderWidth: 1, borderColor: colors.line, borderRadius: 22, backgroundColor: colors.paper },
  gatePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 99, backgroundColor: '#fbf2cf' },
  gatePillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.dirtyOrange },
  gatePillText: { color: colors.dirtyOrange, fontSize: 9, letterSpacing: 0.8, fontFamily: fontFamilies.bold },
  gateTitle: { color: colors.ink, fontSize: 23, fontFamily: fontFamilies.bold, marginTop: 15 },
  gateDescription: { color: colors.muted, fontSize: 11, lineHeight: 18, fontFamily: fontFamilies.regular, marginTop: 6, marginBottom: 16 },
  field: { marginBottom: 12 },
  fieldLabel: { color: colors.ink, fontSize: 9, fontFamily: fontFamilies.semiBold, marginBottom: 6 },
  input: { height: 44, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.paper, color: colors.ink, fontSize: 10, fontFamily: fontFamilies.regular },
  error: { color: colors.danger, fontSize: 10, fontFamily: fontFamilies.medium, marginBottom: 10 },
  primaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.pumpkinOrange },
  primaryButtonPressed: { opacity: 0.85 },
  primaryButtonText: { color: '#fff', fontSize: 10, fontFamily: fontFamilies.semiBold },
  gateHint: { color: colors.muted, fontSize: 9, lineHeight: 15, fontFamily: fontFamilies.regular, marginTop: 12 },
});
