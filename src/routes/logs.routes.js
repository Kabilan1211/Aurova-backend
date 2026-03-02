import express from 'express'
import { query} from '../config/db.js'
import { deviceAuth } from '../middleware/deviceAuth.js'
import { getIO } from '../socket/socket.js'

const router = express.Router()

// Device sends logs
router.post('/', deviceAuth, async (req, res) => {
  try {
    const { level, message } = req.body
    const machineId = req.device.machine_id

    if (!level || !message)
      return res.status(400).json({ message: 'Level and message required' })

    const { rows } = await query(`
      INSERT INTO device_logs(machine_id, level, message)
      VALUES($1,$2,$3)
      RETURNING *
    `, [machineId, level, message])

    getIO().emit('newLog', rows[0])

    res.json({ success: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router