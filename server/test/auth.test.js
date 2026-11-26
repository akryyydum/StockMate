import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

process.env.JWT_ACCESS_SECRET = 'test-secret-that-is-long-enough-for-jwt-signing';
process.env.CORS_ORIGINS = 'http://localhost:8081';

const {
  app,
  createSmtpTransport,
  generatePasswordResetOtp,
  hashPasswordResetOtp,
  passwordResetRequestSchema,
  passwordResetSchema,
  settingsSchema,
  verifyPasswordResetOtp,
} = await import('../src/app.js');
const { ActivityLog } = await import('../src/models/ActivityLog.js');
const { InventoryItem } = await import('../src/models/InventoryItem.js');
const { PasswordResetOtp } = await import('../src/models/PasswordResetOtp.js');
const { RefreshToken } = await import('../src/models/RefreshToken.js');
const { StockMovement } = await import('../src/models/StockMovement.js');
const { User } = await import('../src/models/User.js');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await once(server, 'close');
});

describe('authentication API input handling', () => {
  it('requires account ownership on users and account data records', () => {
    for (const model of [User, InventoryItem, StockMovement, ActivityLog]) {
      assert.equal(model.schema.path('accountId').isRequired, true, `${model.modelName} requires accountId`);
    }
    assert.equal(User.schema.path('currency').getDefault(), 'PHP');
    assert.deepEqual(User.schema.path('currency').enumValues, [
      'PHP',
      'USD',
      'EUR',
      'GBP',
      'JPY',
      'CAD',
      'AUD',
      'SGD',
    ]);
    assert.equal(User.schema.path('sessionDurationMinutes').getDefault(), 120);
    assert.equal(RefreshToken.schema.path('expiresAt').options.default, null);
    assert.equal(Boolean(RefreshToken.schema.path('expiresAt').isRequired), false);
  });

  it('accepts supported session durations and bounds custom durations', () => {
    for (const sessionDurationMinutes of [null, 1, 30, 60, 120, 43_200]) {
      assert.equal(
        settingsSchema.safeParse({ sessionDurationMinutes }).success,
        true,
        `session duration ${sessionDurationMinutes} should be valid`,
      );
    }

    for (const sessionDurationMinutes of [0, -1, 1.5, 43_201]) {
      assert.equal(
        settingsSchema.safeParse({ sessionDurationMinutes }).success,
        false,
        `session duration ${sessionDurationMinutes} should be rejected`,
      );
    }

    assert.equal(settingsSchema.safeParse({}).success, false);
  });

  it('creates six-digit password reset codes and rejects a different code', () => {
    const otp = generatePasswordResetOtp();
    assert.match(otp, /^\d{6}$/);

    const email = 'jordan@example.com';
    const hash = hashPasswordResetOtp(email, otp);
    assert.equal(verifyPasswordResetOtp(email, otp, hash), true);
    const differentOtp = otp === '000000' ? '000001' : '000000';
    assert.equal(verifyPasswordResetOtp(email, differentOtp, hash), false);
    assert.equal(verifyPasswordResetOtp('other@example.com', otp, hash), false);

    assert.equal(PasswordResetOtp.schema.path('expiresAt').options.expires, 0);
    assert.equal(PasswordResetOtp.schema.path('attempts').getDefault(), 0);
  });

  it('validates recovery email, six-digit code, and new password inputs', () => {
    assert.equal(passwordResetRequestSchema.safeParse({ email: 'jordan@example.com' }).success, true);
    assert.equal(passwordResetRequestSchema.safeParse({ email: 'invalid' }).success, false);
    assert.equal(
      passwordResetSchema.safeParse({
        email: 'jordan@example.com',
        otp: '012345',
        password: 'a-valid-password',
      }).success,
      true,
    );
    for (const otp of ['12345', '1234567', '12a456']) {
      assert.equal(
        passwordResetSchema.safeParse({
          email: 'jordan@example.com',
          otp,
          password: 'a-valid-password',
        }).success,
        false,
      );
    }
  });

  it('reports the health endpoint without connecting to MongoDB', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  it('exposes registration and rejects malformed registration input', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Lee',
        email: 'jordan@example.com',
        password: 'short',
      }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      message: 'Please check the information you entered.',
    });
  });

  it('rejects malformed login input without revealing account details', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: '' }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      message: 'Please check the information you entered.',
    });
  });

  it('rejects malformed password reset requests before accessing account data', async () => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/api/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      }),
      fetch(`${baseUrl}/api/auth/password-reset`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'jordan@example.com',
          otp: 'not-six-digits',
          password: 'a-valid-password',
        }),
      }),
    ]);
    assert.deepEqual(responses.map((response) => response.status), [400, 400]);
    assert.deepEqual(
      await Promise.all(responses.map((response) => response.json())),
      [
        { message: 'Please check the information you entered.' },
        { message: 'Please check the information you entered.' },
      ],
    );
  });

  it('requires SMTP configuration before starting a password reset request', async () => {
    for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']) {
      delete process.env[key];
    }

    const response = await fetch(`${baseUrl}/api/auth/password-reset/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'jordan@example.com' }),
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), {
      message: 'Password reset email is not configured. Contact the system administrator.',
    });
  });

  it('uses EMAIL_USER and EMAIL_PASS for the SMTP transport', () => {
    const saved = new Map(
      ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_FROM', 'EMAIL_USER', 'EMAIL_PASS', 'SMTP_USER', 'SMTP_PASS']
        .map((key) => [key, process.env[key]]),
    );
    try {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_SECURE = 'false';
      process.env.SMTP_FROM = 'StockMate <mail@example.com>';
      process.env.EMAIL_USER = 'mail@example.com';
      process.env.EMAIL_PASS = 'test-app-password';
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const transport = createSmtpTransport();
      assert.equal(transport.options.host, 'smtp.example.com');
      assert.equal(transport.options.port, 587);
      assert.deepEqual(transport.options.auth, {
        user: 'mail@example.com',
        pass: 'test-app-password',
      });
    } finally {
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('requires a bearer token for the account endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(response.status, 401);
  });

  it('requires authentication to access user management', async () => {
    const response = await fetch(`${baseUrl}/api/users`);
    assert.equal(response.status, 401);
  });

  it('requires authentication to read paginated activity history', async () => {
    const response = await fetch(`${baseUrl}/api/activities?page=2`);
    assert.equal(response.status, 401);
  });

  it('requires authentication to read or update account settings', async () => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/api/settings`),
      fetch(`${baseUrl}/api/settings`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currency: 'USD' }),
      }),
    ]);
    assert.deepEqual(responses.map((response) => response.status), [401, 401]);
  });

  it('requires authentication before creating users', async () => {
    const response = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Lee',
        email: 'jordan@example.com',
        password: 'a'.repeat(12),
        role: 'admin',
      }),
    });
    assert.equal(response.status, 401);
  });

  it('requires authentication before editing or removing users', async () => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/api/users/507f1f77bcf86cd799439011`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'updated@example.com' }),
      }),
      fetch(`${baseUrl}/api/users/507f1f77bcf86cd799439011`, { method: 'DELETE' }),
    ]);
    assert.deepEqual(responses.map((response) => response.status), [401, 401]);
  });

  it('requires authentication to change account credentials', async () => {
    const response = await fetch(`${baseUrl}/api/auth/credentials`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'a', email: 'a@example.com', password: 'a'.repeat(12) }),
    });
    assert.equal(response.status, 401);
  });

  it('requires authentication for inventory read, creation, and stock movement', async () => {
    const requests = [
      fetch(`${baseUrl}/api/dashboard`),
      fetch(`${baseUrl}/api/inventory`),
      fetch(`${baseUrl}/api/inventory`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Coffee beans',
          category: 'Coffee',
          unit: 'kg',
          quantity: 5,
          minimumStock: 2,
          unitCost: 480,
        }),
      }),
      fetch(`${baseUrl}/api/inventory/not-an-id`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quantity: 3 }),
      }),
      fetch(`${baseUrl}/api/inventory/not-an-id/movements`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'in', quantity: 1 }),
      }),
    ];
    const responses = await Promise.all(requests);
    assert.deepEqual(responses.map((response) => response.status), [401, 401, 401, 401, 401]);
  });

  it('rejects unapproved browser origins', async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { origin: 'https://not-approved.example' },
    });
    assert.equal(response.status, 403);
  });

  it('limits repeated authentication attempts from one client', async () => {
    const responses = await Promise.all(
      Array.from({ length: 22 }, () =>
        fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'not-an-email', password: '' }),
        }),
      ),
    );
    assert.ok(responses.some((response) => response.status === 429));
  });
});
