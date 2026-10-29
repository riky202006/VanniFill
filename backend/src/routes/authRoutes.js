/**
 * Authentication and User Profile Routes
 * Conforms to frontend constants/api.js
 * Endpoints:
 * - POST /api/auth/register
 * - POST /api/auth/login
 * - POST /api/auth/logout
 * - GET  /api/user/profile
 */

import { Router } from 'express'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'vaanifill-jwt-secret-key-ctrl-freaks-2026'

// In-memory user database
const users = new Map()

// Seed a demonstration user for instant hackathon testing
const demoPasswordHash = bcrypt.hashSync('password123', 8)
const demoUserId = 'usr_ctrl_freaks_demo'
users.set('demo@vaanifill.ai', {
  id: demoUserId,
  name: 'Devansh Dausodia',
  email: 'demo@vaanifill.ai',
  passwordHash: demoPasswordHash,
  profile: {
    fullName: 'Devansh Dausodia',
    mobile: '9876543210',
    email: 'demo@vaanifill.ai',
    dob: '2002-05-14',
    gender: 'Male',
    category: 'OBC',
    state: 'Assam',
    postalCode: '781001',
    annualIncome: '250000'
  },
  createdAt: new Date().toISOString()
})

/**
 * Helper: Generate JWT token
 */
function createToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

/**
 * Authentication Middleware
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token missing or invalid.'
    })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token expired or invalid.'
    })
  }
}

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {}

  if (!email || !password || !name) {
    return res.status(400).json({
      error: 'ValidationFailed',
      message: 'Name, email, and password are required.'
    })
  }

  const lowerEmail = email.toLowerCase().trim()
  if (users.has(lowerEmail)) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'An account with this email already exists.'
    })
  }

  const passwordHash = await bcrypt.hash(password, 8)
  const userId = `usr_${crypto.randomBytes(4).toString('hex')}`

  const newUser = {
    id: userId,
    name: name.trim(),
    email: lowerEmail,
    passwordHash,
    profile: {
      fullName: name.trim(),
      email: lowerEmail,
      mobile: null,
      dob: null
    },
    createdAt: new Date().toISOString()
  }

  users.set(lowerEmail, newUser)
  const token = createToken(newUser)

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      profile: newUser.profile
    }
  })
})

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({
      error: 'ValidationFailed',
      message: 'Email and password are required.'
    })
  }

  const user = users.get(email.toLowerCase().trim())
  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid email or password.'
    })
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash)
  if (!isValidPassword) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid email or password.'
    })
  }

  const token = createToken(user)

  res.status(200).json({
    message: 'Logged in successfully',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile
    }
  })
})

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.status(200).json({
    message: 'Logged out successfully'
  })
})

/**
 * User Profile Router (mounted on /api/user)
 */
export const userRouter = Router()

userRouter.get('/profile', (req, res) => {
  const authHeader = req.headers.authorization
  let user = null

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      user = users.get(decoded.email)
    } catch {
      // ignore token decode errors and fall back
    }
  }

  // Fallback to demo user if testing without bearer token
  if (!user) {
    user = users.get('demo@vaanifill.ai')
  }

  res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile
  })
})

userRouter.put('/profile', (req, res) => {
  const authHeader = req.headers.authorization
  let user = users.get('demo@vaanifill.ai')

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      if (users.has(decoded.email)) {
        user = users.get(decoded.email)
      }
    } catch {}
  }

  user.profile = { ...user.profile, ...(req.body || {}) }

  res.status(200).json({
    message: 'Profile updated successfully',
    profile: user.profile
  })
})

export default router
