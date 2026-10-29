/**
 * Server Entrypoint
 * Loads environment variables and begins listening on the configured PORT.
 */

import 'dotenv/config'
import app from './app.js'

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 VaaniFill Backend listening on http://localhost:${PORT}`)
  console.log(`📡 Health check available at http://localhost:${PORT}/api/health`)
})
