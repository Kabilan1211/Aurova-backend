import { Server } from 'socket.io'

let io = null

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
    transports: ['websocket']
  })

  return io
}

export const getIO = () => io