import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

process.env.JWT_ACCESS_SECRET = 'test-secret-that-is-long-enough-for-jwt-signing';
process.env.CORS_ORIGINS = 'http://localhost:8081';

const { app } = await import('../src/app.js');
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
  it('reports the health endpoint without connecting to MongoDB', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  it('does not expose a public registration endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Lee',
        email: 'jordan@example.com',
        password: 'short',
      }),
    });
    assert.equal(response.status, 404);
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

  it('requires a bearer token for the account endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(response.status, 401);
  });

  it('requires authentication to access user management', async () => {
    const response = await fetch(`${baseUrl}/api/users`);
    assert.equal(response.status, 401);
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

  it('requires authentication to change account credentials', async () => {
    const response = await fetch(`${baseUrl}/api/auth/credentials`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'a', email: 'a@example.com', password: 'a'.repeat(12) }),
    });
    assert.equal(response.status, 401);
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
