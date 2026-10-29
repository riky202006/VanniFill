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
      fullName: { type: String, default: '' },
      mobile: { type: String, default: null },
      email: { type: String, default: '' },
      dob: { type: String, default: null },
      gender: { type: String, default: null },
      category: { type: String, default: null },
      state: { type: String, default: null },
      postalCode: { type: String, default: null },
      annualIncome: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.User || mongoose.model('User', UserSchema)

