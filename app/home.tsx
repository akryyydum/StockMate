import { Redirect, useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Check from 'lucide-react-native/icons/check';
import LayoutDashboard from 'lucide-react-native/icons/layout-dashboard';
import LogOut from 'lucide-react-native/icons/log-out';
import Menu from 'lucide-react-native/icons/menu';
import Moon from 'lucide-react-native/icons/moon';
import Package from 'lucide-react-native/icons/package';
import Settings2 from 'lucide-react-native/icons/settings-2';
import Sun from 'lucide-react-native/icons/sun';
import UsersRound from 'lucide-react-native/icons/users-round';
import X from 'lucide-react-native/icons/x';
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
import { authApi } from '../src/auth/authApi';
import { useAuth } from '../src/auth/AuthProvider';
import { Dashboard } from '../src/components/Dashboard';
import { InventoryDashboard } from '../src/components/InventoryDashboard';
import { LoadingAnimation } from '../src/components/LoadingAnimation';
import { UserManagement } from '../src/components/UserManagement';
import { useAppTheme } from '../src/ThemeProvider';
import { fontFamilies, ThemeColors } from '../src/theme';
import { createCurrencyFormatter, CURRENCY_OPTIONS, type CurrencyCode } from '../src/utils/currency';

type Section = 'dashboard' | 'inventory' | 'users';

export default function HomeScreen() {
  const { user, accessToken, updateCredentials, logout } = useAuth();
  const { palette, mode, toggleMode } = useAppTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;
  const [sidebarWidth] = useState(() => new Animated.Value(248));
  const [mobileMenuProgress] = useState(() => new Animated.Value(0));
  const [section, setSection] = useState<Section>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>('PHP');
  const [draftCurrency, setDraftCurrency] = useState<CurrencyCode>('PHP');
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number | null>(120);
  const [draftSessionDurationMinutes, setDraftSessionDurationMinutes] = useState<number | null>(120);
  const [customSessionDuration, setCustomSessionDuration] = useState(false);
  const [customSessionMinutes, setCustomSessionMinutes] = useState('180');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [sessionDurationError, setSessionDurationError] = useState<string | null>(null);
  const styles = createStyles(palette);

  useEffect(() => {
    if (!accessToken || user?.role !== 'superadmin') return;
    let active = true;
    authApi.settings(accessToken)
      .then((settings) => {
        if (active) {
          setCurrencyCode(settings.currency);
          setDraftCurrency(settings.currency);
          setSessionDurationMinutes(settings.sessionDurationMinutes);
          setDraftSessionDurationMinutes(settings.sessionDurationMinutes);
          setSettingsError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setSettingsError(
            loadError instanceof Error ? loadError.message : 'Unable to load account settings.',
          );
        }
      })
      .finally(() => {
        if (active) setSettingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, user?.role]);

  async function reloadSettings() {
    if (!accessToken) return;
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const settings = await authApi.settings(accessToken);
      setCurrencyCode(settings.currency);
      setDraftCurrency(settings.currency);
      setSessionDurationMinutes(settings.sessionDurationMinutes);
      setDraftSessionDurationMinutes(settings.sessionDurationMinutes);
      setCustomSessionDuration(
        settings.sessionDurationMinutes !== null &&
          ![30, 60, 120].includes(settings.sessionDurationMinutes),
      );
      if (
        settings.sessionDurationMinutes !== null &&
        ![30, 60, 120].includes(settings.sessionDurationMinutes)
      ) {
        setCustomSessionMinutes(String(settings.sessionDurationMinutes));
      }
    } catch (loadError) {
      setSettingsError(
        loadError instanceof Error ? loadError.message : 'Unable to load account settings.',
      );
    } finally {
      setSettingsLoading(false);
    }
  }

  useEffect(() => {
    Animated.timing(sidebarWidth, {
      toValue: sidebarCollapsed ? 76 : 248,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [sidebarCollapsed, sidebarWidth]);

  useEffect(() => {
    if (!menuOpen) return;
    mobileMenuProgress.setValue(0);
    const animation = Animated.timing(mobileMenuProgress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [menuOpen, mobileMenuProgress]);

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

  function openSettings() {
    setMenuOpen(false);
    setDraftCurrency(currencyCode);
    setDraftSessionDurationMinutes(sessionDurationMinutes);
    const isCustom = sessionDurationMinutes !== null && ![30, 60, 120].includes(sessionDurationMinutes);
    setCustomSessionDuration(isCustom);
    setCustomSessionMinutes(isCustom ? String(sessionDurationMinutes) : '180');
    setSettingsVisible(true);
    setSessionDurationError(null);
  }

  async function saveSettings() {
    if (!accessToken) return;
    const nextSessionDuration = customSessionDuration
      ? Number(customSessionMinutes)
      : draftSessionDurationMinutes;
    if (
      customSessionDuration &&
      (!Number.isInteger(nextSessionDuration) || nextSessionDuration === null ||
        nextSessionDuration < 1 || nextSessionDuration > 30 * 24 * 60)
    ) {
      setSessionDurationError('Enter a whole number from 1 to 43,200 minutes (30 days).');
      return;
    }

    setSettingsSaving(true);
    setSettingsError(null);
    setSessionDurationError(null);
    try {
      const settings = await authApi.updateSettings(accessToken, {
        currency: draftCurrency,
        sessionDurationMinutes: nextSessionDuration,
      });
      setCurrencyCode(settings.currency);
      setSessionDurationMinutes(settings.sessionDurationMinutes);
      setSettingsVisible(false);
    } catch (saveError) {
      setSettingsError(saveError instanceof Error ? saveError.message : 'Unable to save account settings.');
    } finally {
      setSettingsSaving(false);
    }
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
            onOpenSettings={openSettings}
          />
        </Animated.View>
      ) : null}

      <View style={styles.main}>
        <View style={styles.topbar}>
          <View>
            {isDesktop ? (
              <>
                <Text style={styles.topbarEyebrow}>STOCKMATE CAFÉ</Text>
                <Text style={styles.topbarTitle}>
                  {section === 'dashboard'
                    ? 'Dashboard'
                    : section === 'inventory'
                      ? 'Inventory overview'
                      : 'Team access'}
                </Text>
              </>
            ) : (
              <View style={styles.mobileTopbarBrand}>
                <Image source={require('../assets/brand-logo.png')} style={styles.mobileTopbarLogo} />
                <Text style={styles.topbarTitle}>StockMate</Text>
              </View>
            )}
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
              <Dashboard accessToken={accessToken} currencyCode={currencyCode} />
            ) : section === 'inventory' ? (
              <InventoryDashboard accessToken={accessToken} currencyCode={currencyCode} />
            ) : (
              <UserManagement accessToken={accessToken} role={signedInUser.role} currentUserId={signedInUser.id} />
            )}
          </PageTransition>
          <Text style={styles.footer}>StockMate · Your Inventory, Your Control.</Text>
        </ScrollView>
      </View>

      {!isDesktop ? (
        <View style={styles.mobileBottomNav}>
          <MobileTabButton
            icon={LayoutDashboard}
            label="Dashboard"
            selected={section === 'dashboard'}
            onPress={() => navigate('dashboard')}
          />
          <MobileTabButton
            icon={Package}
            label="Inventory"
            selected={section === 'inventory'}
            onPress={() => navigate('inventory')}
          />
          <MobileTabButton
            icon={UsersRound}
            label="Team"
            selected={section === 'users'}
            onPress={() => navigate('users')}
          />
          <MobileTabButton
            icon={Menu}
            label="Menu"
            selected={menuOpen}
            onPress={() => setMenuOpen(true)}
          />
        </View>
      ) : null}

      {!isDesktop ? (
        <Modal
          animationType="none"
          onRequestClose={() => setMenuOpen(false)}
          transparent
          visible={menuOpen}
        >
          <View style={styles.mobileMenuBackdrop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              onPress={() => setMenuOpen(false)}
              style={styles.menuDismiss}
            />
            <MobileAccountMenu
              user={signedInUser}
              onLogout={() => void handleLogout()}
              onClose={() => setMenuOpen(false)}
              busy={busy}
              onOpenSettings={openSettings}
              progress={mobileMenuProgress}
            />
          </View>
        </Modal>
      ) : null}
      <Modal
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
        transparent
        visible={settingsVisible}
      >
        <View style={styles.settingsBackdrop}>
          <ScrollView
            contentContainerStyle={styles.settingsScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.settingsCard}>
              <View style={styles.settingsHeader}>
                <View style={styles.settingsTitleGroup}>
                  <View style={styles.settingsTitleIcon}>
                    <Settings2 size={18} color={palette.dirtyOrange} strokeWidth={1.9} />
                  </View>
                  <View>
                    <Text style={styles.settingsTitle}>Account settings</Text>
                    <Text style={styles.settingsSubtitle}>Customize how your inventory is displayed.</Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close settings"
                  onPress={() => setSettingsVisible(false)}
                  style={({ pressed }) => [styles.settingsClose, pressed && styles.navPressed]}
                >
                  <X size={17} color={palette.muted} strokeWidth={1.9} />
                </Pressable>
              </View>
              <View style={styles.settingsSection}>
                <Text style={styles.settingsLabel}>DISPLAY CURRENCY</Text>
                <Text style={styles.settingsDescription}>
                  Changes the currency format shown for stock values and item costs. It does not convert saved amounts.
                </Text>
                {settingsLoading ? (
                  <View style={styles.settingsLoading}>
                    <LoadingAnimation label="Loading account settings" size={28} />
                  </View>
                ) : (
                  <View style={styles.currencyOptions}>
                    {CURRENCY_OPTIONS.map((option) => {
                      const selected = draftCurrency === option.code;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          disabled={Boolean(settingsError)}
                          key={option.code}
                          onPress={() => setDraftCurrency(option.code)}
                          style={[
                            styles.currencyOption,
                            selected && styles.currencyOptionSelected,
                            settingsError && styles.currencyOptionDisabled,
                          ]}
                        >
                          <Text style={[styles.currencyCode, selected && styles.currencyCodeSelected]}>
                            {option.code}
                          </Text>
                          <Text style={styles.currencyLabel}>{option.label}</Text>
                          {selected ? <Check size={15} color={palette.dirtyOrange} strokeWidth={2} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {settingsError ? (
                  <View style={styles.settingsErrorRow}>
                    <Text accessibilityRole="alert" style={styles.settingsError}>{settingsError}</Text>
                    <Pressable accessibilityRole="button" onPress={() => void reloadSettings()}>
                      <Text style={styles.settingsRetry}>Try again</Text>
                    </Pressable>
                  </View>
                ) : null}
                {!settingsLoading && !settingsError ? (
                  <Text style={styles.currencyPreview}>
                    Example: {createCurrencyFormatter(draftCurrency).format(1234.56)}
                  </Text>
                ) : null}
              </View>
              <View style={styles.settingsSection}>
                <Text style={styles.settingsLabel}>SESSION DURATION</Text>
                <Text style={styles.settingsDescription}>
                  Fixed lifetime from sign-in; activity does not extend it. Changes apply to new sessions, while current sessions keep their existing expiry.
                </Text>
                <View style={styles.sessionDurationOptions}>
                  {[
                    { label: 'Off (no expiry)', value: null },
                    { label: '30 minutes', value: 30 },
                    { label: '1 hour', value: 60 },
                    { label: '2 hours', value: 120 },
                  ].map((option) => {
                    const selected = !customSessionDuration &&
                      draftSessionDurationMinutes === option.value;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        disabled={Boolean(settingsError)}
                        key={option.label}
                        onPress={() => {
                          setCustomSessionDuration(false);
                          setDraftSessionDurationMinutes(option.value);
                        }}
                        style={[
                          styles.sessionDurationOption,
                          selected && styles.sessionDurationOptionSelected,
                          settingsError && styles.currencyOptionDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.sessionDurationLabel,
                            selected && styles.sessionDurationLabelSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {selected ? <Check size={15} color={palette.dirtyOrange} strokeWidth={2} /> : null}
                      </Pressable>
                    );
                  })}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: customSessionDuration }}
                    disabled={Boolean(settingsError)}
                    onPress={() => {
                      setCustomSessionDuration(true);
                      setCustomSessionMinutes(
                        draftSessionDurationMinutes !== null &&
                          ![30, 60, 120].includes(draftSessionDurationMinutes)
                          ? String(draftSessionDurationMinutes)
                          : '180',
                      );
                    }}
                    style={[
                      styles.sessionDurationOption,
                      customSessionDuration && styles.sessionDurationOptionSelected,
                      settingsError && styles.currencyOptionDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sessionDurationLabel,
                        customSessionDuration && styles.sessionDurationLabelSelected,
                      ]}
                    >
                      Custom
                    </Text>
                    {customSessionDuration ? <Check size={15} color={palette.dirtyOrange} strokeWidth={2} /> : null}
                  </Pressable>
                </View>
                {customSessionDuration ? (
                  <View style={styles.customSessionField}>
                    <Text style={styles.customSessionLabel}>Duration in minutes (1-43,200)</Text>
                    <TextInput
                      accessibilityLabel="Custom session duration in minutes"
                      editable={!settingsError}
                      keyboardType="number-pad"
                      maxLength={5}
                      onChangeText={(value) => {
                        setCustomSessionMinutes(value);
                        setSessionDurationError(null);
                      }}
                      placeholder="Enter minutes"
                      placeholderTextColor={palette.muted}
                      style={styles.customSessionInput}
                      value={customSessionMinutes}
                    />
                    <Text style={styles.customSessionHint}>
                      Maximum custom duration is 30 days. Choose Off to disable automatic sign-out.
                    </Text>
                    {sessionDurationError ? (
                      <Text accessibilityRole="alert" style={styles.settingsError}>
                        {sessionDurationError}
                      </Text>
                    ) : null}
                  </View>
                ) : draftSessionDurationMinutes === null ? (
                  <Text style={styles.sessionWarning}>
                    Sessions remain active until users sign out or an administrator revokes them.
                  </Text>
                ) : null}
              </View>
              <View style={styles.settingsActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={settingsSaving}
                  onPress={() => setSettingsVisible(false)}
                  style={({ pressed }) => [styles.settingsCancel, pressed && styles.navPressed]}
                >
                  <Text style={styles.settingsCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={settingsLoading || settingsSaving || Boolean(settingsError) || Boolean(sessionDurationError)}
                  onPress={() => void saveSettings()}
                  style={({ pressed }) => [
                    styles.settingsSave,
                    (settingsLoading || settingsSaving || Boolean(settingsError) || Boolean(sessionDurationError)) && styles.settingsSaveDisabled,
                    pressed && !settingsSaving && styles.primaryButtonPressed,
                  ]}
                >
                  {settingsSaving
                    ? <LoadingAnimation size={18} />
                    : <Text style={styles.settingsSaveText}>Save changes</Text>}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Brand({ compact = false, showText = true }: { compact?: boolean; showText?: boolean }) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <View style={[styles.brand, compact && styles.brandCompact]}>
      <Image source={require('../assets/brand-logo.png')} style={styles.brandIcon} />
      {showText ? (
        <View>
          <Text style={styles.brandName}>StockMate</Text>
          <Text style={styles.brandTagline}>Your Inventory, Your Control.</Text>
        </View>
      ) : null}
    </View>
  );
}

function MobileTabButton({
  icon: Icon,
  label,
  selected,
  onPress,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.mobileTab, pressed && styles.navPressed]}
    >
      <Icon
        size={20}
        color={selected ? palette.pumpkinOrange : palette.muted}
        strokeWidth={selected ? 2.2 : 1.8}
      />
      <Text style={[styles.mobileTabLabel, selected && styles.mobileTabLabelSelected]}>{label}</Text>
      {selected ? <View style={styles.mobileTabIndicator} /> : null}
    </Pressable>
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
  onOpenSettings,
}: {
  user: { name: string; email: string; role: 'admin' | 'superadmin' };
  section: Section;
  onNavigate: (section: Section) => void;
  onLogout: () => void;
  busy: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenSettings: () => void;
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
        {user.role === 'superadmin' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={onOpenSettings}
            style={({ pressed }) => [
              styles.settingsButton,
              collapsed && styles.collapsedLogoutButton,
              pressed && styles.logoutPressed,
            ]}
          >
            <View style={styles.logoutContent}>
              <Settings2 size={15} color={palette.muted} strokeWidth={1.9} />
              {!collapsed ? <Text style={styles.logoutText}>Settings</Text> : null}
            </View>
          </Pressable>
        ) : null}
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
      {!collapsed ? (
        <Text style={[styles.navText, selected && styles.navTextSelected]}>{label}</Text>
      ) : null}
      {selected ? <View style={styles.navIndicator} /> : null}
    </Pressable>
  );
}

function MobileAccountMenu({
  user,
  onLogout,
  onClose,
  busy,
  progress,
  onOpenSettings,
}: {
  user: { name: string; email: string; role: 'admin' | 'superadmin' };
  onLogout: () => void;
  onClose: () => void;
  busy: boolean;
  progress: Animated.Value;
  onOpenSettings: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <Animated.View
      style={[
        styles.mobileMenuPanel,
        {
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }) },
          ],
        },
      ]}
    >
      <View style={styles.mobileMenuHeading}>
        <View style={styles.mobileAccountIdentity}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.mobileMenuProfile}>
            <Text numberOfLines={1} style={styles.profileName}>{user.name}</Text>
            <Text numberOfLines={1} style={styles.mobileMenuEmail}>{user.email}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={styles.mobileMenuClose}
        >
          <X size={18} color={palette.muted} strokeWidth={1.9} />
        </Pressable>
      </View>
      {user.role === 'superadmin' ? (
        <Pressable
          accessibilityRole="button"
          onPress={onOpenSettings}
          style={({ pressed }) => [styles.mobileMenuAction, pressed && styles.logoutPressed]}
        >
          <Settings2 size={16} color={palette.muted} strokeWidth={1.9} />
          <Text style={styles.logoutText}>Settings</Text>
        </Pressable>
      ) : null}
      <View style={styles.mobileMenuActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          disabled={busy}
          onPress={onLogout}
          style={({ pressed }) => [styles.mobileMenuAction, styles.mobileSignOut, pressed && styles.navPressed]}
        >
          {busy ? <LoadingAnimation size={18} /> : <LogOut size={16} color={palette.danger} strokeWidth={1.9} />}
          <Text style={styles.mobileSignOutText}>{busy ? 'Signing out...' : 'Sign out'}</Text>
        </Pressable>
      </View>
    </Animated.View>
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
    settingsButton: { minHeight: 36, justifyContent: 'center', marginTop: 10, paddingHorizontal: 10, borderRadius: 8 },
    logoutButton: { minHeight: 36, justifyContent: 'center', marginTop: 10, paddingHorizontal: 10, borderRadius: 8 },
    collapsedLogoutButton: { alignItems: 'center', paddingHorizontal: 0 },
    logoutPressed: { backgroundColor: palette.surfaceSubtle },
    logoutContent: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    logoutText: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.medium },
    main: { flex: 1, minWidth: 0, backgroundColor: palette.background },
    topbar: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 26, borderBottomWidth: 1, borderBottomColor: palette.line, backgroundColor: palette.paper },
    topbarEyebrow: { color: palette.muted, fontSize: 7, letterSpacing: 1.1, fontFamily: fontFamilies.semiBold },
    topbarTitle: { color: palette.ink, fontSize: 15, fontFamily: fontFamilies.semiBold, marginTop: 3 },
    mobileTopbarBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    mobileTopbarLogo: { width: 34, height: 34, borderRadius: 10 },
    themeToggle: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surfaceSubtle },
    themeToggleIcon: { color: palette.dirtyOrange, fontSize: 21, lineHeight: 26 },
    contentScroll: { flex: 1 },
    content: { width: '100%', alignSelf: 'stretch', padding: 20, gap: 17 },
    footer: { color: palette.muted, fontSize: 8, textAlign: 'center', fontFamily: fontFamilies.regular, marginTop: 2 },
    mobileBottomNav: { minHeight: 64, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: palette.line, backgroundColor: palette.paper },
    mobileTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 7 },
    mobileTabLabel: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.medium },
    mobileTabLabelSelected: { color: palette.dirtyOrange, fontFamily: fontFamilies.semiBold },
    mobileTabIndicator: { position: 'absolute', top: 0, width: 28, height: 2, borderRadius: 2, backgroundColor: palette.pumpkinOrange },
    mobileMenuBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(33, 29, 26, 0.42)' },
    menuDismiss: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
    mobileMenuPanel: { width: '100%', paddingTop: 20, paddingBottom: 24, paddingHorizontal: 20, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper, elevation: 12, shadowColor: palette.ink, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: -5 } },
    mobileMenuHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
    mobileAccountIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    mobileMenuClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.surfaceSubtle },
    mobileMenuActions: { gap: 6, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10 },
    mobileMenuAction: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 10, borderRadius: 10 },
    mobileSignOut: { backgroundColor: palette.dangerSoft },
    mobileSignOutText: { color: palette.danger, fontSize: 10, fontFamily: fontFamilies.semiBold },
    mobileMenuProfile: { flex: 1 },
    mobileMenuEmail: { color: palette.muted, fontSize: 8, fontFamily: fontFamilies.regular, marginTop: 2 },
    settingsBackdrop: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: palette.overlay },
    settingsScroll: { flexGrow: 1, justifyContent: 'center' },
    settingsCard: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 22, borderWidth: 1, borderColor: palette.line, borderRadius: 20, backgroundColor: palette.paper },
    settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 22 },
    settingsTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
    settingsTitleIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: palette.orangeSoft },
    settingsTitle: { color: palette.ink, fontSize: 16, fontFamily: fontFamilies.semiBold },
    settingsSubtitle: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.regular, marginTop: 3 },
    settingsClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.surfaceSubtle },
    settingsSection: { gap: 8, marginBottom: 18 },
    settingsLabel: { color: palette.muted, fontSize: 8, letterSpacing: 0.8, fontFamily: fontFamilies.semiBold },
    settingsDescription: { color: palette.muted, fontSize: 10, lineHeight: 16, fontFamily: fontFamilies.regular, marginBottom: 4 },
    settingsLoading: { minHeight: 140, justifyContent: 'center', alignItems: 'center' },
    currencyOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    currencyOption: { width: '46%', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, borderWidth: 1, borderColor: palette.line, borderRadius: 10, backgroundColor: palette.paper },
    currencyOptionSelected: { borderColor: palette.pumpkinOrange, backgroundColor: palette.accentSoft },
    currencyOptionDisabled: { opacity: 0.55 },
    currencyCode: { color: palette.ink, fontSize: 10, fontFamily: fontFamilies.semiBold },
    currencyCodeSelected: { color: palette.dirtyOrange },
    currencyLabel: { flex: 1, color: palette.muted, fontSize: 8, fontFamily: fontFamilies.regular },
    currencyPreview: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.medium, marginTop: 6 },
    sessionDurationOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sessionDurationOption: { width: '46%', minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: palette.line, borderRadius: 10, backgroundColor: palette.paper },
    sessionDurationOptionSelected: { borderColor: palette.pumpkinOrange, backgroundColor: palette.accentSoft },
    sessionDurationLabel: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.medium },
    sessionDurationLabelSelected: { color: palette.dirtyOrange, fontFamily: fontFamilies.semiBold },
    customSessionField: { gap: 6, marginTop: 5 },
    customSessionLabel: { color: palette.ink, fontSize: 9, fontFamily: fontFamilies.medium },
    customSessionInput: { height: 42, paddingHorizontal: 11, borderWidth: 1, borderColor: palette.line, borderRadius: 10, backgroundColor: palette.paper, color: palette.ink, fontSize: 10, fontFamily: fontFamilies.regular },
    customSessionHint: { color: palette.muted, fontSize: 8, lineHeight: 13, fontFamily: fontFamilies.regular },
    sessionWarning: { color: palette.dirtyOrange, fontSize: 9, lineHeight: 14, fontFamily: fontFamilies.medium, marginTop: 4 },
    settingsErrorRow: { gap: 8, marginTop: 6 },
    settingsError: { color: palette.danger, fontSize: 10, fontFamily: fontFamilies.medium },
    settingsRetry: { color: palette.dirtyOrange, fontSize: 10, fontFamily: fontFamilies.semiBold },
    settingsActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 22 },
    settingsCancel: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: palette.line },
    settingsCancelText: { color: palette.muted, fontSize: 10, fontFamily: fontFamilies.medium },
    settingsSave: { minHeight: 40, minWidth: 112, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: palette.pumpkinOrange },
    settingsSaveDisabled: { opacity: 0.5 },
    settingsSaveText: { color: '#fff', fontSize: 10, fontFamily: fontFamilies.semiBold },
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
