import pino from 'pino'

export const logger = {
  info: console.log,
  error: console.error
}

export const pinoLogger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
  }
})