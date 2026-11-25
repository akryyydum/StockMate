import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authApi, User } from '../src/auth/authApi';
import { useAuth } from '../src/auth/AuthProvider';
import { colors, fontFamilies } from '../src/theme';

export default function HomeScreen() {
  const { user, accessToken, updateCredentials, logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'superadmin'>('admin');

  const loadUsers = useCallback(async () => {
    if (!accessToken || user?.mustChangeCredentials) return;
    setUsersLoading(true);
    setError(null);
    try {
      const result = await authApi.listUsers(accessToken);
      setUsers(result.users);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load users.');
    } finally {
      setUsersLoading(false);
    }
  }, [accessToken, user?.mustChangeCredentials]);

  useEffect(() => {
    if (!accessToken || user?.mustChangeCredentials) return;
    let active = true;
    authApi.listUsers(accessToken)
      .then((result) => {
        if (active) setUsers(result.users);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load users.');
        }
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, user?.mustChangeCredentials]);

  if (!user) {
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
    setNotice(null);
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
      setNotice('Your email and password have been updated.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update credentials.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateUser() {
    setError(null);
    setNotice(null);
    if (newPassword.length < 12) {
      setError('Use at least 12 characters for the new user password.');
      return;
    }
    if (newPassword !== newConfirmPassword) {
      setError('The new user passwords do not match.');
      return;
    }
    if (!accessToken) {
      setError('Your session has expired. Sign in again.');
      return;
    }

    setBusy(true);
    try {
      await authApi.createUser(accessToken, {
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewConfirmPassword('');
      setNotice('User added successfully.');
      await loadUsers();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to add this user.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.brandRow}>
            <Image source={require('../assets/icon.png')} style={styles.brandIcon} />
            <View>
              <Text style={styles.brand}>StockMate</Text>
              <Text style={styles.tagline}>Your Inventory, Your Control.</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {signedInUser.role === 'superadmin' ? 'SUPERADMIN' : 'ADMIN'}
              </Text>
            </View>
          </View>

          {user.mustChangeCredentials ? (
            <View style={styles.card}>
              <View style={styles.pill}>
                <View style={styles.pillDot} />
                <Text style={styles.pillText}>SECURE YOUR NEW ACCOUNT</Text>
              </View>
              <Text style={styles.heading}>Change your sign-in details.</Text>
              <Text style={styles.description}>
                This first-use admin account must use a new email address and password before you can
                continue.
              </Text>

              <FormField
                label="Current temporary password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
              <FormField
                label="New email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FormField
                label="New password (12+ characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              <FormField
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <Feedback error={error} notice={notice} />
              <ActionButton
                title="Update email and password"
                busy={busy}
                onPress={() => void handleCredentialUpdate()}
              />
              <Text style={styles.helperText}>
                Your new password must be at least 12 characters. Your old sign-in sessions will be revoked.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <View style={styles.pill}>
                  <View style={styles.pillDot} />
                  <Text style={styles.pillText}>ACCOUNT READY</Text>
                </View>
                <Text style={styles.heading}>Good to have you, {signedInUser.name.split(' ')[0]}.</Text>
                <Text style={styles.description}>
                  Manage StockMate access for your team. Superadmins can add admins and superadmins.
                </Text>
                <View style={styles.accountRow}>
                  <Text style={styles.accountLabel}>SIGNED IN AS</Text>
                  <Text style={styles.accountEmail}>{signedInUser.email}</Text>
                </View>
                <Feedback error={error} notice={notice} />
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHeading}>
                  <View>
                    <Text style={styles.sectionTitle}>User management</Text>
                    <Text style={styles.sectionDescription}>
                      People with access to this StockMate workspace.
                    </Text>
                  </View>
                  {usersLoading ? <ActivityIndicator color={colors.dirtyOrange} /> : null}
                </View>

                {users.map((listedUser) => (
                  <View key={listedUser.id} style={styles.userRow}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {listedUser.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userCopy}>
                      <Text style={styles.userName}>{listedUser.name}</Text>
                      <Text style={styles.userEmail}>{listedUser.email}</Text>
                    </View>
                    <Text style={styles.userRole}>
                      {listedUser.role === 'superadmin' ? 'SUPERADMIN' : 'ADMIN'}
                    </Text>
                  </View>
                ))}

                {!usersLoading && users.length === 0 ? (
                  <Text style={styles.helperText}>No user accounts were found.</Text>
                ) : null}

                {signedInUser.role === 'superadmin' ? (
                  <View style={styles.createSection}>
                    <Text style={styles.sectionTitle}>Add a user</Text>
                    <Text style={styles.sectionDescription}>
                      Admins can access the account but cannot add users. Only superadmins can create
                      accounts.
                    </Text>
                    <FormField
                      label="Full name"
                      value={newName}
                      onChangeText={setNewName}
                      autoCapitalize="words"
                    />
                    <FormField
                      label="Email address"
                      value={newEmail}
                      onChangeText={setNewEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <FormField
                      label="Initial password (12+ characters)"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                    <FormField
                      label="Confirm password"
                      value={newConfirmPassword}
                      onChangeText={setNewConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                    <Text style={styles.fieldLabel}>Access level</Text>
                    <View style={styles.rolePicker}>
                      <RoleOption
                        label="Admin"
                        selected={newRole === 'admin'}
                        onPress={() => setNewRole('admin')}
                      />
                      <RoleOption
                        label="Superadmin"
                        selected={newRole === 'superadmin'}
                        onPress={() => setNewRole('superadmin')}
                      />
                    </View>
                    <ActionButton
                      title="Add user"
                      busy={busy}
                      onPress={() => void handleCreateUser()}
                    />
                  </View>
                ) : (
                  <Text style={styles.readOnlyNotice}>
                    Your admin role is read-only for user management. Contact a superadmin to add accounts.
                  </Text>
                )}
              </View>

              <ActionButton title="Sign out" busy={busy} secondary onPress={() => void handleLogout()} />
            </>
          )}

          <Text style={styles.footer}>Private by design. Your credentials stay protected.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
};

function FormField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: FormFieldProps) {
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

function Feedback({ error, notice }: { error: string | null; notice: string | null }) {
  if (error) return <Text accessibilityRole="alert" style={styles.error}>{error}</Text>;
  if (notice) return <Text accessibilityRole="alert" style={styles.success}>{notice}</Text>;
  return null;
}

function ActionButton({
  title,
  busy,
  secondary = false,
  onPress,
}: {
  title: string;
  busy: boolean;
  secondary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        pressed && !busy && styles.buttonPressed,
        busy && styles.buttonDisabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.ink : colors.paper} />
      ) : (
        <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{title}</Text>
      )}
    </Pressable>
  );
}

function RoleOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.roleOption, selected && styles.roleOptionSelected]}
    >
      <Text style={[styles.roleOptionText, selected && styles.roleOptionTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.boneWhite },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    gap: 16,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandIcon: { width: 43, height: 43, borderRadius: 13 },
  brand: { color: colors.ink, fontSize: 17, fontFamily: fontFamilies.bold },
  tagline: { color: colors.muted, fontSize: 10, fontFamily: fontFamilies.regular },
  roleBadge: {
    marginLeft: 'auto',
    borderRadius: 99,
    backgroundColor: '#fff3d4',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  roleBadgeText: {
    color: colors.dirtyOrange,
    fontSize: 9,
    letterSpacing: 0.6,
    fontFamily: fontFamilies.bold,
  },
  card: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 20,
    padding: 23,
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
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
    fontSize: 25,
    lineHeight: 34,
    fontFamily: fontFamilies.bold,
    marginTop: 16,
  },
  description: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    fontFamily: fontFamilies.regular,
    marginTop: 7,
    marginBottom: 20,
  },
  accountRow: { borderTopColor: colors.line, borderTopWidth: 1, paddingTop: 16 },
  accountLabel: {
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: fontFamilies.semiBold,
    marginBottom: 5,
  },
  accountEmail: { color: colors.ink, fontSize: 14, fontFamily: fontFamilies.medium },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: { color: colors.ink, fontSize: 17, fontFamily: fontFamilies.bold },
  sectionDescription: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: fontFamilies.regular,
    marginTop: 4,
    marginBottom: 11,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3d4',
  },
  userAvatarText: { color: colors.dirtyOrange, fontSize: 13, fontFamily: fontFamilies.bold },
  userCopy: { flex: 1, minWidth: 0 },
  userName: { color: colors.ink, fontSize: 12, fontFamily: fontFamilies.semiBold },
  userEmail: { color: colors.muted, fontSize: 10, fontFamily: fontFamilies.regular, marginTop: 2 },
  userRole: {
    color: colors.dirtyOrange,
    fontSize: 8,
    letterSpacing: 0.4,
    fontFamily: fontFamilies.bold,
  },
  createSection: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 18,
  },
  field: { marginBottom: 12 },
  fieldLabel: {
    color: colors.ink,
    fontSize: 10,
    fontFamily: fontFamilies.semiBold,
    marginBottom: 6,
  },
  input: {
    minHeight: 45,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: '#fff',
    color: colors.ink,
    fontSize: 12,
    fontFamily: fontFamilies.regular,
  },
  rolePicker: { flexDirection: 'row', gap: 9, marginBottom: 15 },
  roleOption: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionSelected: { backgroundColor: '#fff3d4', borderColor: colors.dirtyOrange },
  roleOptionText: { color: colors.muted, fontSize: 11, fontFamily: fontFamilies.medium },
  roleOptionTextSelected: { color: colors.dirtyOrange, fontFamily: fontFamilies.bold },
  button: {
    minHeight: 48,
    borderRadius: 11,
    backgroundColor: colors.pumpkinOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  secondaryButton: { backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1 },
  buttonPressed: { opacity: 0.86 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.ink, fontSize: 12, fontFamily: fontFamilies.bold },
  secondaryButtonText: { color: colors.ink },
  error: {
    color: colors.danger,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: fontFamilies.medium,
    marginBottom: 10,
  },
  success: {
    color: '#286744',
    fontSize: 11,
    lineHeight: 17,
    fontFamily: fontFamilies.medium,
    marginBottom: 10,
  },
  helperText: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
    fontFamily: fontFamilies.regular,
    marginTop: 11,
  },
  readOnlyNotice: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
    fontFamily: fontFamilies.medium,
    paddingTop: 13,
    borderTopColor: colors.line,
    borderTopWidth: 1,
  },
  footer: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 9,
    fontFamily: fontFamilies.regular,
    marginTop: 3,
  },
});
