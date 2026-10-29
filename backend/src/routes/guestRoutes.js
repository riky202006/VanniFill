/**
 * Guest Session Routes
 * Initializes zero-login guest sessions conforming to shared/api-contracts/form-api.json
 */

import { Router } from 'express'
import crypto from 'crypto'

const router = Router()

// In-memory guest session store for hackathon speed
const guestSessions = new Map()

router.post('/session', (req, res) => {
  const { preferredLanguage = 'en' } = req.body || {}
  const sessionId = crypto.randomUUID()
  const sessionKey = `guest_${crypto.randomBytes(4).toString('hex')}`
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const session = {
    sessionId,
    sessionKey,
    preferredLanguage,
    createdAt: new Date().toISOString(),
    expiresAt,
    formValues: {}
  }

  guestSessions.set(sessionId, session)

  res.status(201).json({
    sessionId,
    sessionKey,
    expiresAt
  })
})

export default router

