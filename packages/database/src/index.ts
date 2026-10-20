import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client.js'

let prismaClient: PrismaClient | undefined

export function getPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (prismaClient) {
    return prismaClient
  }

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL não foi definida. Copie .env.example para .env antes de iniciar a API.',
    )
  }

  const adapter = new PrismaPg(
    { connectionString },
    { schema: new URL(connectionString).searchParams.get('schema') ?? 'public' },
  )
  prismaClient = new PrismaClient({ adapter })

  return prismaClient
}

export async function checkDatabaseConnection() {
  await getPrismaClient().$queryRaw`SELECT 1`
}

export async function closeDatabaseConnection() {
  await prismaClient?.$disconnect()
  prismaClient = undefined
}
