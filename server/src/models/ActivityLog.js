import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    actorRole: {
      type: String,
      enum: ['admin', 'superadmin'],
      required: true,
    },
    type: {
      type: String,
      enum: [
        'login',
        'user_created',
        'inventory_created',
        'inventory_updated',
        'stock_in',
        'stock_out',
      ],
      required: true,
      index: true,
    },
    itemName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    targetName: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    quantity: {
      type: Number,
      min: 0,
    },
    unit: {
      type: String,
      trim: true,
      maxlength: 24,
    },
  },
  { timestamps: true },
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ accountId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
