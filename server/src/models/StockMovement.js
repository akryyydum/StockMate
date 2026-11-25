import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['in', 'out'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

stockMovementSchema.index({ createdAt: 1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
