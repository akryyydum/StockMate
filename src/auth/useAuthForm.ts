import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { authApi } from './authApi';

export function useAuthForm() {
  const { login, register, startupError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify' | null>(null);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  async function submit() {
    setError(null);
    setSuccessMessage(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to continue.');
    } finally {
      setBusy(false);
    }
  }

  function startPasswordRecovery() {
    setError(null);
    setSuccessMessage(null);
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setRecoveryStep('request');
  }

  function editRecoveryEmail() {
    setError(null);
    setSuccessMessage(null);
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setRecoveryStep('request');
  }

  function cancelPasswordRecovery() {
    setError(null);
    setSuccessMessage(null);
    setRecoveryStep(null);
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
  }

  async function requestPasswordReset() {
    setError(null);
    setSuccessMessage(null);
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }

    setBusy(true);
    try {
      const response = await authApi.requestPasswordReset(email.trim());
      setRecoveryStep('verify');
      setSuccessMessage(response.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send a reset code.');
    } finally {
      setBusy(false);
    }
  }

  async function completePasswordReset() {
    setError(null);
    setSuccessMessage(null);
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the six-digit code from your email.');
      return;
    }
    if (newPassword.length < 12) {
      setError('Use at least 12 characters for your new password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('The new passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const response = await authApi.resetPassword(email.trim(), otp, newPassword);
      setRecoveryStep(null);
      setPassword('');
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccessMessage(response.message);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset your password.');
    } finally {
      setBusy(false);
    }
  }

  return {
    mode,
    setMode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    busy,
    error,
    successMessage,
    startupError,
    submit,
    recoveryStep,
    otp,
    setOtp,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    startPasswordRecovery,
    editRecoveryEmail,
    cancelPasswordRecovery,
    requestPasswordReset,
    completePasswordReset,
  };
}
