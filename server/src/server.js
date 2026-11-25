import 'dotenv/config';
import { Buffer } from 'node:buffer';
import mongoose from 'mongoose';
import { app } from './app.js';

const port = Number(process.env.PORT ?? 4000);
const accessSecret = process.env.JWT_ACCESS_SECRET;

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
  app.listen(port, () => {
    console.log(`StockMate API listening on port ${port}.`);
  });
} catch (error) {
  console.error('Could not start StockMate API:', error);
  process.exitCode = 1;
}
