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
    void form.submit();
  }

  return (
    <main className="auth-page">
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

        <section className="form-panel" aria-label="Sign in">
          <div className="mobile-wordmark">
            <StockMateMark />
            <span className="wordmark-copy">
              <strong>StockMate</strong>
              <small>Your Inventory, Your Control.</small>
            </span>
          </div>
          <div className="form-content">
            <div className="form-topline">
              <span className="form-kicker">WELCOME BACK</span>
              <span className="secure-label"><span aria-hidden="true">✦</span> SECURE ACCESS</span>
            </div>

            <h2>Good to see you.</h2>
            <p className="form-intro">Sign in and get back to what you do best.</p>

            {form.startupError ? (
              <div className="form-notice" role="alert">{form.startupError}</div>
            ) : null}

            <form className="auth-form" onSubmit={handleSubmit}>
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
                    Sign in to StockMate
                    <span className="button-arrow" aria-hidden="true">↗</span>
                  </>
                )}
              </Button>
            </form>

            <div className="form-divider"><span>MADE FOR PEACE OF MIND</span></div>
            <div className="form-footnote">
              <span className="footnote-icon" aria-hidden="true">✓</span>
              <span>Your credentials are encrypted and protected.</span>
            </div>
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
