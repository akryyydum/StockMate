import type { FormEvent } from 'react';
import { useAuthForm } from '../auth/useAuthForm';
import BlurText from './BlurText.web';
import { Button } from './ui/button.web';
import { Input } from './ui/input.web';
import '../styles/auth.css';

function StockMateMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 42 42" role="presentation">
        <rect x="7" y="23" width="8" height="12" rx="3" fill="currentColor" />
        <rect x="17" y="17" width="8" height="18" rx="3" fill="currentColor" opacity=".8" />
        <rect x="27" y="10" width="8" height="25" rx="3" fill="currentColor" opacity=".62" />
        <path d="m8 19 10-6 8 1 8-7" fill="none" stroke="#211d1a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.7" />
        <path d="m29 7 5-.2-.3 5" fill="none" stroke="#211d1a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.7" />
      </svg>
    </span>
  );
}

function StockIllustration() {
  return (
    <div className="inventory-preview" aria-label="Inventory status preview">
      <div className="preview-heading">
        <span className="preview-led" />
        <span>INVENTORY PULSE</span>
        <span className="preview-period">THIS WEEK</span>
      </div>
      <div className="preview-summary">
        <div>
          <span className="preview-label">Items in stock</span>
          <strong>248</strong>
        </div>
        <span className="preview-change">↗ 12.8%</span>
      </div>
      <div className="chart" aria-hidden="true">
        {[35, 52, 43, 74, 58, 91, 67, 100, 79, 91, 66, 86].map((height, index) => (
          <span
            className={index === 7 ? 'chart-bar chart-bar-highlight' : 'chart-bar'}
            key={`${height}-${index}`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="preview-footer">
        <span>MON</span>
        <span>WED</span>
        <span>FRI</span>
        <span>SUN</span>
      </div>
      <div className="stock-status">
        <span className="status-icon">!</span>
        <span><strong>3 items</strong> need a quick restock</span>
        <span aria-hidden="true">→</span>
      </div>
    </div>
  );
}

export function AuthScreen() {
  const form = useAuthForm();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.recoveryStep === 'request') {
      void form.requestPasswordReset();
    } else if (form.recoveryStep === 'verify') {
      void form.completePasswordReset();
    } else {
      void form.submit();
    }
  }

  return (
    <main className={`auth-page auth-page-${form.mode}${form.recoveryStep ? ' auth-page-recovery' : ''}`}>
      <div className="auth-shell">
        <section className="showcase" aria-label="StockMate inventory management">
          <div className="showcase-grid" aria-hidden="true" />
          <div className="showcase-top">
            <a className="wordmark" href="/" aria-label="StockMate home">
              <StockMateMark />
              <span className="wordmark-copy">
                <strong>StockMate</strong>
                <small>Your Inventory, Your Control.</small>
              </span>
            </a>
            <span className="edition-chip"><span /> STOCK, SIMPLIFIED</span>
          </div>

          <div className="showcase-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> MADE FOR YOUR NEXT MOVE</span>
            <h1>Know what’s in stock. <em>Own what’s next.</em></h1>
            <p className="showcase-description">
              A clearer view of your inventory, so the day runs a little smoother.
            </p>
            <div className="animated-tagline" aria-label="Your inventory. Your control.">
              <BlurText
                text="Your inventory. Your control."
                className="blur-tagline"
                color="#fffefa"
                fromColor="#fbe8b6"
                animateBy="words"
                direction="top"
                distance={14}
                blur={6}
                stepDuration={0.42}
                trigger="load"
              />
            </div>
          </div>

          <StockIllustration />

          <div className="showcase-bottom">
            <span className="bottom-mark">S</span>
            <span>Less guessing. More good stock days.</span>
            <span className="bottom-decoration" aria-hidden="true">✳</span>
          </div>
        </section>

        <section className="form-panel" aria-label={form.recoveryStep ? 'Reset password' : form.mode === 'register' ? 'Register' : 'Sign in'}>
          <div className="mobile-wordmark">
            <StockMateMark />
            <span className="wordmark-copy">
              <strong>StockMate</strong>
              <small>Your Inventory, Your Control.</small>
            </span>
          </div>
          <div className="form-content">
            <div className="form-topline">
              <span className="form-kicker">
                {form.recoveryStep ? 'ACCOUNT RECOVERY' : form.mode === 'register' ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}
              </span>
              <span className="secure-label"><span aria-hidden="true">✦</span> SECURE ACCESS</span>
            </div>

            <h2>
              {form.recoveryStep === 'request'
                ? 'Reset your password.'
                : form.recoveryStep === 'verify'
                  ? 'Check your email.'
                  : form.mode === 'register'
                    ? 'Your inventory, your own.'
                    : 'Good to see you.'}
            </h2>
            <p className="form-intro">
              {form.recoveryStep === 'request'
                ? 'Enter your account email and we’ll send a six-digit reset code.'
                : form.recoveryStep === 'verify'
                  ? 'Enter the six-digit code and choose a new password.'
                  : form.mode === 'register'
                    ? 'Create a private workspace with your own Super Admin account.'
                    : 'Sign in and get back to what you do best.'}
            </p>

            {!form.recoveryStep && form.startupError ? (
              <div className="form-notice" role="alert">{form.startupError}</div>
            ) : null}

            {form.successMessage ? <p className="form-success" role="status">{form.successMessage}</p> : null}

            {form.recoveryStep ? (
              <>
                <form className="auth-form recovery-form" onSubmit={handleSubmit}>
                  {form.recoveryStep === 'request' ? (
                    <div className="field-group">
                      <label htmlFor="recovery-email">Email address</label>
                      <Input
                        id="recovery-email"
                        type="email"
                        value={form.email}
                        onChange={(event) => form.setEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        autoCapitalize="none"
                        required
                      />
                    </div>
                  ) : (
                    <>
                      <div className="recovery-email-row">
                        <span>{form.email}</span>
                        <button type="button" className="recovery-email-edit" onClick={form.editRecoveryEmail}>
                          Change
                        </button>
                      </div>
                      <div className="field-group">
                        <label htmlFor="reset-otp">Six-digit email code</label>
                        <Input
                          id="reset-otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          value={form.otp}
                          onChange={(event) => form.setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          required
                        />
                      </div>
                      <div className="field-group">
                        <label htmlFor="new-password">New password</label>
                        <Input
                          id="new-password"
                          type="password"
                          autoComplete="new-password"
                          minLength={12}
                          maxLength={128}
                          value={form.newPassword}
                          onChange={(event) => form.setNewPassword(event.target.value)}
                          placeholder="At least 12 characters"
                          required
                        />
                      </div>
                      <div className="field-group">
                        <label htmlFor="confirm-new-password">Confirm new password</label>
                        <Input
                          id="confirm-new-password"
                          type="password"
                          autoComplete="new-password"
                          minLength={12}
                          maxLength={128}
                          value={form.confirmNewPassword}
                          onChange={(event) => form.setConfirmNewPassword(event.target.value)}
                          placeholder="Enter your new password again"
                          required
                        />
                      </div>
                    </>
                  )}

                  {form.error ? <p className="form-error" role="alert">{form.error}</p> : null}

                  <Button type="submit" className="submit-button" disabled={form.busy}>
                    {form.busy ? (
                      <>
                        <span className="button-spinner" aria-hidden="true" />
                        Working on it…
                      </>
                    ) : form.recoveryStep === 'request' ? (
                      'Send reset code'
                    ) : (
                      'Reset password'
                    )}
                  </Button>
                </form>
                {form.recoveryStep === 'verify' ? (
                  <button
                    className="auth-mode-toggle"
                    type="button"
                    disabled={form.busy}
                    onClick={() => void form.requestPasswordReset()}
                  >
                    Send a new code
                  </button>
                ) : null}
                <button
                  className="auth-mode-toggle"
                  type="button"
                  disabled={form.busy}
                  onClick={form.cancelPasswordRecovery}
                >
                  Back to sign in
                </button>
              </>
            ) : (
              <>
                <form className="auth-form" onSubmit={handleSubmit}>
                  {form.mode === 'register' ? (
                    <div className="field-group">
                      <label htmlFor="name">Full name</label>
                      <Input
                        id="name"
                        type="text"
                        value={form.name}
                        onChange={(event) => form.setName(event.target.value)}
                        placeholder="Your name"
                        autoComplete="name"
                        maxLength={60}
                        required
                      />
                    </div>
                  ) : null}
                  <div className="field-group">
                    <label htmlFor="email">Email address</label>
                    <div className="input-wrap">
                      <span className="field-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none">
                          <rect x="2.4" y="4" width="15.2" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                          <path d="m3.3 5.3 6.7 5.2 6.7-5.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </svg>
                      </span>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(event) => form.setEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        autoCapitalize="none"
                        required
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <div className="label-line">
                      <label htmlFor="password">Password</label>
                      {form.mode === 'login' ? (
                        <button type="button" className="forgot-password-link" onClick={form.startPasswordRecovery}>
                          Forgot password?
                        </button>
                      ) : null}
                    </div>
                    <div className="input-wrap">
                      <span className="field-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none">
                          <rect x="3.2" y="8.2" width="13.6" height="9.2" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M6.2 8.2V5.8a3.8 3.8 0 0 1 7.6 0v2.4" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="10" cy="12.7" r="1" fill="currentColor" />
                        </svg>
                      </span>
                      <Input
                        id="password"
                        type={form.showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(event) => form.setPassword(event.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        autoCapitalize="none"
                        maxLength={128}
                        minLength={form.mode === 'register' ? 12 : undefined}
                        required
                      />
                      <button
                        className="password-toggle"
                        type="button"
                        onClick={() => form.setShowPassword((current) => !current)}
                        aria-label={form.showPassword ? 'Hide password' : 'Show password'}
                      >
                        {form.showPassword ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>

                  {form.error ? <p className="form-error" role="alert">{form.error}</p> : null}

                  <Button type="submit" className="submit-button" disabled={form.busy}>
                    {form.busy ? (
                      <>
                        <span className="button-spinner" aria-hidden="true" />
                        Working on it…
                      </>
                    ) : (
                      <>
                        {form.mode === 'register' ? 'Create Super Admin account' : 'Sign in to StockMate'}
                        <span className="button-arrow" aria-hidden="true">↗</span>
                      </>
                    )}
                  </Button>
                </form>

                <button
                  className="auth-mode-toggle"
                  type="button"
                  disabled={form.busy}
                  onClick={() => form.setMode(form.mode === 'login' ? 'register' : 'login')}
                >
                  {form.mode === 'register' ? 'Already have an account? Sign in' : 'New to StockMate? Register'}
                </button>

                <div className="form-divider"><span>MADE FOR PEACE OF MIND</span></div>
                <div className="form-footnote">
                  <span className="footnote-icon" aria-hidden="true">✓</span>
                  <span>Your credentials are encrypted and protected.</span>
                </div>
              </>
            )}
          </div>
          <div className="panel-footer">
            <span>© StockMate</span>
            <span>Inventory, in good hands.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
