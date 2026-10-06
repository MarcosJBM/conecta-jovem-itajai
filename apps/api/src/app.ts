import express from 'express'
import { checkDatabaseConnection } from '@conecta/database'

export const app = express()

app.disable('x-powered-by')
app.use(express.json())

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' })
})

app.get('/health/database', async (_request, response) => {
  try {
    await checkDatabaseConnection()
    response.status(200).json({ status: 'ok', database: 'connected' })
  } catch (error) {
    console.error('Falha ao conectar ao PostgreSQL:', error)
    response.status(503).json({ status: 'error', database: 'unavailable' })
  }
})
