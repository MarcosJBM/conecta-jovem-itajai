import express from 'express'
import { checkDatabaseConnection } from '@conecta/database'

import { registerCompanyController } from './http/controllers/companies/register-company.js'
import { makeRegisterCompanyUseCase } from './use-cases/factories/make-register-company.js'
import { errorHandler } from './http/errors/error-handler.js'
import type { RegisterCompanyUseCase } from './use-cases/register-company.js'

export function createApp(
  makeRegisterCompany: () => RegisterCompanyUseCase = makeRegisterCompanyUseCase,
) {
  const app = express()

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

  app.post('/companies', registerCompanyController(makeRegisterCompany))
  app.use(errorHandler)
  return app
}

export const app = createApp()
