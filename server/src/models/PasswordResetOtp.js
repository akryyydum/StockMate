import mongoose from 'mongoose';

const passwordResetOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
    requestedAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
  },
  { timestamps: true },
);

export const PasswordResetOtp = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);
