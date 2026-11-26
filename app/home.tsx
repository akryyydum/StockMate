import { Redirect, useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import LayoutDashboard from 'lucide-react-native/icons/layout-dashboard';
import LogOut from 'lucide-react-native/icons/log-out';
import Menu from 'lucide-react-native/icons/menu';
import Moon from 'lucide-react-native/icons/moon';
import Package from 'lucide-react-native/icons/package';
import Sun from 'lucide-react-native/icons/sun';
import UsersRound from 'lucide-react-native/icons/users-round';
import { useEffect, useState } from 'react';
import {
  Animated,
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
import { Dashboard } from '../src/components/Dashboard';
import { InventoryDashboard } from '../src/components/InventoryDashboard';
import { LoadingAnimation } from '../src/components/LoadingAnimation';
import { UserManagement } from '../src/components/UserManagement';
import { useAppTheme } from '../src/ThemeProvider';
import { fontFamilies, ThemeColors } from '../src/theme';

type Section = 'dashboard' | 'inventory' | 'users';

export default function HomeScreen() {
  const { user, accessToken, updateCredentials, logout } = useAuth();
  const { palette, mode, toggleMode } = useAppTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;
  const [sidebarWidth] = useState(() => new Animated.Value(248));
  const [section, setSection] = useState<Section>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const styles = createStyles(palette);

  useEffect(() => {
    Animated.timing(sidebarWidth, {
      toValue: sidebarCollapsed ? 76 : 248,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [sidebarCollapsed, sidebarWidth]);

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
        <Animated.View style={[styles.sidebarFrame, { width: sidebarWidth }]}>
          <Sidebar
            user={signedInUser}
            section={section}
            onNavigate={navigate}
            onLogout={() => void handleLogout()}
            busy={busy}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
          />
        </Animated.View>
      ) : (
        <MobileHeader onOpenMenu={() => setMenuOpen(true)} />
      )}

      <View style={styles.main}>
        <View style={styles.topbar}>
          <View>
            <Text style={styles.topbarEyebrow}>STOCKMATE CAFÉ</Text>
            <Text style={styles.topbarTitle}>
              {section === 'dashboard'
                ? 'Dashboard'
                : section === 'inventory'
                  ? 'Inventory overview'
                  : 'Team access'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
            onPress={toggleMode}
            style={({ pressed }) => [styles.themeToggle, pressed && styles.navPressed]}
          >
            {mode === 'light'
              ? <Moon size={18} color={palette.dirtyOrange} strokeWidth={1.9} />
              : <Sun size={18} color={palette.dirtyOrange} strokeWidth={1.9} />}
          </Pressable>
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <PageTransition key={section}>
            {section === 'dashboard' ? (
              <Dashboard accessToken={accessToken} />
            ) : section === 'inventory' ? (
              <InventoryDashboard accessToken={accessToken} />
            ) : (
              <UserManagement accessToken={accessToken} role={signedInUser.role} currentUserId={signedInUser.id} />
            )}
          </PageTransition>
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
            <Animated.View style={[styles.mobileMenu, { width: sidebarWidth }]}>
              <Sidebar
                user={signedInUser}
                section={section}
                onNavigate={navigate}
                onLogout={() => void handleLogout()}
                busy={busy}
                collapsed={sidebarCollapsed}
                onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
              />
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

function Brand({ compact = false, showText = true }: { compact?: boolean; showText?: boolean }) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <View style={[styles.brand, compact && styles.brandCompact]}>
      <Image source={require('../assets/icon.png')} style={styles.brandIcon} />
      {showText ? (
        <View>
          <Text style={styles.brandName}>StockMate</Text>
          <Text style={styles.brandTagline}>Your Inventory, Your Control.</Text>
        </View>
      ) : null}
    </View>
  );
}

function MobileHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <View style={styles.mobileHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open navigation" onPress={onOpenMenu} style={styles.menuButton}>
        <Menu size={19} color={palette.dirtyOrange} strokeWidth={2} />
      </Pressable>
      <Brand compact />
    </View>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function Sidebar({
  user,
  section,
  onNavigate,
  onLogout,
  busy,
  collapsed,
  onToggleCollapsed,
}: {
  user: { name: string; email: string; role: 'admin' | 'superadmin' };
  section: Section;
  onNavigate: (section: Section) => void;
  onLogout: () => void;
  busy: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
      <View style={[styles.sidebarBrandRow, collapsed && styles.sidebarBrandRowCollapsed]}>
        {!collapsed ? <Brand /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onPress={onToggleCollapsed}
          style={({ pressed }) => [styles.collapseButton, pressed && styles.navPressed]}
        >
          {collapsed
            ? <ChevronRight size={17} color={palette.muted} strokeWidth={2} />
            : <ChevronLeft size={17} color={palette.muted} strokeWidth={2} />}
        </Pressable>
      </View>
      {!collapsed ? <Text style={styles.navCaption}>WORKSPACE</Text> : null}
      <NavButton
        icon={LayoutDashboard}
        label="Dashboard"
        collapsed={collapsed}
        selected={section === 'dashboard'}
        onPress={() => onNavigate('dashboard')}
      />
      <NavButton
        icon={Package}
        label="Inventory"
        collapsed={collapsed}
        selected={section === 'inventory'}
        onPress={() => onNavigate('inventory')}
      />
      <NavButton
        icon={UsersRound}
        label="User management"
        collapsed={collapsed}
        selected={section === 'users'}
        onPress={() => onNavigate('users')}
      />
      <View style={styles.sidebarBottom}>
        <View style={styles.sidebarProfile}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          {!collapsed ? (
            <View style={styles.profileCopy}>
              <Text numberOfLines={1} style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileRole}>{user.role === 'superadmin' ? 'SUPERADMIN' : 'ADMIN'}</Text>
            </View>
          ) : null}
        </View>
        {!collapsed ? <Text numberOfLines={1} style={styles.profileEmail}>{user.email}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          disabled={busy}
          onPress={onLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            collapsed && styles.collapsedLogoutButton,
            pressed && styles.logoutPressed,
          ]}
        >
          {busy ? <LoadingAnimation size={18} /> : (
            <View style={styles.logoutContent}>
              <LogOut size={15} color={palette.muted} strokeWidth={1.9} />
              {!collapsed ? <Text style={styles.logoutText}>Sign out</Text> : null}
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function NavButton({
  icon: Icon,
  label,
  selected,
  onPress,
  collapsed,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  selected: boolean;
  onPress: () => void;
  collapsed: boolean;
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navButton,
        collapsed && styles.collapsedNavButton,
        selected && styles.navSelected,
        pressed && styles.navPressed,
      ]}
    >
      <Icon
        size={18}
        color={selected ? palette.pumpkinOrange : palette.muted}
        strokeWidth={selected ? 2.2 : 1.8}
      />
      {!collapsed ? <Text style={[styles.navText, selected && styles.navTextSelected]}>{label}</Text> : null}
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
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
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
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
    >
      {busy ? <LoadingAnimation size={20} /> : <Text style={styles.primaryButtonText}>{title}</Text>}
    </Pressable>
  );
}

function createStyles(palette: ThemeColors) {
  return StyleSheet.create({
    app: { flex: 1, flexDirection: 'row', backgroundColor: palette.background },
    mobileApp: { flexDirection: 'column' },
    sidebarFrame: { height: '100%', flexShrink: 0, overflow: 'hidden' },
    sidebar: {
      width: '100%',
      flex: 1,
      paddingHorizontal: 17,
      paddingTop: 22,
      paddingBottom: 15,
      backgroundColor: palette.paper,
      borderRightWidth: 1,
      borderRightColor: palette.line,
    },
    sidebarCollapsed: { paddingHorizontal: 9 },
    sidebarBrandRow: { minHeight: 46, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 30 },
    sidebarBrandRowCollapsed: { justifyContent: 'center' },
    collapseButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: palette.surfaceSubtle },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
    brandCompact: { marginBottom: 0 },
    brandIcon: { width: 37, height: 37, borderRadius: 13 },
    brandName: { color: palette.ink, fontSize: 14, fontFamily: fontFamilies.bold },
    brandTagline: { color: palette.muted, fontSize: 8, fontFamily: fontFamilies.regular, marginTop: 1 },
    navCaption: { color: palette.muted, fontSize: 8, letterSpacing: 1.1, fontFamily: fontFamilies.semiBold, marginBottom: 9, paddingHorizontal: 10 },
    navButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 11, borderRadius: 10, marginBottom: 4, overflow: 'hidden' },
    collapsedNavButton: { justifyContent: 'center', paddingHorizontal: 0 },
    navSelected: { backgroundColor: palette.accentSoft },
    navPressed: { opacity: 0.78 },
    navText: { flex: 1, color: palette.muted, fontSize: 10, fontFamily: fontFamilies.medium },
    navTextSelected: { color: palette.dirtyOrange, fontFamily: fontFamilies.semiBold },
    navIndicator: { width: 3, height: 24, borderRadius: 2, position: 'absolute', right: 0, backgroundColor: palette.pumpkinOrange },
    sidebarBottom: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 15 },
    sidebarProfile: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    profileAvatar: { width: 31, height: 31, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.yellowSoft },
    profileAvatarText: { color: palette.dirtyOrange, fontSize: 11, fontFamily: fontFamilies.bold },
    profileCopy: { flex: 1 },
    profileName: { color: palette.ink, fontSize: 9, fontFamily: fontFamilies.semiBold },
    profileRole: { color: palette.muted, fontSize: 7, letterSpacing: 0.6, fontFamily: fontFamilies.medium, marginTop: 3 },
    profileEmail: { color: palette.muted, fontSize: 8, fontFamily: fontFamilies.regular, marginTop: 9, paddingLeft: 40 },
    logoutButton: { minHeight: 36, justifyContent: 'center', marginTop: 10, paddingHorizontal: 10, borderRadius: 8 },
    collapsedLogoutButton: { alignItems: 'center', paddingHorizontal: 0 },
    logoutPressed: { backgroundColor: palette.surfaceSubtle },
    logoutContent: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    logoutText: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.medium },
    main: { flex: 1, minWidth: 0, backgroundColor: palette.background },
    topbar: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 26, borderBottomWidth: 1, borderBottomColor: palette.line, backgroundColor: palette.paper },
    topbarEyebrow: { color: palette.muted, fontSize: 7, letterSpacing: 1.1, fontFamily: fontFamilies.semiBold },
    topbarTitle: { color: palette.ink, fontSize: 15, fontFamily: fontFamilies.semiBold, marginTop: 3 },
    themeToggle: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surfaceSubtle },
    themeToggleIcon: { color: palette.dirtyOrange, fontSize: 21, lineHeight: 26 },
    contentScroll: { flex: 1 },
    content: { width: '100%', maxWidth: 1500, alignSelf: 'center', padding: 25, gap: 17 },
    footer: { color: palette.muted, fontSize: 8, textAlign: 'center', fontFamily: fontFamilies.regular, marginTop: 2 },
    mobileHeader: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: palette.line, backgroundColor: palette.paper },
    menuButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: palette.accentSoft },
    mobileMenuBackdrop: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(33, 29, 26, 0.36)' },
    menuDismiss: { flex: 1 },
    mobileMenu: { maxWidth: '84%', height: '100%', flexShrink: 0, overflow: 'hidden', backgroundColor: palette.paper },
    gatePage: { flex: 1, backgroundColor: palette.background },
    gateScroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    gateCard: { width: '100%', maxWidth: 500, alignSelf: 'center', padding: 25, borderWidth: 1, borderColor: palette.line, borderRadius: 22, backgroundColor: palette.paper },
    gatePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 99, backgroundColor: palette.yellowSoft },
    gatePillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.dirtyOrange },
    gatePillText: { color: palette.dirtyOrange, fontSize: 9, letterSpacing: 0.8, fontFamily: fontFamilies.bold },
    gateTitle: { color: palette.ink, fontSize: 23, fontFamily: fontFamilies.bold, marginTop: 15 },
    gateDescription: { color: palette.muted, fontSize: 11, lineHeight: 18, fontFamily: fontFamilies.regular, marginTop: 6, marginBottom: 16 },
    field: { marginBottom: 12 },
    fieldLabel: { color: palette.ink, fontSize: 9, fontFamily: fontFamilies.semiBold, marginBottom: 6 },
    input: { height: 44, paddingHorizontal: 11, borderWidth: 1, borderColor: palette.line, borderRadius: 10, backgroundColor: palette.paper, color: palette.ink, fontSize: 10, fontFamily: fontFamilies.regular },
    error: { color: palette.danger, fontSize: 10, fontFamily: fontFamilies.medium, marginBottom: 10 },
    primaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: palette.pumpkinOrange },
    primaryButtonPressed: { opacity: 0.85 },
    primaryButtonText: { color: '#fff', fontSize: 10, fontFamily: fontFamilies.semiBold },
    gateHint: { color: palette.muted, fontSize: 9, lineHeight: 15, fontFamily: fontFamilies.regular, marginTop: 12 },
  });
}
