import 'dotenv/config';
import { Buffer } from 'node:buffer';
import mongoose from 'mongoose';
import { ActivityLog } from './models/ActivityLog.js';
import { app } from './app.js';
import { InventoryItem } from './models/InventoryItem.js';
import { StockMovement } from './models/StockMovement.js';
import { User } from './models/User.js';

const port = Number(process.env.PORT ?? 4000);
const accessSecret = process.env.JWT_ACCESS_SECRET;

async function migrateAccountOwnership() {
  const primarySuperadmin = await User.findOne({ role: 'superadmin' }).sort({ createdAt: 1, _id: 1 });
  const unassignedUsers = await User.find({ accountId: { $exists: false } });
  const unassignedItems = await InventoryItem.exists({ accountId: { $exists: false } });
  const unassignedMovements = await StockMovement.exists({ accountId: { $exists: false } });
  const unassignedActivities = await ActivityLog.exists({ accountId: { $exists: false } });

  if (
    !primarySuperadmin &&
    (unassignedUsers.length > 0 || unassignedItems || unassignedMovements || unassignedActivities)
  ) {
    throw new Error(
      'Existing records do not have an account owner. Restore a legacy Super Admin before starting the API.',
    );
  }

  for (const user of unassignedUsers) {
    user.accountId =
      user.role === 'superadmin' ? user._id : primarySuperadmin._id;
    await user.save();
  }

  if (!primarySuperadmin) return;

  await Promise.all([
    InventoryItem.updateMany(
      { accountId: { $exists: false } },
      { $set: { accountId: primarySuperadmin._id } },
    ),
    StockMovement.updateMany(
      { accountId: { $exists: false } },
      { $set: { accountId: primarySuperadmin._id } },
    ),
  ]);

  const assignedUsers = await User.find({ accountId: { $exists: true } }).select('_id accountId');
  const accountByUserId = new Map(assignedUsers.map((user) => [user.id, user.accountId]));
  const unassignedLogActors = await ActivityLog.find({ accountId: { $exists: false } }).distinct('actorId');
  const actorsByAccount = new Map();
  for (const actorId of unassignedLogActors) {
    const accountId = accountByUserId.get(actorId.toString()) ?? primarySuperadmin._id;
    const key = accountId.toString();
    const actors = actorsByAccount.get(key) ?? [];
    actors.push(actorId);
    actorsByAccount.set(key, actors);
  }
  await Promise.all(
    [...actorsByAccount].map(([accountId, actorIds]) =>
      ActivityLog.updateMany(
        { accountId: { $exists: false }, actorId: { $in: actorIds } },
        { $set: { accountId } },
      ),
    ),
  );
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
  await migrateAccountOwnership();
  app.listen(port, () => {
    console.log(`StockMate API listening on port ${port}.`);
  });
} catch (error) {
  console.error('Could not start StockMate API:', error);
  process.exitCode = 1;
}
