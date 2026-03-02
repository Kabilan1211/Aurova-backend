export const startMonitorJob = () => {
  setInterval(() => {
    const memory = process.memoryUsage()

    console.log('📊 Memory Usage:')
    console.log({
      rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`
    })
  }, 60000) // every 60 sec
}