import { pool } from '../config/db.js'

export const deviceAuth = async (req, res, next) => {
  const token = req.headers['x-device-token']
  if (!token) return res.status(401).json({ message: 'Device token required' })

  const { rows } = await pool.query(
    `SELECT * FROM devices WHERE device_token=$1`,
    [token]
  )

  if (!rows.length)
    return res.status(401).json({ message: 'Invalid device token' })

  req.device = rows[0]
  next()
}