/**
 * Citizen Submissions & Application History Routes
 * Stores and retrieves verified form submissions from MongoDB Atlas or in-memory cache.
 */

import { Router } from 'express'
import jwt from 'jsonwebtoken'
import Submission from '../models/Submission.js'
import { isMongoConnected } from '../config/db.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'vaanifill-jwt-secret-key-ctrl-freaks-2026'

// In-memory submissions cache
export const submissionsCache = new Map()

// GET /api/user/submissions (Retrieve submission history)
router.get('/', async (req, res) => {
  let userEmail = null
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET)
      userEmail = decoded.email
    } catch {}
  }

  // 1. If MongoDB is connected, fetch from cloud cluster
  if (isMongoConnected()) {
    try {
      const docs = await Submission.find({}).sort({ createdAt: -1 }).limit(20)
      return res.json({
        source: 'MongoDB Atlas',
        count: docs.length,
        submissions: docs.map(d => ({
          submissionId: d.submissionId,
          formId: d.formId,
          formTitle: d.formTitle,
          status: d.status,
          fieldValues: d.fieldValues,
          createdAt: d.createdAt,
          downloadUrl: `/api/forms/${d.submissionId}/download`
        }))
      })
    } catch (err) {
      console.warn('[SubmissionRoutes] MongoDB fetch fallback:', err.message)
    }
  }

  // 2. In-memory cache fallback
  const list = Array.from(submissionsCache.values()).reverse()
  res.json({
    source: 'In-Memory Cache',
    count: list.length,
    submissions: list
  })
})

export default router

