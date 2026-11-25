import { useState } from 'react';
import { useAuth } from './AuthProvider';

export type AuthMode = 'login' | 'register';

export function useAuthForm() {
  const { login, register, startupError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  }

  async function submit() {
    setError(null);
    if (mode === 'register') {
      if (password.length < 12) {
        setError('Use at least 12 characters for a stronger password.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Those passwords don’t match.');
        return;
      }
    }

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

  return {
    mode,
    isRegister: mode === 'register',
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    busy,
    error,
    startupError,
    changeMode,
    submit,
  };
}
