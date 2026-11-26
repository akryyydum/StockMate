import { useAuthForm } from '../auth/useAuthForm';
import { colors, fontFamilies } from '../theme';
import { LoadingAnimation } from './LoadingAnimation';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

export function AuthScreen() {
  const form = useAuthForm();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const recovery = Boolean(form.recoveryStep);

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, compact && styles.compactScrollContent]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.brandRow}>
            <Image source={require('../../assets/brand-logo.png')} style={styles.brandIcon} />
            <View>
              <Text style={styles.brand}>StockMate</Text>
              <Text style={styles.brandTagline}>Your Inventory, Your Control.</Text>
            </View>
          </View>

          {!compact && !recovery ? (
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
                <Image source={require('../../assets/brand-logo.png')} style={styles.heroIcon} />
                <View style={styles.artLabel}>
                  <View style={styles.artDot} />
                  <Text style={styles.artLabelText}>Stock on track</Text>
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.intro}>
              <Text style={styles.eyebrow}>
                {form.recoveryStep ? 'ACCOUNT RECOVERY' : form.mode === 'register' ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}
              </Text>
              <Text style={styles.heading}>
                {form.recoveryStep === 'request'
                  ? 'Reset your password.'
                  : form.recoveryStep === 'verify'
                    ? 'Check your email.'
                    : form.mode === 'register'
                      ? 'Your inventory, your own.'
                      : 'Good to see you.'}
              </Text>
              <Text style={styles.description}>
                {form.recoveryStep === 'request'
                  ? 'Enter your account email and we’ll send a six-digit reset code.'
                  : form.recoveryStep === 'verify'
                    ? 'Enter the six-digit code and choose a new password.'
                    : form.mode === 'register'
                      ? 'Create a private workspace with your own Super Admin account.'
                      : 'Sign in to pick up right where you left off.'}
              </Text>
            </View>

            {!recovery && form.startupError ? (
              <View accessibilityRole="alert" style={styles.notice}>
                <Text style={styles.noticeText}>{form.startupError}</Text>
              </View>
            ) : null}

            {form.successMessage ? (
              <Text accessibilityRole="alert" style={styles.success}>{form.successMessage}</Text>
            ) : null}

            {form.recoveryStep ? (
              <>
                {form.recoveryStep === 'request' ? (
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
                ) : (
                  <>
                    <View style={styles.recoveryEmailRow}>
                      <Text style={styles.recoveryEmail} numberOfLines={1}>{form.email}</Text>
                      <Pressable onPress={form.editRecoveryEmail} accessibilityRole="button">
                        <Text style={styles.recoveryLink}>Change</Text>
                      </Pressable>
                    </View>
                    <Field
                      label="Six-digit email code"
                      value={form.otp}
                      onChangeText={(value) => form.setOtp(value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      accessibilityLabel="Six-digit email code"
                      maxLength={6}
                    />
                    <Field
                      label="New password"
                      value={form.newPassword}
                      onChangeText={form.setNewPassword}
                      placeholder="At least 12 characters"
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="new-password"
                      textContentType="newPassword"
                      accessibilityLabel="New password"
                      maxLength={128}
                    />
                    <Field
                      label="Confirm new password"
                      value={form.confirmNewPassword}
                      onChangeText={form.setConfirmNewPassword}
                      placeholder="Enter it again"
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="new-password"
                      textContentType="newPassword"
                      accessibilityLabel="Confirm new password"
                      maxLength={128}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                {form.mode === 'register' ? (
                  <Field
                    label="Full name"
                    value={form.name}
                    onChangeText={form.setName}
                    placeholder="Your name"
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

                <View style={styles.field}>
                  <View style={styles.passwordLabelRow}>
                    <Text style={styles.label}>Password</Text>
                    {form.mode === 'login' ? (
                      <Pressable onPress={form.startPasswordRecovery} accessibilityRole="button">
                        <Text style={styles.recoveryLink}>Forgot password?</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <TextInput
                    accessibilityLabel="Password"
                    autoCapitalize="none"
                    autoComplete="current-password"
                    maxLength={128}
                    onChangeText={form.setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#938b82"
                    secureTextEntry={!form.showPassword}
                    style={styles.input}
                    textContentType="password"
                    value={form.password}
                  />
                </View>

                {form.mode === 'login' ? (
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
                ) : null}
              </>
            )}

            {form.error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {form.error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={form.busy}
              onPress={() => {
                if (form.recoveryStep === 'request') void form.requestPasswordReset();
                else if (form.recoveryStep === 'verify') void form.completePasswordReset();
                else void form.submit();
              }}
              style={({ pressed }) => [
                styles.submit,
                pressed && !form.busy && styles.submitPressed,
                form.busy && styles.submitDisabled,
              ]}
            >
              {form.busy ? (
                <LoadingAnimation size={22} />
              ) : (
                <Text style={styles.submitText}>
                  {form.recoveryStep === 'request'
                    ? 'Send reset code'
                    : form.recoveryStep === 'verify'
                      ? 'Reset password'
                      : form.mode === 'register'
                        ? 'Create Super Admin account'
                        : 'Sign in to StockMate'}
                </Text>
              )}
            </Pressable>
            {form.recoveryStep ? (
              <>
                {form.recoveryStep === 'verify' ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={form.busy}
                    onPress={() => void form.requestPasswordReset()}
                    style={styles.modeToggle}
                  >
                    <Text style={styles.modeToggleText}>Send a new code</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={form.busy}
                  onPress={form.cancelPasswordRecovery}
                  style={styles.modeToggle}
                >
                  <Text style={styles.modeToggleText}>Back to sign in</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={form.busy}
                onPress={() => form.setMode(form.mode === 'login' ? 'register' : 'login')}
                style={styles.modeToggle}
              >
                <Text style={styles.modeToggleText}>
                  {form.mode === 'register' ? 'Already have an account? Sign in' : 'New to StockMate? Register'}
                </Text>
              </Pressable>
            )}
          </View>

          {!recovery ? (
            <Text style={styles.securityText}>
              Your account is protected with encrypted credentials.
            </Text>
          ) : null}
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
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences';
  autoComplete?: 'email' | 'current-password' | 'name' | 'one-time-code' | 'new-password';
  textContentType?: 'emailAddress' | 'password' | 'name' | 'oneTimeCode' | 'newPassword';
  maxLength?: number;
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
  maxLength,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        keyboardType={keyboardType}
        maxLength={maxLength}
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
  compactScrollContent: { paddingVertical: 12 },
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
  passwordLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  recoveryEmailRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    marginBottom: 13,
  },
  recoveryEmail: { flex: 1, color: colors.muted, fontSize: 12, fontFamily: fontFamilies.regular },
  recoveryLink: { color: colors.dirtyOrange, fontSize: 10, fontFamily: fontFamilies.semiBold },
  success: {
    color: '#256d3b',
    backgroundColor: '#f0fff3',
    borderColor: '#b8dfc0',
    borderWidth: 1,
    borderRadius: 9,
    padding: 10,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 12,
    fontFamily: fontFamilies.medium,
  },
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
  modeToggle: { alignSelf: 'center', padding: 8, marginTop: 6 },
  modeToggleText: { color: colors.dirtyOrange, fontSize: 11, fontFamily: fontFamilies.semiBold },
  securityText: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 9,
    fontFamily: fontFamilies.regular,
    marginTop: 15,
  },
});
