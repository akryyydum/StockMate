import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { z } from 'zod';
import { ActivityLog } from './models/ActivityLog.js';
import { InventoryItem } from './models/InventoryItem.js';
import { RefreshToken } from './models/RefreshToken.js';
import { StockMovement } from './models/StockMovement.js';
import { User } from './models/User.js';

const app = express();
const ACCESS_TOKEN_TTL = '15m';
const DEFAULT_SESSION_DURATION_MINUTES = 120;
const MAX_SESSION_DURATION_MINUTES = 30 * 24 * 60;
const PASSWORD_HASH_ROUNDS = 12;

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:8081,http://localhost:8082,http://localhost:19006')
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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: emailSchema,
  password: passwordSchema,
});

const credentialsSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  email: emailSchema,
  password: passwordSchema,
});

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: emailSchema,
  password: passwordSchema,
});

const updateUserSchema = z.object({
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
}).refine((value) => Object.keys(value).length > 0);

const inventoryItemSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.string().trim().min(1).max(60).default('Coffee'),
  unit: z.string().trim().min(1).max(24),
  quantity: z.number().finite().min(0).max(1_000_000_000),
  minimumStock: z.number().finite().min(0).max(1_000_000_000),
  unitCost: z.number().finite().min(0).max(1_000_000_000),
});

const updateInventoryItemSchema = inventoryItemSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

const stockMovementSchema = z.object({
  type: z.enum(['in', 'out']),
  quantity: z.number().finite().min(0.001).max(1_000_000_000),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(40).max(200).nullable().optional(),
});

const activityPageSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
});
const settingsSchema = z.object({
  currency: z.enum(['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD']).optional(),
  sessionDurationMinutes: z.number()
    .int()
    .min(1)
    .max(MAX_SESSION_DURATION_MINUTES)
    .nullable()
    .optional(),
}).refine((value) => Object.keys(value).length > 0);

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangeCredentials: user.mustChangeCredentials,
  };
}

function inventoryStatus(item) {
  if (item.quantity <= 0) return 'out-of-stock';
  if (item.quantity <= item.minimumStock) return 'low-stock';
  return 'in-stock';
}

function publicInventoryItem(item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantity: item.quantity,
    minimumStock: item.minimumStock,
    unitCost: item.unitCost,
    stockValue: item.quantity * item.unitCost,
    status: inventoryStatus(item),
    updatedAt: item.updatedAt,
  };
}

function recordActivity(actor, type, details = {}) {
  return ActivityLog.create({
    accountId: actor.accountId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    type,
    ...details,
  });
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

async function createRefreshToken(userId, expiresAt) {
  const token = crypto.randomBytes(48).toString('base64url');
  await RefreshToken.create({
    userId,
    tokenHash: hashRefreshToken(token),
    expiresAt,
  });
  return token;
}

async function getSessionExpiry(user) {
  const accountId = user.accountId ?? user.id;
  const account = await User.findOne({
    _id: accountId,
    accountId,
    role: 'superadmin',
  }).select('sessionDurationMinutes');
  if (!account) {
    throw new Error('The account session settings could not be found.');
  }

  const durationMinutes = account.sessionDurationMinutes === undefined
    ? DEFAULT_SESSION_DURATION_MINUTES
    : account.sessionDurationMinutes;
  return durationMinutes === null
    ? null
    : new Date(Date.now() + durationMinutes * 60 * 1000);
}

async function createSession(user, expiresAt) {
  const sessionExpiresAt = expiresAt === undefined ? await getSessionExpiry(user) : expiresAt;
  const [accessToken, refreshToken] = await Promise.all([
    Promise.resolve(createAccessToken(user)),
    createRefreshToken(user.id, sessionExpiresAt),
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

async function requireCurrentUser(req, res, next) {
  try {
    const user = await User.findById(req.authUserId);
    if (!user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }
    req.authUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireUpdatedCredentials(req, res, next) {
  if (req.authUser.mustChangeCredentials) {
    res.status(403).json({ message: 'Update your email and password before continuing.' });
    return;
  }
  next();
}

function requireSuperadmin(req, res, next) {
  if (req.authUser.role !== 'superadmin') {
    res.status(403).json({ message: 'Superadmin access is required.' });
    return;
  }
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', authRateLimit, async (req, res) => {
  const input = validate(registerSchema, req.body, res);
  if (!input) return;

  const user = new User({
    ...input,
    passwordHash: await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS),
    role: 'superadmin',
  });
  user.accountId = user._id;

  try {
    await user.save();
    const session = await createSession(user);
    res.status(201).json(session);
  } catch (error) {
    if (user.isNew === false) {
      await User.deleteOne({ _id: user.id });
    }
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

  await recordActivity(user, 'login');
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
  if (!oldToken || (oldToken.expiresAt && oldToken.expiresAt <= new Date())) {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    return;
  }

  const user = await User.findById(oldToken.userId);
  if (!user) {
    res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    return;
  }
  res.json(await createSession(user, oldToken.expiresAt));
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

app.put('/api/auth/credentials', requireAccessToken, requireCurrentUser, async (req, res) => {
  const input = validate(credentialsSchema, req.body, res);
  if (!input) return;

  const user = await User.findById(req.authUserId).select('+passwordHash');
  if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    res.status(401).json({ message: 'Current password is incorrect.' });
    return;
  }
  if (
    user.mustChangeCredentials &&
    (input.email === user.email || (await bcrypt.compare(input.password, user.passwordHash)))
  ) {
    res.status(400).json({ message: 'Choose a new email address and a different password.' });
    return;
  }

  user.email = input.email;
  user.passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
  user.mustChangeCredentials = false;
  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000) {
      res.status(409).json({ message: 'An account with that email already exists.' });
      return;
    }
    throw error;
  }

  await RefreshToken.deleteMany({ userId: user.id });
  res.json(await createSession(user));
});

app.get(
  '/api/settings',
  requireAccessToken,
  requireCurrentUser,
  requireUpdatedCredentials,
  requireSuperadmin,
  async (req, res) => {
    const account = await User.findOne({
      _id: req.authUser.accountId,
      accountId: req.authUser.accountId,
      role: 'superadmin',
    });
    if (!account) {
      res.status(404).json({ message: 'Account settings not found.' });
      return;
    }
    res.json({
      currency: account.currency,
      sessionDurationMinutes: account.sessionDurationMinutes === undefined
        ? DEFAULT_SESSION_DURATION_MINUTES
        : account.sessionDurationMinutes,
    });
  },
);

app.patch(
  '/api/settings',
  requireAccessToken,
  requireCurrentUser,
  requireUpdatedCredentials,
  requireSuperadmin,
  async (req, res) => {
    const input = validate(settingsSchema, req.body, res);
    if (!input) return;

    const account = await User.findOne({
      _id: req.authUser.accountId,
      accountId: req.authUser.accountId,
      role: 'superadmin',
    });
    if (!account) {
      res.status(404).json({ message: 'Account settings not found.' });
      return;
    }

    if (input.currency !== undefined) account.currency = input.currency;
    if (input.sessionDurationMinutes !== undefined) {
      account.sessionDurationMinutes = input.sessionDurationMinutes;
    }
    await account.save();
    res.json({
      currency: account.currency,
      sessionDurationMinutes: account.sessionDurationMinutes === undefined
        ? DEFAULT_SESSION_DURATION_MINUTES
        : account.sessionDurationMinutes,
    });
  },
);

app.get(
  '/api/users',
  requireAccessToken,
  requireCurrentUser,
  requireUpdatedCredentials,
  async (req, res) => {
    const users = await User.find({ accountId: req.authUser.accountId })
      .select('name email role mustChangeCredentials')
      .sort({ createdAt: 1 });
    res.json({ users: users.map(publicUser) });
  },
);

app.post(
  '/api/users',
  authRateLimit,
  requireAccessToken,
  requireCurrentUser,
  requireUpdatedCredentials,
  requireSuperadmin,
  async (req, res) => {
    const input = validate(createUserSchema, req.body, res);
    if (!input) return;

    const { password, ...userInput } = input;
    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    try {
      const user = await User.create({
        ...userInput,
        passwordHash,
        role: 'admin',
        accountId: req.authUser.accountId,
      });
      try {
        await recordActivity(req.authUser, 'user_created', { targetName: user.name });
      } catch (error) {
        await User.deleteOne({ _id: user.id });
        throw error;
      }
      res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      if (error?.code === 11000) {
        res.status(409).json({ message: 'An account with that email already exists.' });
        return;
      }
      throw error;
    }
  },
);

app.patch(
  '/api/users/:userId',
  requireAccessToken,
  requireCurrentUser,
  requireUpdatedCredentials,
  requireSuperadmin,
  async (req, res) => {
    const input = validate(updateUserSchema, req.body, res);
    if (!input) return;
    if (!mongoose.isValidObjectId(req.params.userId)) {
      res.status(404).json({ message: 'User account not found.' });
      return;
    }

    const user = await User.findOne({
      _id: req.params.userId,
      accountId: req.authUser.accountId,
    }).select('+passwordHash');
    if (!user) {
      res.status(404).json({ message: 'User account not found.' });
      return;
    }
    if (input.email !== undefined) user.email = input.email;
    if (input.password !== undefined) {
      user.passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
    }
    if (input.email !== undefined || input.password !== undefined) {
      user.mustChangeCredentials = user.id === req.authUser.id ? false : true;
    }

    try {
      await user.save();
    } catch (error) {
      if (error?.code === 11000) {
        res.status(409).json({ message: 'An account with that email already exists.' });
        return;
      }
      throw error;
    }

    await RefreshToken.deleteMany({ userId: user.id });
    res.json({ user: publicUser(user) });
  },
);

app.delete(
  '/api/users/:userId',
  requireAccessToken,
  requireCurrentUser,
  requireUpdatedCredentials,
  requireSuperadmin,
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      res.status(404).json({ message: 'User account not found.' });
      return;
    }
    if (req.params.userId === req.authUser.id) {
      res.status(400).json({ message: 'You cannot remove your own account.' });
      return;
    }

    const user = await User.findOne({
      _id: req.params.userId,
      accountId: req.authUser.accountId,
    });
    if (!user) {
      res.status(404).json({ message: 'User account not found.' });
      return;
    }
    if (user.role === 'superadmin') {
      res.status(400).json({ message: 'A Super Admin account cannot be removed from team management.' });
      return;
    }

    await Promise.all([
      User.deleteOne({ _id: user.id }),
      RefreshToken.deleteMany({ userId: user.id }),
    ]);
    res.status(204).end();
  },
);

app.get(
  '/api/activities',
  requireAccessToken,
  requireCurrentUser,
  requireUpdatedCredentials,
  async (req, res) => {
    const input = validate(activityPageSchema, req.query, res);
    if (!input) return;

    const filter = { accountId: req.authUser.accountId };
    const pageSize = 10;
    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((input.page - 1) * pageSize)
        .limit(pageSize)
        .select('actorName actorRole type itemName targetName quantity unit createdAt'),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      activities: activities.map((activity) => ({
        id: activity.id,
        actorName: activity.actorName,
        actorRole: activity.actorRole,
        type: activity.type,
        itemName: activity.itemName ?? null,
        targetName: activity.targetName ?? null,
        quantity: activity.quantity ?? null,
        unit: activity.unit ?? null,
        createdAt: activity.createdAt,
      })),
      page: input.page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  },
);

app.get(
  '/api/dashboard',
  requireAccessToken,
  requireCurrentUser,
  requireUpdatedCredentials,
  async (req, res) => {
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const [items, movements, activities, activityTotal, activeUsers, newItemsThisWeek] = await Promise.all([
      InventoryItem.find({ accountId: req.authUser.accountId }).select('quantity minimumStock unitCost createdAt'),
      StockMovement.find({ accountId: req.authUser.accountId, createdAt: { $gte: weekStart } }).select('type createdAt'),
      ActivityLog.find({ accountId: req.authUser.accountId }).sort({ createdAt: -1, _id: -1 }).limit(2).select(
        'actorName actorRole type itemName targetName quantity unit createdAt',
      ),
      ActivityLog.countDocuments({ accountId: req.authUser.accountId }),
      User.countDocuments({ accountId: req.authUser.accountId }),
      InventoryItem.countDocuments({ accountId: req.authUser.accountId, createdAt: { $gte: weekStart } }),
    ]);
    const dailyMovements = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setUTCDate(weekStart.getUTCDate() + index);
      const dateKey = date.toISOString().slice(0, 10);
      const dayMovements = movements.filter(
        (movement) => movement.createdAt.toISOString().slice(0, 10) === dateKey,
      );
      return {
        date: dateKey,
        label: date.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' }),
        incoming: dayMovements.filter((movement) => movement.type === 'in').length,
        outgoing: dayMovements.filter((movement) => movement.type === 'out').length,
      };
    });

    const summary = items.reduce(
      (totals, item) => {
        const status = inventoryStatus(item);
        totals.stockValue += item.quantity * item.unitCost;
        if (status === 'in-stock') totals.inStockItems += 1;
        if (status === 'low-stock') totals.lowStockItems += 1;
        if (status === 'out-of-stock') totals.outOfStockItems += 1;
        return totals;
      },
      {
        stockValue: 0,
        totalItems: items.length,
        inStockItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        activeUsers,
        movementsToday: movements.filter((movement) => movement.createdAt >= today).length,
        stockInsToday: movements.filter((movement) => movement.createdAt >= today && movement.type === 'in').length,
        stockOutsToday: movements.filter((movement) => movement.createdAt >= today && movement.type === 'out').length,
        newItemsThisWeek,
      },
    );

    res.json({
      summary,
      activities: activities.map((activity) => ({
        id: activity.id,
        actorName: activity.actorName,
        actorRole: activity.actorRole,
        type: activity.type,
        itemName: activity.itemName ?? null,
        targetName: activity.targetName ?? null,
        quantity: activity.quantity ?? null,
        unit: activity.unit ?? null,
        createdAt: activity.createdAt,
      })),
      activityTotal,
      dailyMovements,
    });
  },
);

app.get(
  '/api/inventory',
  requireAccessToken,
  requireCurrentUser,
  requireUpdatedCredentials,
  async (req, res) => {
    const [items, todayMovements] = await Promise.all([
      InventoryItem.find({ accountId: req.authUser.accountId }).sort({ name: 1 }),
      StockMovement.find({
        accountId: req.authUser.accountId,
        createdAt: { $gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) },
      }).select('createdAt'),
    ]);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const totals = items.reduce(
      (summary, item) => {
        summary.stockValue += item.quantity * item.unitCost;
        if (inventoryStatus(item) === 'low-stock') summary.lowStockItems += 1;
        if (inventoryStatus(item) === 'out-of-stock') summary.outOfStockItems += 1;
        return summary;
      },
      { stockValue: 0, lowStockItems: 0, outOfStockItems: 0 },
    );

    res.json({
      items: items.map(publicInventoryItem),
      summary: {
        ...totals,
        totalItems: items.length,
        movementsToday: todayMovements.length,
      },
    });
  },
);

app.post(
  '/api/inventory',
  requireAccessToken,
  requireCurrentUser,
  requireUpdatedCredentials,
  async (req, res) => {
    const input = validate(inventoryItemSchema, req.body, res);
    if (!input) return;
    const item = await InventoryItem.create({
      ...input,
      accountId: req.authUser.accountId,
    });
    try {
      await recordActivity(req.authUser, 'inventory_created', { itemName: item.name });
    } catch (error) {
      await InventoryItem.deleteOne({ _id: item.id });
      throw error;
    }
    res.status(201).json({ item: publicInventoryItem(item) });
  },
);

app.patch(
  '/api/inventory/:itemId',
  requireAccessToken,
  requireCurrentUser,
  requireUpdatedCredentials,
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.itemId)) {
      res.status(404).json({ message: 'Inventory item not found.' });
      return;
    }
    const input = validate(updateInventoryItemSchema, req.body, res);
    if (!input) return;
    const item = await InventoryItem.findOne({
      _id: req.params.itemId,
      accountId: req.authUser.accountId,
    });
    if (!item) {
      res.status(404).json({ message: 'Inventory item not found.' });
      return;
    }
    const previousValues = {
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      minimumStock: item.minimumStock,
      unitCost: item.unitCost,
    };
    const quantityDifference =
      input.quantity === undefined ? 0 : input.quantity - item.quantity;
    Object.assign(item, input);
    await item.save();
    let movement;
    if (quantityDifference !== 0) {
      try {
        movement = await StockMovement.create({
          itemId: item.id,
          accountId: req.authUser.accountId,
          type: quantityDifference > 0 ? 'in' : 'out',
          quantity: Math.abs(quantityDifference),
          performedBy: req.authUserId,
        });
        await recordActivity(
          req.authUser,
          quantityDifference > 0 ? 'stock_in' : 'stock_out',
          { itemName: item.name, quantity: Math.abs(quantityDifference), unit: item.unit },
        );
      } catch (error) {
        if (movement) await StockMovement.deleteOne({ _id: movement.id });
        Object.assign(item, previousValues);
        await item.save();
        throw error;
      }
    } else {
      try {
        await recordActivity(req.authUser, 'inventory_updated', { itemName: item.name });
      } catch (error) {
        Object.assign(item, previousValues);
        await item.save();
        throw error;
      }
    }
    res.json({ item: publicInventoryItem(item) });
  },
);

app.post(
  '/api/inventory/:itemId/movements',
  requireAccessToken,
  requireCurrentUser,
  requireUpdatedCredentials,
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.itemId)) {
      res.status(404).json({ message: 'Inventory item not found.' });
      return;
    }
    const input = validate(stockMovementSchema, req.body, res);
    if (!input) return;

    const update =
      input.type === 'in'
        ? { $inc: { quantity: input.quantity } }
        : { $inc: { quantity: -input.quantity } };
    const filter =
      input.type === 'in'
        ? { _id: req.params.itemId, accountId: req.authUser.accountId }
        : { _id: req.params.itemId, accountId: req.authUser.accountId, quantity: { $gte: input.quantity } };
    const item = await InventoryItem.findOneAndUpdate(filter, update, { new: true });
    if (!item) {
      const exists = await InventoryItem.exists({
        _id: req.params.itemId,
        accountId: req.authUser.accountId,
      });
      res.status(exists ? 400 : 404).json({
        message: exists ? 'There is not enough stock for that movement.' : 'Inventory item not found.',
      });
      return;
    }

    try {
      const movement = await StockMovement.create({
        itemId: item.id,
        accountId: req.authUser.accountId,
        type: input.type,
        quantity: input.quantity,
        performedBy: req.authUserId,
      });
      try {
        await recordActivity(
          req.authUser,
          input.type === 'in' ? 'stock_in' : 'stock_out',
          { itemName: item.name, quantity: input.quantity, unit: item.unit },
        );
      } catch (error) {
        await StockMovement.deleteOne({ _id: movement.id });
        throw error;
      }
    } catch (error) {
      const rollback =
        input.type === 'in'
          ? { $inc: { quantity: -input.quantity } }
          : { $inc: { quantity: input.quantity } };
      await InventoryItem.updateOne(
        { _id: item.id, accountId: req.authUser.accountId },
        rollback,
      );
      throw error;
    }

    res.json({ item: publicInventoryItem(item) });
  },
);

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

export { app, settingsSchema };
