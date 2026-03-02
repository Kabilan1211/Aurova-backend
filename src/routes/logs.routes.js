import express from 'express'
import { query } from '../config/db.js'
import { deviceAuth } from '../middleware/deviceAuth.js'
import adminAuth from '../middleware/adminAuth.js'
import { getIO } from '../socket/socket.js'

const router = express.Router()

/**
 * POST /api/logs
 * Device sends log
 * Keeps only latest 100 logs per device
 */
router.post('/', deviceAuth, async (req, res) => {
  try {
    const { level, message } = req.body
    const machineId = req.device.machine_id

    if (!level || !message) {
      return res.status(400).json({
        message: 'Level and message required'
      })
    }

    // 1️⃣ Insert new log
    const { rows } = await query(`
      INSERT INTO device_logs (machine_id, level, message, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `, [machineId, level, message])

    const insertedLog = rows[0]

    // 2️⃣ Keep only latest 100 logs per device
    await query(`
      DELETE FROM device_logs
      WHERE id IN (
        SELECT id FROM device_logs
        WHERE machine_id = $1
        ORDER BY created_at ASC
        OFFSET 100
      )
    `, [machineId])

    // 3️⃣ Emit realtime update
    getIO().emit('newLog', insertedLog)

    res.json({
      success: true,
      log: insertedLog
    })

  } catch (err) {
    console.error("POST /api/logs error:", err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * GET /api/logs/:machineId
 * Admin fetch latest 50 logs for UI
 */
router.get('/:machineId', adminAuth, async (req, res) => {
  try {
    const { machineId } = req.params

    const { rows } = await query(`
      SELECT id, machine_id, level, message, created_at
      FROM device_logs
      WHERE machine_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [machineId])

    res.json({
      machineId,
      count: rows.length,
      logs: rows
    })

  } catch (err) {
    console.error("GET /api/logs error:", err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router