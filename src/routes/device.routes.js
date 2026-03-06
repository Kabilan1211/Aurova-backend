import express from 'express'
import crypto from 'crypto'
import { query } from '../config/db.js'
import { getIO } from '../socket/socket.js'
import { deviceAuth } from '../middleware/deviceAuth.js'
import { adminAuth } from '../middleware/adminAuth.js'

const router = express.Router()

// Register Device (Admin Protected)
router.post('/register', adminAuth, async (req, res) => {
  try {
    const { machineId, machineName, firmwareVersion } = req.body

    const groupName = "AUROVA"
    const ipAddress = "0.0.0.0"

    const deviceToken = crypto.randomBytes(32).toString('hex')

    const { rows } = await query(
      `INSERT INTO devices
       (machine_id, machine_name, group_name, ip_address, firmware_version, status, registered_at, device_token)
       VALUES ($1,$2,$3,$4,$5,'offline',NOW(),$6)
       RETURNING *`,
      [machineId, machineName, groupName, ipAddress, firmwareVersion, deviceToken]
    )

    getIO().emit('deviceUpdated', rows[0])

    res.json({
      success: true,
      device: {
        machine_id: rows[0].machine_id,
        device_token: deviceToken
      }
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error registering device" })
  }
})

// Heartbeat (Device Protected)
router.post('/heartbeat', deviceAuth, async (req, res) => {
  try {
    const device = req.device
    const version = req.body.version

    // 🔹 Update firmware version
    const { rows: versionRows } = await query(
      `
      UPDATE devices
      SET firmware_version = $1
      WHERE device_token = $2
      RETURNING *
      `,
      [version, device.device_token]
    )

    const updatedDevice = versionRows[0]

    if (updatedDevice) {
      getIO().emit('deviceUpdated', updatedDevice)
    }

    // 🔥 Detect real client IP
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.socket.remoteAddress ||
      "0.0.0.0"

    // 🔹 Get previous status
    const { rows: currentRows } = await query(
      `SELECT status FROM devices WHERE machine_id=$1`,
      [device.machine_id]
    )

    if (!currentRows.length) {
      return res.status(404).json({ message: "Device not found" })
    }

    const previousStatus = currentRows[0].status

    // 🔹 Update heartbeat
    const { rows } = await query(
      `
      UPDATE devices
      SET last_seen = NOW(),
          status = 'online',
          ip_address = $2
      WHERE machine_id = $1
      RETURNING *
      `,
      [device.machine_id, clientIp]
    )

    const deviceUpdated = rows[0]

    // 🔹 Emit only if status changed
    if (previousStatus === 'offline') {
      getIO().emit('deviceUpdated', deviceUpdated)
      console.log(`⚡ Device ${device.machine_id} came ONLINE`)
    }

    res.json({ success: true })

  } catch (err) {
    console.error("Heartbeat error:", err)
    res.status(500).json({ message: 'Internal server error' })
  }
})
export default router