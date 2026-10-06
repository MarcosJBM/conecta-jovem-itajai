import { env } from './env.js'
import { closeDatabaseConnection } from '@conecta/database'
import { app } from './app.js'

const server = app.listen(env.port, () => {
  console.log(`API executando em http://localhost:${env.port}`)
})

async function shutdown(signal: string) {
  console.log(`Recebido ${signal}. Encerrando a API...`)

  server.close(async () => {
    await closeDatabaseConnection()
    process.exit(0)
  })
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
