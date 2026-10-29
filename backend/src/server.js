/**
 * Server Entrypoint
 * Loads environment variables, initializes MongoDB connection, and listens on PORT.
 */

import 'dotenv/config'
import app from './app.js'
import { connectDB } from './config/db.js'
import { seedDemoUserInMongo } from './routes/authRoutes.js'

const PORT = process.env.PORT || 5000

// Initialize database connection (graceful in-memory fallback if no URI provided)
connectDB().then((connected) => {
  if (connected) {
    seedDemoUserInMongo()
  }
})

app.listen(PORT, () => {
  console.log(`🚀 VaaniFill Backend listening on http://localhost:${PORT}`)
  console.log(`📡 Health check available at http://localhost:${PORT}/api/health`)
})
