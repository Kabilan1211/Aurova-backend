import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import { apiLimiter } from './middleware/rateLimiter.js'
import { errorHandler } from './middleware/errorHandler.js'

import authRoutes from './routes/auth.routes.js'
import deviceRoutes from './routes/device.routes.js'
import logsRoutes from './routes/logs.routes.js'
import adminRoutes from './routes/admin.routes.js'
import otaRoutes from './routes/ota.routes.js'
import pinoHttp from 'pino-http'
import { pinoLogger } from './config/logger.js'

dotenv.config()

export const createApp = () => {
  const app = express()

  // Global Middleware
  app.use(cors())
  app.use(express.json())
  app.use(apiLimiter)
  app.use(pinoHttp({ logger: pinoLogger }))

  // Routes
  app.use('/api/auth', authRoutes)
  app.use('/api/device', deviceRoutes)
  app.use('/api/logs', logsRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api/ota', otaRoutes)

  // Health check route
  app.get('/', (req, res) => {
    res.json({ status: 'IoT Backend Running' })
  })

  app.get('/metrics', async (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date()
  })
})

  // Error handler (must be last)
  app.use(errorHandler)

  return app
}