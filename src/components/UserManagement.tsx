import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authApi, User } from '../auth/authApi';
import { useAppTheme } from '../ThemeProvider';
import { fontFamilies, ThemeColors } from '../theme';
import { LoadingAnimation } from './LoadingAnimation';

type Props = {
  accessToken: string;
  role: User['role'];
  currentUserId: string;
};

export function UserManagement({ accessToken, role, currentUserId }: Props) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [removingUser, setRemovingUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;
    authApi.listUsers(accessToken)
      .then(({ users: results }) => {
        if (active) setUsers(results);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load users.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  async function createUser() {
    setError(null);
    setNotice(null);
    if (password.length < 12) {
      setError('Use at least 12 characters for the initial password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { user } = await authApi.createUser(accessToken, {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setUsers((current) => [...current, user].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setNotice(`${user.name} has been added as ${user.role}.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to add this user.');
    } finally {
      setBusy(false);
    }
  }

  function openEditUser(user: User) {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditPassword('');
    setError(null);
    setNotice(null);
  }

  async function saveUser() {
    if (!editingUser) return;
    setError(null);
    setNotice(null);
    if (editPassword.length > 0 && editPassword.length < 12) {
      setError('Use at least 12 characters for the new password.');
      return;
    }
    if (editEmail.trim().toLowerCase() === editingUser.email && !editPassword) {
      setError('Change the email address or enter a new password.');
      return;
    }

    setBusy(true);
    try {
      const updates: { email?: string; password?: string } = {};
      if (editEmail.trim().toLowerCase() !== editingUser.email) updates.email = editEmail.trim();
      if (editPassword) updates.password = editPassword;
      const { user } = await authApi.updateUser(accessToken, editingUser.id, updates);
      setUsers((current) => current.map((item) => item.id === user.id ? user : item));
      setEditingUser(null);
      setEditPassword('');
      setNotice(`${user.name}'s account has been updated.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update this user.');
    } finally {
      setBusy(false);
    }
  }

  async function removeUser() {
    if (!removingUser) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await authApi.deleteUser(accessToken, removingUser.id);
      setUsers((current) => current.filter((user) => user.id !== removingUser.id));
      setNotice(`${removingUser.name}'s account has been removed.`);
      setRemovingUser(null);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove this user.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.page}>
      <View>
        <Text style={styles.title}>User management</Text>
        <Text style={styles.subtitle}>Manage who can access your café inventory.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Team members</Text>
            <Text style={styles.cardSubtitle}>{users.length} account{users.length === 1 ? '' : 's'} in this workspace</Text>
          </View>
          {loading ? <LoadingAnimation size={20} /> : null}
        </View>

        {error && !editingUser && !removingUser ? <Feedback text={error} danger /> : null}
        {notice ? <Feedback text={notice} /> : null}

        {loading ? (
          <View style={styles.loading}>
            <LoadingAnimation label="Loading team members" size={36} />
          </View>
        ) : null}

        {!loading ? users.map((user) => (
          <View key={user.id} style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <View style={[styles.roleBadge, user.role === 'superadmin' && styles.superadminBadge]}>
              <Text style={[styles.roleText, user.role === 'superadmin' && styles.superadminText]}>
                {user.role === 'superadmin' ? 'SUPERADMIN' : 'ADMIN'}
              </Text>
            </View>
            {role === 'superadmin' ? (
              <View style={styles.rowActions}>
                <RowAction label="Edit" onPress={() => openEditUser(user)} />
                <RowAction
                  label="Remove"
                  destructive
                  disabled={user.id === currentUserId}
                  accessibilityLabel={user.id === currentUserId ? 'Cannot remove your own account' : undefined}
                  onPress={() => setRemovingUser(user)}
                />
              </View>
            ) : null}
          </View>
        )) : null}

        {!loading && users.length === 0 ? (
          <Text style={styles.emptyText}>No user accounts found.</Text>
        ) : null}
      </View>

      {role === 'superadmin' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add a team member</Text>
          <Text style={styles.cardSubtitle}>
            Team members receive Admin access to this account&apos;s private inventory.
          </Text>
          <View style={styles.formGrid}>
            <Field label="Full name" value={name} onChangeText={setName} placeholder="e.g. Alex Rivera" />
            <Field label="Email address" value={email} onChangeText={setEmail} placeholder="alex@example.com" autoCapitalize="none" />
            <Field label="Initial password (12+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
            <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void createUser()}
            style={({ pressed }) => [styles.submitButton, pressed && styles.submitPressed]}
          >
            {busy ? <LoadingAnimation size={20} /> : <Text style={styles.submitText}>Add user</Text>}
          </Pressable>
        </View>
      ) : (
        <View style={styles.permissionNote}>
          <Text style={styles.permissionIcon}>i</Text>
          <Text style={styles.permissionText}>
            You can view the team, but only a superadmin can add, edit, or remove user accounts.
          </Text>
        </View>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setEditingUser(null);
          setRemovingUser(null);
          setError(null);
        }}
        transparent
        visible={Boolean(editingUser || removingUser)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              {editingUser ? (
                <>
                  <Text style={styles.modalTitle}>Edit user account</Text>
                  <Text style={styles.modalSubtitle}>
                    Leave the password blank to keep the current password. If you set a new password or email, the user will need to update their credentials at next sign-in.
                  </Text>
                  <Field label="Email address" value={editEmail} onChangeText={setEditEmail} autoCapitalize="none" />
                  <Field
                    label="New password (optional, 12+ characters)"
                    value={editPassword}
                    onChangeText={setEditPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </>
              ) : removingUser ? (
                <>
                  <Text style={styles.modalTitle}>Remove user account?</Text>
                  <Text style={styles.modalSubtitle}>
                    {`This will permanently remove ${removingUser.name} (${removingUser.email}) and revoke their refresh sessions. This cannot be undone.`}
                  </Text>
                </>
              ) : null}
              {error ? <Feedback text={error} danger /> : null}
              <View style={styles.modalActions}>
                <RowAction
                  label="Cancel"
                  disabled={busy}
                  onPress={() => {
                    setEditingUser(null);
                    setRemovingUser(null);
                    setError(null);
                  }}
                />
                {editingUser ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void saveUser()}
                    style={[styles.submitButton, busy && styles.disabledButton]}
                  >
                    {busy ? <LoadingAnimation size={20} /> : <Text style={styles.submitText}>Save changes</Text>}
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void removeUser()}
                    style={[styles.removeConfirmButton, busy && styles.disabledButton]}
                  >
                    {busy ? <LoadingAnimation size={20} /> : <Text style={styles.submitText}>Remove user</Text>}
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences';
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function Feedback({ text, danger = false }: { text: string; danger?: boolean }) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return <Text accessibilityRole="alert" style={[styles.feedback, danger && styles.feedbackDanger]}>{text}</Text>;
}

function RowAction({
  label,
  onPress,
  destructive = false,
  disabled = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.rowAction,
        destructive && styles.rowActionDestructive,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.rowActionPressed,
      ]}
    >
      <Text style={[styles.rowActionText, destructive && styles.rowActionDestructiveText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(palette: ThemeColors) {
  return StyleSheet.create({
  page: { gap: 18 },
  loading: { minHeight: 140, justifyContent: 'center', alignItems: 'center' },
  title: { color: palette.ink, fontSize: 24, fontFamily: fontFamilies.bold },
  subtitle: { color: palette.muted, fontSize: 12, fontFamily: fontFamilies.regular, marginTop: 4 },
  card: { padding: 20, borderRadius: 18, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { color: palette.ink, fontSize: 16, fontFamily: fontFamilies.semiBold },
  cardSubtitle: { color: palette.muted, fontSize: 10, lineHeight: 16, fontFamily: fontFamilies.regular, marginTop: 4, marginBottom: 14 },
  userRow: { minHeight: 63, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 11, paddingVertical: 9, borderTopWidth: 1, borderTopColor: palette.line },
  avatar: { width: 35, height: 35, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.yellowSoft },
  avatarText: { color: palette.dirtyOrange, fontSize: 13, fontFamily: fontFamilies.bold },
  userDetails: { flex: 1 },
  userName: { color: palette.ink, fontSize: 11, fontFamily: fontFamilies.semiBold },
  userEmail: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.regular, marginTop: 3 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  rowAction: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  rowActionDestructive: { borderColor: palette.danger, backgroundColor: palette.paper },
  rowActionPressed: { opacity: 0.75 },
  rowActionText: { color: palette.ink, fontSize: 9, fontFamily: fontFamilies.semiBold },
  rowActionDestructiveText: { color: palette.danger },
  disabledButton: { opacity: 0.45 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.42)' },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalCard: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 20, borderRadius: 18, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  modalTitle: { color: palette.ink, fontSize: 17, fontFamily: fontFamilies.bold },
  modalSubtitle: { color: palette.muted, fontSize: 10, lineHeight: 16, fontFamily: fontFamilies.regular, marginTop: 6, marginBottom: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 9, marginTop: 14 },
  removeConfirmButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: palette.danger },
  roleBadge: { backgroundColor: palette.yellowSoft, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 },
  superadminBadge: { backgroundColor: palette.orangeSoft },
  roleText: { color: palette.statusInText, fontSize: 8, letterSpacing: 0.4, fontFamily: fontFamilies.bold },
  superadminText: { color: palette.statusLowText },
  emptyText: { color: palette.muted, fontSize: 11, fontFamily: fontFamilies.regular, paddingVertical: 14 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  field: { flexGrow: 1, flexBasis: 230, marginBottom: 4 },
  label: { color: palette.ink, fontSize: 9, fontFamily: fontFamilies.semiBold, marginBottom: 6 },
  input: { height: 43, borderWidth: 1, borderColor: palette.line, borderRadius: 10, paddingHorizontal: 11, color: palette.ink, backgroundColor: palette.paper, fontSize: 10, fontFamily: fontFamilies.regular },
  submitButton: { minHeight: 43, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: palette.pumpkinOrange },
  submitPressed: { opacity: 0.86 },
  submitText: { color: '#fff', fontSize: 10, fontFamily: fontFamilies.semiBold },
  permissionNote: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 14, padding: 14, backgroundColor: palette.yellowSoft },
  permissionIcon: { width: 22, height: 22, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', borderRadius: 8, backgroundColor: palette.burntYellow, color: '#211d1a', fontFamily: fontFamilies.bold },
  permissionText: { flex: 1, color: palette.ink, fontSize: 10, lineHeight: 16, fontFamily: fontFamilies.medium },
  feedback: { color: palette.dirtyOrange, fontSize: 10, lineHeight: 16, fontFamily: fontFamilies.medium, marginVertical: 6 },
  feedbackDanger: { color: palette.danger },
  });
}
