import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authApi, User } from '../auth/authApi';
import { useAppTheme } from '../ThemeProvider';
import { fontFamilies, ThemeColors } from '../theme';

type Props = {
  accessToken: string;
  role: User['role'];
};

export function UserManagement({ accessToken, role }: Props) {
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
  const [newRole, setNewRole] = useState<'admin' | 'superadmin'>('admin');

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
        role: newRole,
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
          {loading ? <ActivityIndicator color={palette.dirtyOrange} /> : null}
        </View>

        {error ? <Feedback text={error} danger /> : null}
        {notice ? <Feedback text={notice} /> : null}

        {users.map((user) => (
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
          </View>
        ))}

        {!loading && users.length === 0 ? (
          <Text style={styles.emptyText}>No user accounts found.</Text>
        ) : null}
      </View>

      {role === 'superadmin' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add a team member</Text>
          <Text style={styles.cardSubtitle}>
            Admins can use inventory. Superadmins can manage users and inventory.
          </Text>
          <View style={styles.formGrid}>
            <Field label="Full name" value={name} onChangeText={setName} placeholder="e.g. Alex Rivera" />
            <Field label="Email address" value={email} onChangeText={setEmail} placeholder="alex@example.com" autoCapitalize="none" />
            <Field label="Initial password (12+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
            <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" />
          </View>
          <Text style={styles.label}>Access level</Text>
          <View style={styles.rolePicker}>
            <RoleOption label="Admin" detail="Inventory access" selected={newRole === 'admin'} onPress={() => setNewRole('admin')} />
            <RoleOption label="Superadmin" detail="Manage users" selected={newRole === 'superadmin'} onPress={() => setNewRole('superadmin')} />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void createUser()}
            style={({ pressed }) => [styles.submitButton, pressed && styles.submitPressed]}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add user</Text>}
          </Pressable>
        </View>
      ) : (
        <View style={styles.permissionNote}>
          <Text style={styles.permissionIcon}>i</Text>
          <Text style={styles.permissionText}>
            You can view the team, but only a superadmin can add user accounts.
          </Text>
        </View>
      )}
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

function RoleOption({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.roleOption, selected && styles.roleOptionSelected]}
    >
      <Text style={styles.roleOptionTitle}>{label}</Text>
      <Text style={styles.roleOptionDetail}>{detail}</Text>
    </Pressable>
  );
}

function Feedback({ text, danger = false }: { text: string; danger?: boolean }) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  return <Text accessibilityRole="alert" style={[styles.feedback, danger && styles.feedbackDanger]}>{text}</Text>;
}

function createStyles(palette: ThemeColors) {
  return StyleSheet.create({
  page: { gap: 18 },
  title: { color: palette.ink, fontSize: 24, fontFamily: fontFamilies.bold },
  subtitle: { color: palette.muted, fontSize: 12, fontFamily: fontFamilies.regular, marginTop: 4 },
  card: { padding: 20, borderRadius: 18, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { color: palette.ink, fontSize: 16, fontFamily: fontFamilies.semiBold },
  cardSubtitle: { color: palette.muted, fontSize: 10, lineHeight: 16, fontFamily: fontFamilies.regular, marginTop: 4, marginBottom: 14 },
  userRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: 1, borderTopColor: palette.line },
  avatar: { width: 35, height: 35, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.yellowSoft },
  avatarText: { color: palette.dirtyOrange, fontSize: 13, fontFamily: fontFamilies.bold },
  userDetails: { flex: 1 },
  userName: { color: palette.ink, fontSize: 11, fontFamily: fontFamilies.semiBold },
  userEmail: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.regular, marginTop: 3 },
  roleBadge: { backgroundColor: palette.yellowSoft, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 },
  superadminBadge: { backgroundColor: palette.orangeSoft },
  roleText: { color: palette.statusInText, fontSize: 8, letterSpacing: 0.4, fontFamily: fontFamilies.bold },
  superadminText: { color: palette.statusLowText },
  emptyText: { color: palette.muted, fontSize: 11, fontFamily: fontFamilies.regular, paddingVertical: 14 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  field: { flexGrow: 1, flexBasis: 230, marginBottom: 4 },
  label: { color: palette.ink, fontSize: 9, fontFamily: fontFamilies.semiBold, marginBottom: 6 },
  input: { height: 43, borderWidth: 1, borderColor: palette.line, borderRadius: 10, paddingHorizontal: 11, color: palette.ink, backgroundColor: palette.paper, fontSize: 10, fontFamily: fontFamilies.regular },
  rolePicker: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 15 },
  roleOption: { flex: 1, minHeight: 60, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  roleOptionSelected: { borderColor: palette.pumpkinOrange, backgroundColor: palette.accentSoft },
  roleOptionTitle: { color: palette.ink, fontSize: 10, fontFamily: fontFamilies.semiBold },
  roleOptionDetail: { color: palette.muted, fontSize: 9, fontFamily: fontFamilies.regular, marginTop: 3 },
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
