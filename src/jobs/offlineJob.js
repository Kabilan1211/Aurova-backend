import { pool } from '../config/db.js'
import { getIO } from '../socket/socket.js'

export const startOfflineJob = () => {
  setInterval(async () => {
    const { rows } = await pool.query(`
      UPDATE devices
      SET status='offline'
      WHERE last_seen < NOW() - INTERVAL '20 seconds'
      AND status='online'
      RETURNING *
    `)

    if (rows.length) {
      const io = getIO()
      rows.forEach(device => {
        io.emit('deviceUpdated', device)
      })
    }
  }, 30000)
}