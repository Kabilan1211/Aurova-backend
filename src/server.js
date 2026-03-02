import http from 'http'
import dotenv from 'dotenv'
import { createApp } from './app.js'
import { initSocket } from './socket/socket.js'
import { startOfflineJob } from './jobs/offlineJob.js'

dotenv.config()

const app = createApp()

// Create HTTP server
const server = http.createServer(app)

// Initialize WebSocket
initSocket(server)

// Start background offline detection
startOfflineJob()

// Start server
const PORT = process.env.PORT || 4000

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})