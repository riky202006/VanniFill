/**
 * Form Submission Mongoose Model
 * Stores completed form instances and verification receipts.
 */

import mongoose from 'mongoose'

const SubmissionSchema = new mongoose.Schema(
  {
    submissionId: { type: String, required: true, unique: true },
    formId: { type: String, required: true },
    formTitle: { type: String, required: true },
    fieldValues: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, default: 'ready' },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema)

