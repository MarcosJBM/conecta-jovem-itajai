import { config } from 'dotenv'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = fileURLToPath(new URL('.', import.meta.url))
const rootEnvironmentPath = resolve(currentDirectory, '../../../.env')

config({ path: rootEnvironmentPath })

const parsedPort = Number(process.env.API_PORT ?? 3333)

if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
  throw new Error('API_PORT deve ser um número inteiro positivo.')
}

export const env = {
  port: parsedPort,
}
