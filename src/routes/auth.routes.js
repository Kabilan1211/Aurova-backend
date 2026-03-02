import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../config/db.js'

const router = express.Router()

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' })

    const { rows } = await query(
      `SELECT * FROM admins WHERE email=$1`,
      [email]
    )
    console.log(rows)

    if (!rows.length){
      console.log("Row not found")
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, rows[0].password)
    if (!valid)  {
      console.log("Password mismatch")
      return res.status(401).json({ message: 'Invalid credentials' })
    } 


    const token = jwt.sign(
      { id: rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    res.json({ token })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router