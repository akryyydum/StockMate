import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      default: 'Coffee',
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 24,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumStock: {
      type: Number,
      required: true,
      min: 0,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
);

inventoryItemSchema.index({ accountId: 1, name: 1 });

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
