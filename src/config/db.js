import pkg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Pool } = pkg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export const query = async (text, params) => {
  const start = Date.now()
  const result = await pool.query(text, params)
  const duration = Date.now() - start

  if (duration > 200) {
    console.log('⚠ Slow Query:', {
      duration: `${duration} ms`,
      query: text
    })
  }

  return result
}