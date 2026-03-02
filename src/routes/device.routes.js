import express from 'express'
import crypto from 'crypto'
import { query } from '../config/db.js'
import { getIO } from '../socket/socket.js'
import { deviceAuth } from '../middleware/deviceAuth.js'

const router = express.Router()

// Register Device (Admin Protected)
router.post('/register', async (req, res) => {
  try {
    const { machineId, machineName, groupName, ipAddress, firmwareVersion } = req.body

    if (!machineId || !machineName || !firmwareVersion)
      return res.status(400).json({ message: 'Required fields missing' })

    const deviceToken = crypto.randomBytes(32).toString('hex')

    await query(`
      INSERT INTO devices(machine_id, machine_name, group_name, ip_address, firmware_version, device_token)
      VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(machine_id) DO NOTHING
    `, [machineId, machineName, groupName, ipAddress, firmwareVersion, deviceToken])

    const { rows } = await query(
      `SELECT * FROM devices WHERE machine_id=$1`,
      [machineId]
    )

    getIO().emit('deviceUpdated', rows[0])

    res.json({
      success: true,
      device: rows[0]
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Heartbeat (Device Protected)
router.post('/heartbeat', deviceAuth, async (req, res) => {
  try {
    const device = req.device

    // 1️⃣ Get current status
    const { rows: currentRows } = await query(
      `SELECT status FROM devices WHERE machine_id=$1`,
      [device.machine_id]
    )

    const previousStatus = currentRows[0]?.status

    // 2️⃣ Update heartbeat
    const { rows } = await query(`
      UPDATE devices
      SET last_seen=NOW(),
          status='online'
      WHERE machine_id=$1
      RETURNING *
    `, [device.machine_id])

    const updatedDevice = rows[0]

    // 3️⃣ Emit ONLY if status changed
    if (previousStatus === 'offline') {
      getIO().emit('deviceUpdated', updatedDevice)
      console.log(`Device ${device.machine_id} came ONLINE`)
    }

    res.json({ success: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router