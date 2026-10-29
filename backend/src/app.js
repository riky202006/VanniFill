/**
 * Express Application Configuration
 * VaaniFill AI Backend API
 */

import express from 'express'
import cors from 'cors'

const app = express()

// Global Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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

// Root API placeholder
app.get('/api', (req, res) => {
  res.json({
    name: 'VaaniFill AI API',
    version: '1.0.0',
    description: 'Multilingual form assistance API',
    endpoints: {
      health: '/api/health',
      guest: '/api/guest',
      documents: '/api/documents',
      forms: '/api/forms',
      auth: '/api/auth',
    },
  })
})

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
