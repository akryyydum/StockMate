import 'dotenv/config';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { app } from './app.js';
import { User } from './models/User.js';

const port = Number(process.env.PORT ?? 4000);
const accessSecret = process.env.JWT_ACCESS_SECRET;
const PASSWORD_HASH_ROUNDS = 12;

async function ensureSuperadmin() {
  if (await User.exists({ role: 'superadmin' })) {
    return;
  }

  const email = `admin-${crypto.randomBytes(6).toString('hex')}@stockmate.local`;
  const password = crypto.randomBytes(24).toString('base64url');
  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

  try {
    await User.create({
      name: 'StockMate Administrator',
      email,
      passwordHash,
      role: 'superadmin',
      mustChangeCredentials: true,
    });
  } catch (error) {
    if (error?.code === 11000 && (await User.exists({ role: 'superadmin' }))) {
      return;
    }
    throw error;
  }

  console.info('A first-use StockMate superadmin was created. Change both credentials after signing in:');
  console.info(`Email: ${email}`);
  console.info(`Password: ${password}`);
}

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI must be configured.');
}
if (!accessSecret || Buffer.byteLength(accessSecret, 'utf8') < 32) {
  throw new Error('JWT_ACCESS_SECRET must be configured with at least 32 bytes.');
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port.');
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  await ensureSuperadmin();
  app.listen(port, () => {
    console.log(`StockMate API listening on port ${port}.`);
  });
} catch (error) {
  console.error('Could not start StockMate API:', error);
  process.exitCode = 1;
}
