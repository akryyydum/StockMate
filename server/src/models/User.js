import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'superadmin'],
      default: 'admin',
      required: true,
    },
    mustChangeCredentials: {
      type: Boolean,
      default: false,
      required: true,
    },
    currency: {
      type: String,
      enum: ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD'],
      default: 'PHP',
      required: true,
    },
    sessionDurationMinutes: {
      type: Number,
      min: 1,
      max: 30 * 24 * 60,
      default: 120,
    },
  },
  { timestamps: true },
);

userSchema.index({ accountId: 1, createdAt: 1 });

export const User = mongoose.model('User', userSchema);
