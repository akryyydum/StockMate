import { useAuthForm } from '../auth/useAuthForm';
import { colors, fontFamilies } from '../theme';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export function AuthScreen() {
  const form = useAuthForm();

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.brandRow}>
            <Image source={require('../../assets/icon.png')} style={styles.brandIcon} />
            <View>
              <Text style={styles.brand}>StockMate</Text>
              <Text style={styles.brandTagline}>Your Inventory, Your Control.</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <View style={styles.pill}>
                <View style={styles.pillDot} />
                <Text style={styles.pillText}>BUILT FOR BETTER STOCK DAYS</Text>
              </View>
              <Text style={styles.heroTitle}>A clearer view of what matters.</Text>
              <Text style={styles.heroSubtitle}>
                Keep every item in shape, and every next step in sight.
              </Text>
            </View>
            <View style={styles.heroArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Image source={require('../../assets/icon.png')} style={styles.heroIcon} />
              <View style={styles.artLabel}>
                <View style={styles.artDot} />
                <Text style={styles.artLabelText}>Stock on track</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.intro}>
              <Text style={styles.eyebrow}>{form.isRegister ? 'GET STARTED' : 'WELCOME BACK'}</Text>
              <Text style={styles.heading}>
                {form.isRegister ? 'Create your account' : 'Good to see you.'}
              </Text>
              <Text style={styles.description}>
                {form.isRegister
                  ? 'Set up your secure StockMate account.'
                  : 'Sign in to pick up right where you left off.'}
              </Text>
            </View>

            {form.startupError ? (
              <View accessibilityRole="alert" style={styles.notice}>
                <Text style={styles.noticeText}>{form.startupError}</Text>
              </View>
            ) : null}

            {form.isRegister ? (
              <Field
                label="Full name"
                value={form.name}
                onChangeText={form.setName}
                placeholder="Jordan Lee"
                autoComplete="name"
                textContentType="name"
                accessibilityLabel="Full name"
              />
            ) : null}

            <Field
              label="Email address"
              value={form.email}
              onChangeText={form.setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              accessibilityLabel="Email address"
            />

            <Field
              label="Password"
              value={form.password}
              onChangeText={form.setPassword}
              placeholder={form.isRegister ? 'At least 12 characters' : 'Enter your password'}
              secureTextEntry={!form.showPassword}
              autoCapitalize="none"
              autoComplete={form.isRegister ? 'new-password' : 'current-password'}
              textContentType={form.isRegister ? 'newPassword' : 'password'}
              accessibilityLabel="Password"
            />

            {form.isRegister ? (
              <Field
                label="Confirm password"
                value={form.confirmPassword}
                onChangeText={form.setConfirmPassword}
                placeholder="Enter your password again"
                secureTextEntry={!form.showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                accessibilityLabel="Confirm password"
              />
            ) : null}

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: form.showPassword }}
              onPress={() => form.setShowPassword((current) => !current)}
              style={styles.showPassword}
            >
              <View style={[styles.checkbox, form.showPassword && styles.checkboxChecked]}>
                {form.showPassword ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.showPasswordText}>Show password</Text>
            </Pressable>

            {form.error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {form.error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={form.busy}
              onPress={() => void form.submit()}
              style={({ pressed }) => [
                styles.submit,
                pressed && !form.busy && styles.submitPressed,
                form.busy && styles.submitDisabled,
              ]}
            >
              {form.busy ? (
                <ActivityIndicator color={colors.paper} />
              ) : (
                <Text style={styles.submitText}>
                  {form.isRegister ? 'Create account' : 'Sign in to StockMate'}
                </Text>
              )}
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchPrompt}>
                {form.isRegister ? 'Already have an account? ' : 'New to StockMate? '}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => form.changeMode(form.isRegister ? 'login' : 'register')}
              >
                <Text style={styles.switchAction}>
                  {form.isRegister ? 'Sign in' : 'Create account'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.securityText}>
            Your account is protected with encrypted credentials.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  autoComplete?: 'name' | 'email' | 'new-password' | 'current-password';
  textContentType?: 'name' | 'emailAddress' | 'newPassword' | 'password';
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete,
  textContentType,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#938b82"
        secureTextEntry={secureTextEntry}
        style={styles.input}
        textContentType={textContentType}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.boneWhite },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  container: { width: '100%', maxWidth: 460, alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  brandIcon: { width: 44, height: 44, borderRadius: 13 },
  brand: { color: colors.ink, fontSize: 17, fontFamily: fontFamilies.bold },
  brandTagline: { color: colors.muted, fontSize: 10, fontFamily: fontFamilies.regular, marginTop: 1 },
  hero: {
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 174,
    backgroundColor: colors.pumpkinOrange,
    borderRadius: 22,
    padding: 21,
    marginBottom: 15,
  },
  heroCopy: { flex: 1, justifyContent: 'center', paddingRight: 4, zIndex: 1 },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 12,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  pillText: { color: colors.ink, fontSize: 8, letterSpacing: 0.6, fontFamily: fontFamilies.bold },
  heroTitle: { maxWidth: 220, color: colors.ink, fontSize: 20, lineHeight: 27, fontFamily: fontFamilies.bold },
  heroSubtitle: {
    maxWidth: 230,
    color: 'rgba(33,29,26,0.78)',
    fontSize: 11,
    lineHeight: 17,
    fontFamily: fontFamilies.medium,
    marginTop: 5,
  },
  heroArt: { width: 78, justifyContent: 'center', alignItems: 'center', marginLeft: -4 },
  heroIcon: { width: 76, height: 76, borderRadius: 22 },
  artLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: colors.paper,
    marginTop: 8,
  },
  artDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#43885a' },
  artLabelText: { color: colors.ink, fontSize: 8, fontFamily: fontFamilies.medium },
  card: {
    backgroundColor: colors.paper,
    borderColor: '#e5e0d9',
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  intro: { marginBottom: 19 },
  eyebrow: {
    color: colors.dirtyOrange,
    fontSize: 10,
    fontFamily: fontFamilies.bold,
    letterSpacing: 1.4,
  },
  heading: { color: colors.ink, fontSize: 23, lineHeight: 32, fontFamily: fontFamilies.bold, marginTop: 6 },
  description: { color: colors.muted, fontSize: 12, lineHeight: 19, fontFamily: fontFamilies.regular, marginTop: 4 },
  notice: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff3de',
    borderColor: '#f0d398',
    borderWidth: 1,
    marginBottom: 14,
  },
  noticeText: { color: '#76510a', fontSize: 12, lineHeight: 18, fontFamily: fontFamilies.medium },
  field: { marginBottom: 13 },
  label: { color: colors.ink, fontSize: 11, fontFamily: fontFamilies.semiBold, marginBottom: 7 },
  input: {
    minHeight: 47,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: '#fff',
    color: colors.ink,
    fontSize: 13,
    fontFamily: fontFamilies.regular,
  },
  showPassword: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#c4bcb3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.dirtyOrange, borderColor: colors.dirtyOrange },
  checkmark: { color: '#fff', fontSize: 11, lineHeight: 14, fontFamily: fontFamilies.bold },
  showPasswordText: { color: colors.muted, fontSize: 11, fontFamily: fontFamilies.regular },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginBottom: 12, fontFamily: fontFamilies.medium },
  submit: {
    minHeight: 49,
    borderRadius: 11,
    backgroundColor: colors.pumpkinOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitPressed: { opacity: 0.86 },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: colors.ink, fontSize: 13, fontFamily: fontFamilies.bold },
  switchRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 17 },
  switchPrompt: { color: colors.muted, fontSize: 11, fontFamily: fontFamilies.regular },
  switchAction: { color: colors.dirtyOrange, fontSize: 11, fontFamily: fontFamilies.bold },
  securityText: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 9,
    fontFamily: fontFamilies.regular,
    marginTop: 15,
  },
});
