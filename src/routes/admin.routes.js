import express from 'express'
import { query } from '../config/db.js'
import { adminAuth } from '../middleware/adminAuth.js'

const router = express.Router()

router.get('/devices', adminAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM devices ORDER BY last_seen DESC`
    )

    res.json({ devices: rows })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

router.get('/device/:id', adminAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM devices WHERE machine_id=$1`,
      [req.params.id]
    )

    if (!rows.length)
      return res.status(404).json({ message: 'Device not found' })

    res.json(rows[0])

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router