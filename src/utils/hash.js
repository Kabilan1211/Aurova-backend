import crypto from 'crypto'

export const sha256Buffer = (buffer) =>
  crypto.createHash('sha256').update(buffer).digest('hex')