/**
 * User Mongoose Model
 * Stores registered citizen accounts and saved profile fields for 1-click form autofill.
 */

import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    profile: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    strict: false,
  }
)

export default mongoose.models.User || mongoose.model('User', UserSchema)

