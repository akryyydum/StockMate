import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { RefreshToken } from './models/RefreshToken.js';
import { User } from './models/User.js';

const app = express();
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_HASH_ROUNDS = 12;

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:8081,http://localhost:19006')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      const error = new Error('Origin not allowed.');
      error.status = 403;
      callback(error);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '10kb', strict: true }));

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Try again later.' },
});

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(12).max(128).refine(
  (value) => Buffer.byteLength(value, 'utf8') <= 72,
  'Password must be no more than 72 UTF-8 bytes.',
);

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(40).max(200).nullable().optional(),
});

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function createAccessToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: 'stockmate-api',
    audience: 'stockmate-app',
  });
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('base64url');
  await RefreshToken.create({
    userId,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return token;
}

async function createSession(user) {
  const [accessToken, refreshToken] = await Promise.all([
    Promise.resolve(createAccessToken(user)),
    createRefreshToken(user.id),
  ]);
  return {
    accessToken,
    refreshToken,
    user: publicUser(user),
  };
}

function validate(schema, data, res) {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({ message: 'Please check the information you entered.' });
    return null;
  }
  return result.data;
}

function requireAccessToken(req, res, next) {
  const authorization = req.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  try {
    const claims = jwt.verify(authorization.slice(7), process.env.JWT_ACCESS_SECRET, {
      issuer: 'stockmate-api',
      audience: 'stockmate-app',
    });
    if (typeof claims === 'string' || typeof claims.sub !== 'string') {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }
    req.authUserId = claims.sub;
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', authRateLimit, async (req, res) => {
  const input = validate(registerSchema, req.body, res);
  if (!input) return;

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
  try {
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
    res.status(201).json(await createSession(user));
  } catch (error) {
    if (error?.code === 11000) {
      res.status(409).json({ message: 'An account with that email already exists.' });
      return;
    }
    throw error;
  }
});

app.post('/api/auth/login', authRateLimit, async (req, res) => {
  const input = validate(loginSchema, req.body, res);
  if (!input) return;

  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  const passwordMatches = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !passwordMatches) {
    res.status(401).json({ message: 'Email or password is incorrect.' });
    return;
  }

  res.json(await createSession(user));
});

app.post('/api/auth/refresh', async (req, res) => {
  const input = validate(refreshSchema, req.body, res);
  if (!input) return;
  if (!input.refreshToken) {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    return;
  }

  const oldToken = await RefreshToken.findOneAndDelete({
    tokenHash: hashRefreshToken(input.refreshToken),
  });
  if (!oldToken || oldToken.expiresAt <= new Date()) {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    return;
  }

  const user = await User.findById(oldToken.userId);
  if (!user) {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    return;
  }
  res.json(await createSession(user));
});

app.post('/api/auth/logout', async (req, res) => {
  const input = validate(refreshSchema, req.body, res);
  if (!input) return;
  if (input.refreshToken) {
    await RefreshToken.deleteOne({ tokenHash: hashRefreshToken(input.refreshToken) });
  }
  res.status(204).end();
});

app.get('/api/auth/me', requireAccessToken, async (req, res) => {
  const user = await User.findById(req.authUserId);
  if (!user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }
  res.json({ user: publicUser(user) });
});

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) {
    console.error('Request failed:', error);
  }
  res.status(status).json({
    message: status >= 500 ? 'A server error occurred.' : error.message,
  });
});

export { app };
