/**
 * MongoDB Atlas Connection Configuration
 * Connects to MongoDB Atlas if MONGODB_URI is provided in .env.
 * Seamlessly falls back to in-memory mode if URI is absent or during offline testing.
 */

import mongoose from 'mongoose'
import dns from 'node:dns'

// Ensure Node.js can resolve MongoDB Atlas SRV records even if local Wi-Fi router blocks them
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (e) {
  // Use default resolver if custom servers cannot be set
}

let isConnected = false

export async function connectDB() {
  const uri = process.env.MONGODB_URI

  if (!uri || uri.includes('your-mongodb-atlas-connection-string')) {
    console.log('ℹ️  [Database] MONGODB_URI not configured. Running in high-performance in-memory mode.')
    return false
  }

  try {
    console.log('📡 [Database] Connecting to MongoDB Atlas...')
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    })
    isConnected = true
    console.log(`✅ [Database] MongoDB Atlas Connected: ${conn.connection.host}`)
    return true
  } catch (err) {
    console.warn(`⚠️  [Database] Could not connect to MongoDB Atlas: ${err.message}`)
    console.warn('💡 [Database Tip] If connecting from a new network or collaborating with teammates, verify cloud.mongodb.com -> Network Access has 0.0.0.0/0 (Allow access from anywhere).')
    console.warn('⚡ [Database] Running with zero-latency in-memory datastore fallback.')
    isConnected = false
    return false
  }
}

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1
}

