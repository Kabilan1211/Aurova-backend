import express from 'express'
import multer from 'multer'
import { supabase } from '../config/supabase.js'
import { query } from '../config/db.js'
import { adminAuth } from '../middleware/adminAuth.js'
import { deviceAuth } from '../middleware/deviceAuth.js'
import { sha256Buffer } from '../utils/hash.js'
import { getIO } from '../socket/socket.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// Upload firmware (Admin)
router.post('/upload', adminAuth, upload.single('firmware'), async (req, res) => {
  try {
    const { targetVersion, machineId, machineName, groupName } = req.body

    const fileName = `${Date.now()}_${req.file.originalname}`
    const hash = sha256Buffer(req.file.buffer)

    await supabase.storage
      .from(process.env.FIRMWARE_BUCKET)
      .upload(fileName, req.file.buffer)

    await query(`
      UPDATE ota_targets SET active=false
      WHERE machine_id=$1 OR machine_name=$2 OR group_name=$3
    `, [machineId, machineName, groupName])

    const { rows } = await query(`
      INSERT INTO ota_targets(machine_id, machine_name, group_name, target_version, firmware_file, sha256)
      VALUES($1,$2,$3,$4,$5,$6)
      RETURNING *
    `, [machineId, machineName, groupName, targetVersion, fileName, hash])

    getIO().emit('otaUpdated', rows[0])

    res.json({ success: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Download firmware (Device)
router.get('/download/:file', deviceAuth, async(req, res) => {
  try{
    
    const { file } = req.params
    const fileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.FIRMWARE_BUCKET}/${file}`
    res.redirect(fileUrl)

  } catch(err){
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Device OTA check
router.post('/check', deviceAuth, async (req, res) => {
  try {
    const device = req.device

    const { rows } = await query(`
      SELECT * FROM ota_targets
      WHERE active=true AND (
        machine_id=$1 OR
        machine_name=$2 OR
        group_name=$3
      )
      ORDER BY created_at DESC
      LIMIT 1
    `, [device.machine_id, device.machine_name, device.group_name])

    if (!rows.length)
      return res.json({ update: false })

    if (rows[0].target_version === device.firmware_version)
      return res.json({ update: false })

    res.json({
      update: true,
      version: rows[0].target_version,
      file: rows[0].firmware_file,
      sha256: rows[0].sha256
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router