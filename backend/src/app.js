/**
 * Express Application Configuration
 * VaaniFill AI Backend API
 */

import express from 'express'
import cors from 'cors'
import guestRoutes from './routes/guestRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import formRoutes from './routes/formRoutes.js'
import extractRoutes from './routes/extractRoutes.js'

const app = express()

// Global Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CORS_ORIGIN
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Chrome extension background workers)
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
      return callback(null, true)
    }
    return callback(null, true) // Permissive for local hackathon collaboration
  },
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'vaanifill-backend',
    timestamp: new Date().toISOString(),
  })
})

// Root API Directory
app.get('/api', (req, res) => {
  res.json({
    name: 'VaaniFill AI API',
    version: '1.0.0',
    description: 'Multilingual voice and document form assistance API',
    endpoints: {
      health: 'GET /api/health',
      guestSession: 'POST /api/guest/session',
      documentsUpload: 'POST /api/documents/upload',
      forms: 'GET /api/forms',
      formMatch: 'POST /api/forms/match',
      voiceExtract: 'POST /api/extract',
      fieldValidate: 'POST /api/validate'
    },
  })
})

// Feature Route Modules
app.use('/api/guest', guestRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/forms', formRoutes)
app.use('/api', extractRoutes)

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  })
})

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[Backend Error]:', err)
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred.',
  })
})

export default app
